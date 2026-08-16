// Camada de dados local (localStorage). Sem backend — tudo offline no aparelho.

const DB_KEYS = {
  transactions: 'finapp_transactions',
  budgets: 'finapp_budgets',
  investments: 'finapp_investments',
  profile: 'finapp_profile',
  categories: 'finapp_categories',
  incomeCategories: 'finapp_income_categories',
  bills: 'finapp_bills',
  accounts: 'finapp_accounts',
  cards: 'finapp_cards',
  currencies: 'finapp_currencies',
};

// Percentuais sugeridos por categoria, baseados em benchmarks de planejamento financeiro
// (perfil moderado): Moradia 25-30%, Alimentação 12-15%, Transporte 10-15%, Saúde 5-7%,
// Lazer 10-15%, Assinaturas até 3%. Editáveis pelo usuário — são apenas um ponto de partida.
const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍔', recommendedPct: 14 },
  { name: 'Transporte', icon: '🚕', recommendedPct: 12 },
  { name: 'Moradia', icon: '🏠', recommendedPct: 28 },
  { name: 'Saúde', icon: '⚕️', recommendedPct: 6 },
  { name: 'Lazer', icon: '🎉', recommendedPct: 12 },
  { name: 'Assinaturas', icon: '📱', recommendedPct: 3 },
  { name: 'Educação', icon: '📚', recommendedPct: 5 },
  { name: 'Outros', icon: '📦', recommendedPct: 5 },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salário', icon: '💼' },
  { name: 'Adiantamento', icon: '💵' },
  { name: 'Aluguel recebido', icon: '🏘️' },
  { name: 'Freelance/Extra', icon: '🧾' },
  { name: 'Juros/Rendimento de investimento', icon: '📈' },
  { name: 'Reembolso', icon: '↩️' },
  { name: 'Outras receitas', icon: '➕' },
];

const ASSET_CLASSES = ['Renda Fixa', 'Ações', 'FIIs', 'Cripto', 'Outros'];
const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Débito', 'Cartão de Crédito', 'Cartão Alimentação', 'Cartão Refeição'];
const ACCOUNT_TYPES = [
  { value: 'banco', label: 'Conta bancária', icon: '🏦' },
  { value: 'carteira', label: 'Carteira / dinheiro físico', icon: '👛' },
];
const CARD_KINDS = [
  { value: 'credito', label: 'Cartão de Crédito', icon: '💳', payment: 'Cartão de Crédito' },
  { value: 'alimentacao', label: 'Vale Alimentação', icon: '🛒', payment: 'Cartão Alimentação' },
  { value: 'refeicao', label: 'Vale Refeição', icon: '🍽️', payment: 'Cartão Refeição' },
];
const LIQUIDITY_OPTIONS = ['Diária', 'No vencimento', 'Outro'];

