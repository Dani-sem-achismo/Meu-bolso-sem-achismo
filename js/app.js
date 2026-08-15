// UI: navegação entre telas, renderização e handlers de formulário.

const state = {
  screen: 'dashboard',
  txType: 'expense',
  txCategory: null,
  invMovement: 'aporte',
};

const APPBAR_TITLES = {
  dashboard: 'Dashboard',
  budgets: 'Orçamento',
  investments: 'Investimentos',
  profile: 'Perfil',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function catIcon(name) {
  const c = Storage.getCategories().find((c) => c.name === name);
  return c ? c.icon : '🏷️';
}

// -------- Navegação --------
function showScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.screen === name);
  });
  document.getElementById('appbar-title').textContent = APPBAR_TITLES[name];
  renderAll();
}

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});

// -------- Modais --------
function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

document.getElementById('fab-add').addEventListener('click', () => {
  if (state.screen === 'investments') {
    openInvModal();
  } else {
    openTxModal();
  }
});

// -------- Modal: Transação --------
function openTxModal() {
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value = '';
  document.getElementById('tx-date').value = todayISO();
  setTxType('expense');
  renderTxCategories();
  openModal('modal-tx');
}

function setTxType(type) {
  state.txType = type;
  document.querySelectorAll('#modal-tx .type-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.type === type);
  });
}
document.querySelectorAll('#modal-tx .type-btn').forEach((btn) => {
  btn.addEventListener('click', () => setTxType(btn.dataset.type));
});

function renderTxCategories() {
  const wrap = document.getElementById('tx-categories');
  const categories = Storage.getCategories();
  if (!state.txCategory) state.txCategory = categories[0].name;
  wrap.innerHTML = categories
    .map(
      (c) => `<div class="chip ${c.name === state.txCategory ? 'selected' : ''}" data-cat="${c.name}">${c.icon} ${c.name}</div>`
    )
    .join('');
  wrap.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.txCategory = chip.dataset.cat;
      renderTxCategories();
    });
  });
}

document.getElementById('btn-save-tx').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('tx-amount').value);
  if (!amount || amount <= 0) {
    alert('Informe um valor válido.');
    return;
  }
  const date = document.getElementById('tx-date').value || todayISO();
  const description = document.getElementById('tx-desc').value.trim();
  Storage.addTransaction({
    type: state.txType,
    amount,
    category: state.txType === 'income' ? 'Receita' : state.txCategory,
    date,
    description,
  });
  closeModal('modal-tx');
  renderAll();
});

// -------- Modal: Investimento --------
function openInvModal() {
  document.getElementById('inv-amount').value = '';
  document.getElementById('inv-name').value = '';
  document.getElementById('inv-date').value = todayISO();
  const sel = document.getElementById('inv-class');
  sel.innerHTML = ASSET_CLASSES.map((c) => `<option value="${c}">${c}</option>`).join('');
  setInvMovement('aporte');
  openModal('modal-inv');
}

function setInvMovement(mov) {
  state.invMovement = mov;
  document.querySelectorAll('#modal-inv .type-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.movement === mov);
  });
}
document.querySelectorAll('#modal-inv .type-btn').forEach((btn) => {
  btn.addEventListener('click', () => setInvMovement(btn.dataset.movement));
});

document.getElementById('btn-save-inv').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('inv-amount').value);
  if (!amount || amount <= 0) {
    alert('Informe um valor válido.');
    return;
  }
  Storage.addInvestment({
    amount,
    assetClass: document.getElementById('inv-class').value,
    name: document.getElementById('inv-name').value.trim(),
    date: document.getElementById('inv-date').value || todayISO(),
    movement: state.invMovement,
  });
  closeModal('modal-inv');
  renderAll();
});

