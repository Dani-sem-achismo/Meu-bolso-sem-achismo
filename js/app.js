// UI: navegação entre telas, renderização e handlers de formulário.

const state = {
  screen: 'dashboard',
  txType: 'expense',
  txCategory: null,
  txPayment: 'Dinheiro',
  invMovement: 'aporte',
  simCategory: null,
  simPayment: 'Dinheiro',
};

const APPBAR_TITLES = {
  dashboard: 'Dashboard',
  bills: 'Contas a pagar',
  budgets: 'Orçamento',
  investments: 'Investimentos',
  more: 'Mais',
};

function todayISO() {
  return Calc.toLocalISODate(new Date());
}

function catIcon(name) {
  const c = [...Storage.getCategories(), ...Storage.getIncomeCategories()].find((c) => c.name === name);
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
  document.getElementById('fab-add').style.display = name === 'more' ? 'none' : 'flex';
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
  if (state.screen === 'investments') openInvModal();
  else if (state.screen === 'bills') openBillModal();
  else openTxModal();
});

// ==================== TRANSAÇÃO (gasto/receita) ====================

function renderAccountOptions(selectEl, selectedId) {
  const accounts = Storage.getAccounts();
  selectEl.innerHTML =
    `<option value="">— nenhuma —</option>` +
    accounts.map((a) => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.type === 'carteira' ? '👛' : '🏦'} ${a.name} (${Calc.fmtBRL(a.balance)})</option>`).join('');
}

function openTxModal(prefill) {
  document.getElementById('tx-amount').value = prefill ? prefill.amount : '';
  document.getElementById('tx-desc').value = '';
  document.getElementById('tx-date').value = todayISO();
  document.getElementById('tx-card-name').value = '';
  document.getElementById('tx-installments').value = prefill ? prefill.installments || 1 : 1;
  setTxType('expense');
  if (prefill && prefill.category) state.txCategory = prefill.category;
  renderTxCategories();
  setTxPayment(prefill ? prefill.payment || 'Dinheiro' : 'Dinheiro');
  renderAccountOptions(document.getElementById('tx-account'));
  openModal('modal-tx');
}

function setTxType(type) {
  state.txType = type;
  document.querySelectorAll('#modal-tx .type-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.type === type);
  });
  document.getElementById('tx-payment-wrap').style.display = type === 'expense' ? 'block' : 'none';
  state.txCategory = null;
  renderTxCategories();
  updateTxAccountVisibility();
}
document.querySelectorAll('#modal-tx .type-btn').forEach((btn) => {
  btn.addEventListener('click', () => setTxType(btn.dataset.type));
});

function renderTxCategories() {
  const wrap = document.getElementById('tx-categories');
  const categories = state.txType === 'income' ? Storage.getIncomeCategories() : Storage.getCategories();
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

function setTxPayment(method) {
  state.txPayment = method;
  const wrap = document.getElementById('tx-payment-methods');
  wrap.innerHTML = PAYMENT_METHODS.map(
    (m) => `<div class="chip ${m === method ? 'selected' : ''}" data-pm="${m}">${m}</div>`
  ).join('');
  wrap.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => setTxPayment(chip.dataset.pm));
  });
  document.getElementById('tx-card-fields').style.display = method === 'Cartão de Crédito' ? 'block' : 'none';
  updateTxAccountVisibility();
}

function updateTxAccountVisibility() {
  const showAccount = state.txType === 'income' || state.txPayment !== 'Cartão de Crédito';
  document.getElementById('tx-account-wrap').style.display = showAccount ? 'block' : 'none';
}

document.getElementById('btn-save-tx').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('tx-amount').value);
  if (!amount || amount <= 0) {
    alert('Informe um valor válido.');
    return;
  }
  const date = document.getElementById('tx-date').value || todayISO();
  const description = document.getElementById('tx-desc').value.trim();
  const category = state.txCategory;
  const accountId = document.getElementById('tx-account').value || null;
  const isCard = state.txType === 'expense' && state.txPayment === 'Cartão de Crédito';
  const installments = isCard ? Math.max(1, parseInt(document.getElementById('tx-installments').value) || 1) : 1;
  const cardName = isCard ? document.getElementById('tx-card-name').value.trim() : null;

  if (isCard && installments > 1) {
    const parts = Calc.splitInstallments(amount, installments);
    parts.forEach((partAmount, idx) => {
      Storage.addTransaction({
        type: 'expense',
        amount: partAmount,
        category,
        date: Calc.addMonthsToDate(date, idx),
        description,
        paymentMethod: state.txPayment,
        cardName,
        installmentLabel: `${idx + 1}/${installments}`,
      });
    });
  } else {
    Storage.addTransaction({
      type: state.txType,
      amount,
      category,
      date,
      description,
      paymentMethod: state.txType === 'expense' ? state.txPayment : null,
      cardName: isCard ? cardName : null,
      installmentLabel: isCard ? '1/1' : null,
      accountId,
    });
    if (accountId) {
      Storage.adjustAccountBalance(accountId, state.txType === 'income' ? amount : -amount);
    }
  }

  closeModal('modal-tx');
  renderAll();
});

// ==================== INVESTIMENTOS ====================

function openInvModal() {
  document.getElementById('inv-amount').value = '';
  document.getElementById('inv-name').value = '';
  document.getElementById('inv-date').value = todayISO();
  document.getElementById('inv-rate').value = '';
  document.getElementById('inv-maturity').value = '';
  const sel = document.getElementById('inv-class');
  sel.innerHTML = ASSET_CLASSES.map((c) => `<option value="${c}">${c}</option>`).join('');
  const liqSel = document.getElementById('inv-liquidity');
  liqSel.innerHTML = LIQUIDITY_OPTIONS.map((l) => `<option value="${l}">${l}</option>`).join('');
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
    liquidity: document.getElementById('inv-liquidity').value,
    rate: document.getElementById('inv-rate').value.trim(),
    maturity: document.getElementById('inv-maturity').value || null,
  });
  closeModal('modal-inv');
  renderAll();
});

// ==================== CONTAS A PAGAR ====================

function openBillModal() {
  document.getElementById('bill-name').value = '';
  document.getElementById('bill-amount').value = '';
  document.getElementById('bill-day').value = '';
  state.billCategory = Storage.getCategories()[0].name;
  renderBillCategories();
  openModal('modal-bill');
}

function renderBillCategories() {
  const wrap = document.getElementById('bill-categories');
  const categories = Storage.getCategories();
  if (!state.billCategory) state.billCategory = categories[0].name;
  wrap.innerHTML = categories
    .map((c) => `<div class="chip ${c.name === state.billCategory ? 'selected' : ''}" data-cat="${c.name}">${c.icon} ${c.name}</div>`)
    .join('');
  wrap.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.billCategory = chip.dataset.cat;
      renderBillCategories();
    });
  });
}

document.getElementById('btn-save-bill').addEventListener('click', () => {
  const name = document.getElementById('bill-name').value.trim();
  const amount = parseFloat(document.getElementById('bill-amount').value);
  const dueDay = parseInt(document.getElementById('bill-day').value);
  if (!name || !amount || amount <= 0 || !dueDay || dueDay < 1 || dueDay > 31) {
    alert('Preencha nome, valor e um dia de vencimento válido (1-31).');
    return;
  }
  Storage.addBill({ name, amount, dueDay, category: state.billCategory });
  closeModal('modal-bill');
  renderAll();
});

function renderBills() {
  const month = Calc.currentMonthKey();
  const bills = Storage.getBills();

  const alerts = Calc.billAlerts(bills, month);
  document.getElementById('bills-alerts').innerHTML = alerts.length
    ? alerts.map((a) => `<div class="alert ${a.severity}">${a.message}</div>`).join('')
    : `<div class="alert info">Nenhuma conta vencendo nos próximos dias. 👍</div>`;

  const listEl = document.getElementById('bills-list');
  if (bills.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nenhuma conta cadastrada. Toque em "+" para adicionar (aluguel, internet, cartão...).</div>`;
    return;
  }
  const sorted = [...bills].sort((a, b) => a.dueDay - b.dueDay);
  listEl.innerHTML = sorted
    .map((b) => {
      const paid = b.paidMonths.includes(month);
      const due = Calc.billDueDateForMonth(b, month);
      return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">${catIcon(b.category)}</div>
          <div>
            <div class="tx-desc">${b.name}</div>
            <div class="tx-date">Vence dia ${b.dueDay} (${due.toLocaleDateString('pt-BR')}) ${paid ? '· ✅ paga este mês' : ''}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="tx-amount expense">${Calc.fmtBRL(b.amount)}</div>
          ${paid ? '' : `<button class="chip" style="margin-top:4px;" data-pay-bill="${b.id}">Marcar como paga</button>`}
        </div>
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('[data-pay-bill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bill = bills.find((b) => b.id === btn.dataset.payBill);
      Storage.markBillPaid(bill.id, month);
      Storage.addTransaction({
        type: 'expense',
        amount: bill.amount,
        category: bill.category,
        date: todayISO(),
        description: `Conta: ${bill.name}`,
        paymentMethod: null,
      });
      renderAll();
    });
  });
}

