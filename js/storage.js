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
  { name: 'Freelance/Extra', icon: '🧾' },
  { name: 'Rendimento de investimento', icon: '📈' },
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
