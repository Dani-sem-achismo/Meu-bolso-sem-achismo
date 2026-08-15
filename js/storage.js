// Camada de dados local (localStorage). Sem backend — tudo offline no aparelho.

const DB_KEYS = {
  transactions: 'finapp_transactions',
  budgets: 'finapp_budgets',
  investments: 'finapp_investments',
  profile: 'finapp_profile',
  categories: 'finapp_categories',
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

const ASSET_CLASSES = ['Renda Fixa', 'Ações', 'FIIs', 'Cripto', 'Outros'];

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
      income: 0,
      dependents: 0,
      riskProfile: 'Moderado',
      emergencyFundBalance: 0,
    });
  },
  saveProfile(profile) {
    writeJSON(DB_KEYS.profile, profile);
  },

  // Categorias
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
};