// ==================== CONTAS/SALDOS ====================

function openAccountModal() {
  document.getElementById('account-name').value = '';
  document.getElementById('account-type').value = 'banco';
  document.getElementById('account-balance').value = '';
  openModal('modal-account');
}
document.getElementById('btn-add-account').addEventListener('click', openAccountModal);

document.getElementById('btn-save-account').addEventListener('click', () => {
  const name = document.getElementById('account-name').value.trim();
  const type = document.getElementById('account-type').value;
  const balance = parseFloat(document.getElementById('account-balance').value) || 0;
  if (!name) {
    alert('Dê um nome para a conta/carteira.');
    return;
  }
  Storage.addAccount({ name, type, balance });
  closeModal('modal-account');
  renderAll();
});

function renderAccounts() {
  const accounts = Storage.getAccounts();
  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);
  document.getElementById('accounts-total').textContent = Calc.fmtBRL(total);

  const listEl = document.getElementById('accounts-list');
  listEl.innerHTML = accounts.length
    ? accounts
        .map(
          (a) => `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">${a.type === 'carteira' ? '👛' : '🏦'}</div>
          <div class="tx-desc">${a.name}</div>
        </div>
        <div class="tx-amount income">${Calc.fmtBRL(a.balance)}</div>
      </div>`
        )
        .join('')
    : `<div class="empty-state">Nenhuma conta cadastrada. Adicione seus bancos e o dinheiro que você tem em casa.</div>`;
}