// Moedas: sem conversão entre elas — cada uma soma separada, sem virar um número só.
// R$ é o fallback implícito de qualquer registro antigo sem campo "currency".
const DEFAULT_CURRENCIES = [
  { code: 'BRL', symbol: 'R$', decimals: 2 },
  { code: 'USD', symbol: 'US$', decimals: 2 },
  { code: 'BTC', symbol: '₿', decimals: 8 },
];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('Erro lendo', key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const Storage = {
  // Transações (gastos e receitas)
  getTransactions() {
    return readJSON(DB_KEYS.transactions, []);
  },
  addTransaction(tx) {
    const list = Storage.getTransactions();
    const record = { id: uid(), createdAt: new Date().toISOString(), ...tx };
    list.push(record);
    writeJSON(DB_KEYS.transactions, list);
    return record;
  },
  deleteTransaction(id) {
    const list = Storage.getTransactions().filter((t) => t.id !== id);
    writeJSON(DB_KEYS.transactions, list);
  },
  updateTransaction(id, patch) {
    const list = Storage.getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      writeJSON(DB_KEYS.transactions, list);
    }
  },
  getTransaction(id) {
    return Storage.getTransactions().find((t) => t.id === id) || null;
  },

  // Orçamentos por categoria e mês (ex: '2026-08')
  getBudgets() {
    return readJSON(DB_KEYS.budgets, []);
  },
  setBudget(category, month, limitAmount) {
    const list = Storage.getBudgets();
    const idx = list.findIndex((b) => b.category === category && b.month === month);
    if (idx >= 0) {
      list[idx].limitAmount = limitAmount;
    } else {
      list.push({ id: uid(), category, month, limitAmount });
    }
    writeJSON(DB_KEYS.budgets, list);
  },
  getBudgetsForMonth(month) {
    return Storage.getBudgets().filter((b) => b.month === month);
  },

  // Investimentos
  getInvestments() {
    return readJSON(DB_KEYS.investments, []);
  },
  addInvestment(inv) {
    const list = Storage.getInvestments();
    const record = { id: uid(), createdAt: new Date().toISOString(), ...inv };
    list.push(record);
    writeJSON(DB_KEYS.investments, list);
    return record;
  },
  deleteInvestment(id) {
    const list = Storage.getInvestments().filter((i) => i.id !== id);
    writeJSON(DB_KEYS.investments, list);
  },
  updateInvestment(id, patch) {
    const list = Storage.getInvestments();
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      writeJSON(DB_KEYS.investments, list);
    }
  },

  // Perfil do usuário
  getProfile() {
    return readJSON(DB_KEYS.profile, {
      incomeGross: 0,
      incomeNet: 0,
      dependents: 0,
      riskProfile: 'Moderado',
      emergencyFundBalance: 0,
    });
  },
  saveProfile(profile) {
    writeJSON(DB_KEYS.profile, profile);
  },

  // Categorias de gasto
  getCategories() {
    return readJSON(DB_KEYS.categories, DEFAULT_CATEGORIES);
  },
  addCategory(name, icon) {
    const list = Storage.getCategories();
    if (!list.find((c) => c.name === name)) {
      list.push({ name, icon: icon || '🏷️', recommendedPct: 5 });
      writeJSON(DB_KEYS.categories, list);
    }
  },
  setCategoryRecommendedPct(name, pct) {
    const list = Storage.getCategories();
    const cat = list.find((c) => c.name === name);
    if (cat) {
      cat.recommendedPct = pct;
      writeJSON(DB_KEYS.categories, list);
    }
  },
  // Edita nome/ícone/percentual; se o nome mudar, propaga para transações, orçamentos e contas já lançados
  updateCategoryFull(oldName, patch) {
    const list = Storage.getCategories();
    const cat = list.find((c) => c.name === oldName);
    if (!cat) return;
    const newName = patch.name && patch.name.trim() ? patch.name.trim() : oldName;
    cat.name = newName;
    if (patch.icon) cat.icon = patch.icon;
    if (patch.recommendedPct != null) cat.recommendedPct = patch.recommendedPct;
    writeJSON(DB_KEYS.categories, list);
    if (newName !== oldName) {
      writeJSON(DB_KEYS.transactions, Storage.getTransactions().map((t) => (t.category === oldName ? { ...t, category: newName } : t)));
      writeJSON(DB_KEYS.budgets, Storage.getBudgets().map((b) => (b.category === oldName ? { ...b, category: newName } : b)));
      writeJSON(DB_KEYS.bills, Storage.getBills().map((b) => (b.category === oldName ? { ...b, category: newName } : b)));
    }
  },
  deleteCategory(name) {
    writeJSON(DB_KEYS.categories, Storage.getCategories().filter((c) => c.name !== name));
  },

  // Categorias de receita
  getIncomeCategories() {
    return readJSON(DB_KEYS.incomeCategories, DEFAULT_INCOME_CATEGORIES);
  },
  addIncomeCategory(name, icon) {
    const list = Storage.getIncomeCategories();
    if (!list.find((c) => c.name === name)) {
      list.push({ name, icon: icon || '➕' });
      writeJSON(DB_KEYS.incomeCategories, list);
    }
  },
  updateIncomeCategoryFull(oldName, patch) {
    const list = Storage.getIncomeCategories();
    const cat = list.find((c) => c.name === oldName);
    if (!cat) return;
    const newName = patch.name && patch.name.trim() ? patch.name.trim() : oldName;
    cat.name = newName;
    if (patch.icon) cat.icon = patch.icon;
    writeJSON(DB_KEYS.incomeCategories, list);
    if (newName !== oldName) {
      writeJSON(
        DB_KEYS.transactions,
        Storage.getTransactions().map((t) => (t.type === 'income' && t.category === oldName ? { ...t, category: newName } : t))
      );
    }
  },
  deleteIncomeCategory(name) {
    writeJSON(DB_KEYS.incomeCategories, Storage.getIncomeCategories().filter((c) => c.name !== name));
  },

  // Moedas (sem conversão — cada uma é somada separadamente)
  getCurrencies() {
    return readJSON(DB_KEYS.currencies, DEFAULT_CURRENCIES);
  },
  getCurrency(code) {
    return Storage.getCurrencies().find((c) => c.code === (code || 'BRL')) || DEFAULT_CURRENCIES[0];
  },
  addCurrency(code, symbol, decimals) {
    const list = Storage.getCurrencies();
    const upperCode = code.trim().toUpperCase();
    if (!list.find((c) => c.code === upperCode)) {
      list.push({ code: upperCode, symbol: symbol || upperCode, decimals: decimals != null ? decimals : 2 });
      writeJSON(DB_KEYS.currencies, list);
    }
    return upperCode;
  },
  updateCurrencyFull(oldCode, patch) {
    const list = Storage.getCurrencies();
    const cur = list.find((c) => c.code === oldCode);
    if (!cur) return;
    const newCode = patch.code && patch.code.trim() ? patch.code.trim().toUpperCase() : oldCode;
    cur.code = newCode;
    if (patch.symbol) cur.symbol = patch.symbol;
    if (patch.decimals != null) cur.decimals = patch.decimals;
    writeJSON(DB_KEYS.currencies, list);
    if (newCode !== oldCode) {
      writeJSON(DB_KEYS.transactions, Storage.getTransactions().map((t) => ((t.currency || 'BRL') === oldCode ? { ...t, currency: newCode } : t)));
      writeJSON(DB_KEYS.investments, Storage.getInvestments().map((i) => ((i.currency || 'BRL') === oldCode ? { ...i, currency: newCode } : i)));
      writeJSON(DB_KEYS.accounts, Storage.getAccounts().map((a) => ((a.currency || 'BRL') === oldCode ? { ...a, currency: newCode } : a)));
    }
  },
  deleteCurrency(code) {
    if (code === 'BRL') return; // R$ é o fallback padrão, não pode ser removido
    writeJSON(DB_KEYS.currencies, Storage.getCurrencies().filter((c) => c.code !== code));
  },

  // Contas a pagar (com dia de vencimento, recorrentes mensalmente)
  getBills() {
    return readJSON(DB_KEYS.bills, []);
  },
  addBill(bill) {
    const list = Storage.getBills();
    const record = { id: uid(), paidMonths: [], active: true, ...bill };
    list.push(record);
    writeJSON(DB_KEYS.bills, list);
    return record;
  },
  updateBill(id, patch) {
    const list = Storage.getBills();
    const idx = list.findIndex((b) => b.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      writeJSON(DB_KEYS.bills, list);
    }
  },
  deleteBill(id) {
    writeJSON(DB_KEYS.bills, Storage.getBills().filter((b) => b.id !== id));
  },
  markBillPaid(id, month) {
    const list = Storage.getBills();
    const bill = list.find((b) => b.id === id);
    if (bill && !bill.paidMonths.includes(month)) {
      bill.paidMonths.push(month);
      writeJSON(DB_KEYS.bills, list);
    }
  },

  // Contas/carteiras (bancos e dinheiro físico) com saldo manual
  getAccounts() {
    return readJSON(DB_KEYS.accounts, []);
  },
  addAccount(account) {
    const list = Storage.getAccounts();
    const record = { id: uid(), balance: 0, type: 'banco', ...account };
    list.push(record);
    writeJSON(DB_KEYS.accounts, list);
    return record;
  },
  updateAccount(id, patch) {
    const list = Storage.getAccounts();
    const idx = list.findIndex((a) => a.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      writeJSON(DB_KEYS.accounts, list);
    }
  },
  deleteAccount(id) {
    writeJSON(DB_KEYS.accounts, Storage.getAccounts().filter((a) => a.id !== id));
  },
  adjustAccountBalance(id, delta) {
    const list = Storage.getAccounts();
    const acc = list.find((a) => a.id === id);
    if (acc) {
      acc.balance = Number(acc.balance) + delta;
      writeJSON(DB_KEYS.accounts, list);
    }
  },

  // Cartões: crédito (vencimento + limite) e benefício (vale alimentação/refeição, saldo)
  getCards() {
    return readJSON(DB_KEYS.cards, []);
  },
  addCard(card) {
    const list = Storage.getCards();
    const record = { id: uid(), balance: 0, ...card };
    list.push(record);
    writeJSON(DB_KEYS.cards, list);
    return record;
  },
  updateCard(id, patch) {
    const list = Storage.getCards();
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      writeJSON(DB_KEYS.cards, list);
    }
  },
  deleteCard(id) {
    writeJSON(DB_KEYS.cards, Storage.getCards().filter((c) => c.id !== id));
  },
  adjustCardBalance(id, delta) {
    const list = Storage.getCards();
    const card = list.find((c) => c.id === id);
    if (card) {
      card.balance = Number(card.balance) + delta;
      writeJSON(DB_KEYS.cards, list);
    }
  },
};