// -------- Render: Dashboard --------
function renderDashboard() {
  const month = Calc.currentMonthKey();
  const transactions = Storage.getTransactions();
  const budgets = Storage.getBudgetsForMonth(month);
  const profile = Storage.getProfile();

  const totalSpent = Calc.totalByType(transactions, month, 'expense');
  document.getElementById('dash-total-spent').textContent = Calc.fmtBRL(totalSpent);

  const cmp = Calc.comparisonPrevMonth(transactions, month);
  const cmpEl = document.getElementById('dash-comparison');
  if (cmp.pct === null) {
    cmpEl.textContent = 'Sem dados do mês passado para comparar.';
  } else {
    const arrow = cmp.diff >= 0 ? '↑' : '↓';
    cmpEl.textContent = `${arrow} ${Math.abs(cmp.pct).toFixed(0)}% vs. mês passado (${Calc.fmtBRL(cmp.passado)})`;
  }

  // Alertas
  const budgetStatuses = Calc.budgetStatus(budgets, transactions, month);
  const alerts = [...Calc.budgetAlerts(budgetStatuses)];
  const projection = Calc.projectionEndOfMonth(transactions, month);
  if (projection > totalSpent * 1.001 && budgets.length > 0) {
    const totalBudget = budgets.reduce((s, b) => s + b.limitAmount, 0);
    if (totalBudget > 0 && projection > totalBudget) {
      alerts.push({
        severity: 'info',
        message: `No ritmo atual, projeção de gasto no mês é ${Calc.fmtBRL(projection)}, acima do orçamento total de ${Calc.fmtBRL(totalBudget)}.`,
      });
    }
  }
  const alertsEl = document.getElementById('dash-alerts');
  alertsEl.innerHTML = alerts.length
    ? alerts.map((a) => `<div class="alert ${a.severity}">${a.message}</div>`).join('')
    : '';

  // Orçamento por categoria
  const budgetsEl = document.getElementById('dash-budgets');
  if (budgetStatuses.length === 0) {
    budgetsEl.innerHTML = `<div class="empty-state">Nenhum orçamento definido. Configure na aba Orçamento.</div>`;
  } else {
    budgetsEl.innerHTML = budgetStatuses
      .map((b) => {
        const statusClass =
          b.status === 'OK' ? 'status-ok' : b.status === 'AVISO' ? 'status-aviso' : 'status-ultrapassado';
        return `
        <div class="cat-row" style="display:block;">
          <div class="cat-name">${catIcon(b.category)} ${b.category}</div>
          <div class="cat-values">${Calc.fmtBRL(b.spent)} / ${Calc.fmtBRL(b.limitAmount)} (${b.percent.toFixed(0)}%)</div>
          <div class="progress-bar"><div class="progress-fill ${statusClass}" style="width:${Math.min(b.percent, 100)}%"></div></div>
        </div>`;
      })
      .join('');
  }

  // Últimas transações
  const txEl = document.getElementById('dash-transactions');
  const recent = [...Calc.transactionsForMonth(transactions, month)]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 8);
  txEl.innerHTML = recent.length
    ? recent
        .map(
          (t) => `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">${t.type === 'income' ? '💰' : catIcon(t.category)}</div>
          <div>
            <div class="tx-desc">${t.description || t.category}</div>
            <div class="tx-date">${new Date(t.date).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${Calc.fmtBRL(t.amount)}</div>
      </div>`
        )
        .join('')
    : `<div class="empty-state">Nenhuma transação este mês. Toque em "+" para começar.</div>`;
}

// -------- Render: Orçamentos --------
function renderBudgets() {
  const month = Calc.currentMonthKey();
  const categories = Storage.getCategories();
  const budgets = Storage.getBudgetsForMonth(month);
  const wrap = document.getElementById('budget-inputs');
  wrap.innerHTML = categories
    .map((c) => {
      const existing = budgets.find((b) => b.category === c.name);
      return `
      <div class="list-row-input">
        <div class="cat-name">${c.icon} ${c.name}</div>
        <input type="number" inputmode="decimal" data-budget-cat="${c.name}" placeholder="0,00" value="${existing ? existing.limitAmount : ''}">
      </div>`;
    })
    .join('');
  wrap.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', () => {
      const val = parseFloat(input.value) || 0;
      Storage.setBudget(input.dataset.budgetCat, month, val);
      renderDashboard();
    });
  });

  const profile = Storage.getProfile();
  const sugEl = document.getElementById('budget-suggestion');
  if (profile.income > 0) {
    const s = Calc.suggestion503020(profile.income);
    sugEl.innerHTML = `
      Necessidades (50%): <strong>${Calc.fmtBRL(s.necessidades)}</strong><br>
      Desejos/Lazer (30%): <strong>${Calc.fmtBRL(s.desejos)}</strong><br>
      Poupança/Investimento (20%): <strong>${Calc.fmtBRL(s.poupancaInvestimento)}</strong>`;
  } else {
    sugEl.textContent = 'Cadastre sua renda em Perfil para ver a sugestão.';
  }
}