// ==================== POSSO GASTAR ISSO? (simulador) ====================

document.getElementById('btn-open-simulate').addEventListener('click', openSimulateModal);

function openSimulateModal() {
  document.getElementById('sim-amount').value = '';
  document.getElementById('sim-installments').value = 1;
  document.getElementById('sim-result').innerHTML = '';
  document.getElementById('btn-simulate-to-tx').style.display = 'none';
  state.simCategory = Storage.getCategories()[0].name;
  renderSimCategories();
  setSimPayment('Dinheiro');
  openModal('modal-simulate');
}

function renderSimCategories() {
  const wrap = document.getElementById('sim-categories');
  const categories = Storage.getCategories();
  wrap.innerHTML = categories
    .map((c) => `<div class="chip ${c.name === state.simCategory ? 'selected' : ''}" data-cat="${c.name}">${c.icon} ${c.name}</div>`)
    .join('');
  wrap.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.simCategory = chip.dataset.cat;
      renderSimCategories();
    });
  });
}

function setSimPayment(method) {
  state.simPayment = method;
  const wrap = document.getElementById('sim-payment-methods');
  wrap.innerHTML = PAYMENT_METHODS.map((m) => `<div class="chip ${m === method ? 'selected' : ''}" data-pm="${m}">${m}</div>`).join('');
  wrap.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => setSimPayment(chip.dataset.pm));
  });
  document.getElementById('sim-installments-wrap').style.display = method === 'Cartão de Crédito' ? 'block' : 'none';
}

