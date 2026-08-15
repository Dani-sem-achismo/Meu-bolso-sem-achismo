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
};

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍔' },
  { name: 'Transporte', icon: '🚕' },
  { name: 'Moradia', icon: '🏠' },
  { name: 'Saúde', icon: '⚕️' },
  { name: 'Lazer', icon: '🎉' },
  { name: 'Assinaturas', icon: '📱' },
  { name: 'Educação', icon: '📚' },
  { name: 'Outros', icon: '📦' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salário', icon: '💼' },
  { name: 'Freelance/Extra', icon: '🧾' },
  { name: 'Rendimento de investimento', icon: '📈' },
  { name: 'Reembolso', icon: '↩️' },
  { name: 'Outras receitas', icon: '➕' },
];

const ASSET_CLASSES = ['Renda Fixa', 'Ações', 'FIIs', 'Cripto', 'Outros'];
const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Débito', 'Cartão de Crédito', 'Cartão Alimentação'];
const ACCOUNT_TYPES = [
  { value: 'banco', label: 'Conta bancária', icon: '🏦' },
  { value: 'carteira', label: 'Carteira / dinheiro físico', icon: '👛' },
  { value: 'alimentacao', label: 'Vale Alimentação/Refeição', icon: '🍽️' },
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
      list.push({ name, icon: icon || '🏷️' });
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
};