// -------- Render: Investimentos --------
function renderInvestments() {
  const investments = Storage.getInvestments();
  const profile = Storage.getProfile();
  const { byClass, total } = Calc.investmentSummary(investments);

  document.getElementById('inv-total').textContent = Calc.fmtBRL(total);

  const alerts = Calc.investmentAlerts(investments, profile.riskProfile);
  document.getElementById('inv-alerts').innerHTML = alerts
    .map((a) => `<div class="alert ${a.severity}">${a.message}</div>`)
    .join('');

  const allocEl = document.getElementById('inv-allocation');
  const entries = Object.entries(byClass).filter(([, v]) => v > 0);
  allocEl.innerHTML = entries.length
    ? entries
        .map(([cls, val]) => {
          const pct = total > 0 ? (val / total) * 100 : 0;
          return `
        <div class="cat-row" style="display:block;">
          <div class="cat-name">${cls}</div>
          <div class="cat-values">${Calc.fmtBRL(val)} (${pct.toFixed(0)}%)</div>
          <div class="progress-bar"><div class="progress-fill status-ok" style="width:${Math.min(pct, 100)}%"></div></div>
        </div>`;
        })
        .join('')
    : `<div class="empty-state">Nenhum investimento registrado ainda.</div>`;

  const listEl = document.getElementById('inv-list');
  const sorted = [...investments].sort((a, b) => new Date(b.date) - new Date(a.date));
  listEl.innerHTML = sorted.length
    ? sorted
        .slice(0, 10)
        .map(
          (i) => `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">📈</div>
          <div>
            <div class="tx-desc">${i.name || i.assetClass}</div>
            <div class="tx-date">${i.assetClass} · ${new Date(i.date).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div class="tx-amount ${i.movement === 'resgate' ? 'expense' : 'income'}">${i.movement === 'resgate' ? '-' : '+'} ${Calc.fmtBRL(i.amount)}</div>
      </div>`
        )
        .join('')
    : `<div class="empty-state">Toque em "+" para registrar seu primeiro aporte.</div>`;
}

// -------- Render: Perfil --------
function loadProfileForm() {
  const p = Storage.getProfile();
  document.getElementById('profile-income').value = p.income || '';
  document.getElementById('profile-dependents').value = p.dependents || 0;
  document.getElementById('profile-risk').value = p.riskProfile || 'Moderado';
  document.getElementById('profile-emergency').value = p.emergencyFundBalance || '';
  document.getElementById('profile-debt').checked = !!p.hasDebt;
}

document.getElementById('btn-save-profile').addEventListener('click', () => {
  const profile = {
    income: parseFloat(document.getElementById('profile-income').value) || 0,
    dependents: parseInt(document.getElementById('profile-dependents').value) || 0,
    riskProfile: document.getElementById('profile-risk').value,
    emergencyFundBalance: parseFloat(document.getElementById('profile-emergency').value) || 0,
    hasDebt: document.getElementById('profile-debt').checked,
  };
  Storage.saveProfile(profile);
  renderProfileRecommendation();
  renderAll();
});

function renderProfileRecommendation() {
  const profile = Storage.getProfile();
  const transactions = Storage.getTransactions();
  const month = Calc.currentMonthKey();
  const monthlyExpenses = Calc.totalByType(transactions, month, 'expense') || profile.income * 0.7;
  const target = Calc.emergencyFundTarget(monthlyExpenses, profile.dependents);
  const rec = Calc.progressRecommendation({
    emergencyBalance: profile.emergencyFundBalance,
    emergencyTarget: target,
    hasDebt: profile.hasDebt,
    debtHigh: profile.hasDebt,
  });
  document.getElementById('profile-recommendation').innerHTML = `
    <strong>Meta de reserva de emergência:</strong> ${Calc.fmtBRL(target)}<br><br>
    ${rec.message}`;
}

// -------- Render geral --------
function renderAll() {
  renderDashboard();
  if (state.screen === 'budgets') renderBudgets();
  if (state.screen === 'investments') renderInvestments();
  if (state.screen === 'profile') {
    loadProfileForm();
    renderProfileRecommendation();
  }
}

// -------- Init --------
renderAll();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW falhou', e));
  });
}