document.getElementById('btn-calc-simulate').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('sim-amount').value);
  if (!amount || amount <= 0) {
    alert('Informe um valor válido.');
    return;
  }
  const installments =
    state.simPayment === 'Cartão de Crédito' ? Math.max(1, parseInt(document.getElementById('sim-installments').value) || 1) : 1;

  const month = Calc.currentMonthKey();
  const transactions = Storage.getTransactions();
  const budgets = Storage.getBudgetsForMonth(month);
  const budgetStatuses = Calc.budgetStatus(budgets, transactions, month);
  const budgetStatus = budgetStatuses.find((b) => b.category === state.simCategory);

  const result = Calc.canSpend({ amount, installments, budgetStatus });
  const severity = result.canSpend === false ? 'critical' : result.canSpend === true ? 'info' : 'warning';
  document.getElementById('sim-result').innerHTML = `<div class="alert ${severity}">${result.message}</div>`;

  state.lastSim = { amount, installments, category: state.simCategory, payment: state.simPayment };
  document.getElementById('btn-simulate-to-tx').style.display = 'block';
});

document.getElementById('btn-simulate-to-tx').addEventListener('click', () => {
  const sim = state.lastSim;
  closeModal('modal-simulate');
  if (sim) openTxModal(sim);
});

// -------- Render: Dashboard --------
function renderDashboard() {
  const month = Calc.currentMonthKey();
  const transactions = Storage.getTransactions();
  const budgets = Storage.getBudgetsForMonth(month);

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

  // Receitas do mês (salário + outras fontes)
  const totalIncome = Calc.totalByType(transactions, month, 'income');
  document.getElementById('dash-total-income').textContent = Calc.fmtBRL(totalIncome);
  const incomeByCategory = Calc.totalsByCategory(transactions, month, 'income');
  const incomeEntries = Object.entries(incomeByCategory);
  document.getElementById('dash-income-breakdown').innerHTML = incomeEntries.length
    ? incomeEntries
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => `<div class="cat-row"><div class="cat-name">${catIcon(cat)} ${cat}</div><div class="cat-values">${Calc.fmtBRL(val)}</div></div>`)
        .join('')
    : `<div class="empty-state">Nenhuma receita lançada este mês.</div>`;

  // Alertas: orçamento estourando + contas a vencer
  const budgetStatuses = Calc.budgetStatus(budgets, transactions, month);
  const alerts = [...Calc.billAlerts(Storage.getBills(), month), ...Calc.budgetAlerts(budgetStatuses)];
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
        .map((t) => {
          const paymentTag =
            t.paymentMethod === 'Cartão de Crédito'
              ? ` · 💳 ${t.cardName || 'Cartão'}${t.installmentLabel ? ' ' + t.installmentLabel : ''}`
              : t.paymentMethod
              ? ` · ${t.paymentMethod}`
              : '';
          return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">${t.type === 'income' ? '💰' : catIcon(t.category)}</div>
          <div>
            <div class="tx-desc">${t.description || t.category}</div>
            <div class="tx-date">${Calc.parseLocalDate(t.date).toLocaleDateString('pt-BR')}${paymentTag}</div>
          </div>
        </div>
        <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${Calc.fmtBRL(t.amount)}</div>
      </div>`;
        })
        .join('')
    : `<div class="empty-state">Nenhuma transação este mês. Toque em "+" para começar.</div>`;
}

// -------- Render: Orçamentos --------
function renderBudgets() {
  const month = Calc.currentMonthKey();
  const categories = Storage.getCategories();
  const budgets = Storage.getBudgetsForMonth(month);
  const profile = Storage.getProfile();
  const income = profile.incomeNet || 0;
  const wrap = document.getElementById('budget-inputs');
  wrap.innerHTML = categories
    .map((c) => {
      const existing = budgets.find((b) => b.category === c.name);
      const pct = c.recommendedPct != null ? c.recommendedPct : 5;
      const suggested = income > 0 ? (income * pct) / 100 : null;
      return `
      <div class="budget-row">
        <div class="list-row-input" style="border-bottom:none;padding:0;">
          <div class="cat-name">${c.icon} ${c.name}</div>
          <input type="number" inputmode="decimal" class="budget-limit-input" data-budget-cat="${c.name}" placeholder="0,00" value="${existing ? existing.limitAmount : ''}">
        </div>
        <div class="budget-pct-line">
          <span>Sugerido:</span>
          <input type="number" class="pct-input" data-pct-cat="${c.name}" value="${pct}" min="0" max="100">
          <span>% da renda líquida${suggested !== null ? ` (${Calc.fmtBRL(suggested)})` : ''}</span>
          ${suggested !== null ? `<button class="chip" data-apply-pct="${c.name}" data-suggested="${suggested}">Usar</button>` : ''}
        </div>
      </div>`;
    })
    .join('');

  wrap.querySelectorAll('.budget-limit-input').forEach((input) => {
    input.addEventListener('change', () => {
      const val = parseFloat(input.value) || 0;
      Storage.setBudget(input.dataset.budgetCat, month, val);
      renderDashboard();
    });
  });

  wrap.querySelectorAll('.pct-input').forEach((input) => {
    input.addEventListener('change', () => {
      const pct = parseFloat(input.value) || 0;
      Storage.setCategoryRecommendedPct(input.dataset.pctCat, pct);
      renderBudgets();
    });
  });

  wrap.querySelectorAll('[data-apply-pct]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const suggested = Math.round(parseFloat(btn.dataset.suggested) * 100) / 100;
      Storage.setBudget(btn.dataset.applyPct, month, suggested);
      renderBudgets();
      renderDashboard();
    });
  });

  const sugEl = document.getElementById('budget-suggestion');
  if (profile.incomeNet > 0) {
    const s = Calc.suggestion503020(profile.incomeNet);
    sugEl.innerHTML = `
      Necessidades (50%): <strong>${Calc.fmtBRL(s.necessidades)}</strong><br>
      Desejos/Lazer (30%): <strong>${Calc.fmtBRL(s.desejos)}</strong><br>
      Poupança/Investimento (20%): <strong>${Calc.fmtBRL(s.poupancaInvestimento)}</strong>`;
  } else {
    sugEl.textContent = 'Cadastre sua renda em Mais > Perfil para ver a sugestão.';
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
        .map((i) => {
          const details = [i.liquidity, i.rate, i.maturity ? `venc. ${Calc.parseLocalDate(i.maturity).toLocaleDateString('pt-BR')}` : null]
            .filter(Boolean)
            .join(' · ');
          return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">📈</div>
          <div>
            <div class="tx-desc">${i.name || i.assetClass}</div>
            <div class="tx-date">${i.assetClass}${details ? ' · ' + details : ''} · ${Calc.parseLocalDate(i.date).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div class="tx-amount ${i.movement === 'resgate' ? 'expense' : 'income'}">${i.movement === 'resgate' ? '-' : '+'} ${Calc.fmtBRL(i.amount)}</div>
      </div>`;
        })
        .join('')
    : `<div class="empty-state">Toque em "+" para registrar seu primeiro aporte.</div>`;
}

// -------- Render: Mais (Saldos + Perfil) --------
function loadProfileForm() {
  const p = Storage.getProfile();
  document.getElementById('profile-income-gross').value = p.incomeGross || '';
  document.getElementById('profile-income-net').value = p.incomeNet || '';
  document.getElementById('profile-dependents').value = p.dependents || 0;
  document.getElementById('profile-risk').value = p.riskProfile || 'Moderado';
  document.getElementById('profile-emergency').value = p.emergencyFundBalance || '';
  document.getElementById('profile-debt').checked = !!p.hasDebt;
}

document.getElementById('btn-save-profile').addEventListener('click', () => {
  const profile = {
    incomeGross: parseFloat(document.getElementById('profile-income-gross').value) || 0,
    incomeNet: parseFloat(document.getElementById('profile-income-net').value) || 0,
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
  const monthlyExpenses = Calc.totalByType(transactions, month, 'expense') || profile.incomeNet * 0.7;
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
  if (state.screen === 'bills') renderBills();
  if (state.screen === 'budgets') renderBudgets();
  if (state.screen === 'investments') renderInvestments();
  if (state.screen === 'more') {
    renderAccounts();
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
