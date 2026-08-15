// UI: navegação entre telas, renderização e handlers de formulário.

const state = {
  screen: 'dashboard',
  txType: 'expense',
  txCategory: null,
  txPayment: 'Dinheiro',
  invMovement: 'aporte',
  simCategory: null,
  simPayment: 'Dinheiro',
  hideValues: localStorage.getItem('finapp_hide_values') === '1',
};

function maskCurrency(value) {
  return state.hideValues ? '••••••' : Calc.fmtBRL(value);
}

function toggleHideValues() {
  state.hideValues = !state.hideValues;
  localStorage.setItem('finapp_hide_values', state.hideValues ? '1' : '0');
  document.getElementById('btn-toggle-hide').textContent = state.hideValues ? '🙈' : '👁️';
  renderAll();
}
document.getElementById('btn-toggle-hide').addEventListener('click', toggleHideValues);

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

const PAYMENT_TO_CARD_KIND = { 'Cartão Alimentação': 'alimentacao', 'Cartão Refeição': 'refeicao' };
const CARD_PAYMENT_METHODS = ['Cartão de Crédito', 'Cartão Alimentação', 'Cartão Refeição'];

function renderCreditCardSelect() {
  const sel = document.getElementById('tx-card-select');
  const cards = Storage.getCards().filter((c) => c.kind === 'credito');
  sel.innerHTML =
    cards.map((c) => `<option value="${c.id}">${c.name}</option>`).join('') +
    `<option value="__other__">Outro (não cadastrado)</option>`;
  document.getElementById('tx-card-name-wrap').style.display = cards.length === 0 ? 'block' : 'none';
}

function renderBenefitCardSelect(kind) {
  const sel = document.getElementById('tx-benefit-select');
  const cards = Storage.getCards().filter((c) => c.kind === kind);
  sel.innerHTML = cards.length
    ? cards.map((c) => `<option value="${c.id}">${c.name} (saldo: ${Calc.fmtBRL(c.balance)})</option>`).join('')
    : `<option value="">Nenhum cartão cadastrado — adicione em Mais</option>`;
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

  const isCredit = method === 'Cartão de Crédito';
  const benefitKind = PAYMENT_TO_CARD_KIND[method];
  document.getElementById('tx-card-fields').style.display = isCredit ? 'block' : 'none';
  document.getElementById('tx-benefit-fields').style.display = benefitKind ? 'block' : 'none';
  if (isCredit) renderCreditCardSelect();
  if (benefitKind) renderBenefitCardSelect(benefitKind);
  updateTxAccountVisibility();
}

function updateTxAccountVisibility() {
  const showAccount = state.txType === 'income' || !CARD_PAYMENT_METHODS.includes(state.txPayment);
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
  const isCredit = state.txType === 'expense' && state.txPayment === 'Cartão de Crédito';
  const benefitKind = state.txType === 'expense' ? PAYMENT_TO_CARD_KIND[state.txPayment] : null;

  if (isCredit) {
    const selectVal = document.getElementById('tx-card-select').value;
    const isOther = selectVal === '__other__' || !selectVal;
    const cardId = isOther ? null : selectVal;
    const registeredCard = cardId ? Storage.getCards().find((c) => c.id === cardId) : null;
    const cardName = registeredCard ? registeredCard.name : document.getElementById('tx-card-name').value.trim();
    const installments = Math.max(1, parseInt(document.getElementById('tx-installments').value) || 1);
    const parts = Calc.splitInstallments(amount, installments);
    parts.forEach((partAmount, idx) => {
      Storage.addTransaction({
        type: 'expense',
        amount: partAmount,
        category,
        date: Calc.addMonthsToDate(date, idx),
        description,
        paymentMethod: state.txPayment,
        cardId,
        cardName,
        installmentLabel: `${idx + 1}/${installments}`,
      });
    });
  } else if (benefitKind) {
    const cardId = document.getElementById('tx-benefit-select').value || null;
    const registeredCard = cardId ? Storage.getCards().find((c) => c.id === cardId) : null;
    Storage.addTransaction({
      type: 'expense',
      amount,
      category,
      date,
      description,
      paymentMethod: state.txPayment,
      cardId,
      cardName: registeredCard ? registeredCard.name : null,
      installmentLabel: null,
    });
    if (cardId) Storage.adjustCardBalance(cardId, -amount);
  } else {
    Storage.addTransaction({
      type: state.txType,
      amount,
      category,
      date,
      description,
      paymentMethod: state.txType === 'expense' ? state.txPayment : null,
      cardId: null,
      cardName: null,
      installmentLabel: null,
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

// ==================== CARTÕES (crédito, alimentação, refeição) ====================

function setCardKind(kind) {
  state.cardKind = kind;
  const wrap = document.getElementById('card-kind-chips');
  wrap.innerHTML = CARD_KINDS.map(
    (k) => `<div class="chip ${k.value === kind ? 'selected' : ''}" data-kind="${k.value}">${k.icon} ${k.label}</div>`
  ).join('');
  wrap.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => setCardKind(chip.dataset.kind));
  });
  document.getElementById('card-credito-fields').style.display = kind === 'credito' ? 'block' : 'none';
  document.getElementById('card-beneficio-fields').style.display = kind !== 'credito' ? 'block' : 'none';
}

function openCardModal() {
  document.getElementById('card-name').value = '';
  document.getElementById('card-due-day').value = '';
  document.getElementById('card-limit').value = '';
  document.getElementById('card-deposit').value = '';
  document.getElementById('card-balance').value = '';
  setCardKind('credito');
  openModal('modal-card');
}
document.getElementById('btn-add-card').addEventListener('click', openCardModal);

document.getElementById('btn-save-card').addEventListener('click', () => {
  const name = document.getElementById('card-name').value.trim();
  if (!name) {
    alert('Dê um nome para o cartão.');
    return;
  }
  if (state.cardKind === 'credito') {
    const dueDay = parseInt(document.getElementById('card-due-day').value);
    const limit = parseFloat(document.getElementById('card-limit').value) || 0;
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      alert('Informe um dia de vencimento válido (1-31).');
      return;
    }
    Storage.addCard({ name, kind: 'credito', dueDay, limit });
  } else {
    const monthlyDeposit = parseFloat(document.getElementById('card-deposit').value) || 0;
    const balance = parseFloat(document.getElementById('card-balance').value) || 0;
    Storage.addCard({ name, kind: state.cardKind, monthlyDeposit, balance });
  }
  closeModal('modal-card');
  renderAll();
});

function renderCards() {
  const cards = Storage.getCards();
  const transactions = Storage.getTransactions();

  const alerts = Calc.cardAlerts(cards, transactions);
  document.getElementById('cards-alerts').innerHTML = alerts.map((a) => `<div class="alert ${a.severity}">${a.message}</div>`).join('');

  const listEl = document.getElementById('cards-list');
  if (cards.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nenhum cartão cadastrado. Adicione seus cartões de crédito e vale alimentação/refeição.</div>`;
    return;
  }
  listEl.innerHTML = cards
    .map((c) => {
      const kindInfo = CARD_KINDS.find((k) => k.value === c.kind);
      if (c.kind === 'credito') {
        const { outstanding, available } = Calc.cardAvailableLimit(c, transactions);
        const pct = c.limit > 0 ? (outstanding / c.limit) * 100 : 0;
        const statusClass = pct > 100 ? 'status-ultrapassado' : pct >= 80 ? 'status-aviso' : 'status-ok';
        return `
        <div class="cat-row" style="display:block;">
          <div class="cat-name">${kindInfo.icon} ${c.name}</div>
          <div class="cat-values">Vence dia ${c.dueDay} · usado ${Calc.fmtBRL(outstanding)} / ${Calc.fmtBRL(c.limit)} · disponível ${Calc.fmtBRL(available)}</div>
          <div class="progress-bar"><div class="progress-fill ${statusClass}" style="width:${Math.min(Math.max(pct, 0), 100)}%"></div></div>
        </div>`;
      }
      return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">${kindInfo.icon}</div>
          <div>
            <div class="tx-desc">${c.name}</div>
            <div class="tx-date">${kindInfo.label}${c.monthlyDeposit ? ' · cai ' + Calc.fmtBRL(c.monthlyDeposit) + '/mês' : ''}</div>
          </div>
        </div>
        <div class="tx-amount income">${Calc.fmtBRL(c.balance)}</div>
      </div>`;
    })
    .join('');
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

// -------- Gráficos (SVG inline, sem lib externa) --------

function renderCategoryChart(containerId, totalsMap) {
  const container = document.getElementById(containerId);
  const entries = Object.entries(totalsMap)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (!entries.length) {
    container.innerHTML = `<div class="empty-state">Sem gastos registrados este mês ainda.</div>`;
    return;
  }
  const max = Math.max(...entries.map(([, v]) => v));
  container.innerHTML = entries
    .map(
      ([cat, val]) => `
    <div class="cat-row" style="display:block;">
      <div class="cat-name">${catIcon(cat)} ${cat}</div>
      <div class="progress-bar" style="margin-top:4px;"><div class="progress-fill status-ok" style="width:${(val / max) * 100}%"></div></div>
      ${state.hideValues ? '' : `<div class="sub-line" style="margin-top:2px;">${Calc.fmtBRL(val)}</div>`}
    </div>`
    )
    .join('');
}

function buildTrendData(transactions) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mk = Calc.monthKey(d);
    months.push({
      key: mk,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      gasto: Calc.totalByType(transactions, mk, 'expense'),
      receita: Calc.totalByType(transactions, mk, 'income'),
    });
  }
  return months;
}

function renderTrendChart(containerId, months) {
  const container = document.getElementById(containerId);
  const max = Math.max(1, ...months.flatMap((m) => [m.gasto, m.receita]));
  const h = 100;
  const barW = 12;
  const gap = 6;
  const groupW = barW * 2 + gap;
  const groupGap = 14;
  const chartW = months.length * (groupW + groupGap);

  const bars = months
    .map((m, i) => {
      const x = i * (groupW + groupGap);
      const gH = Math.max((m.gasto / max) * h, m.gasto > 0 ? 2 : 0);
      const rH = Math.max((m.receita / max) * h, m.receita > 0 ? 2 : 0);
      return `
      <rect x="${x}" y="${h - gH}" width="${barW}" height="${gH}" fill="var(--danger)" rx="2"></rect>
      <rect x="${x + barW + gap}" y="${h - rH}" width="${barW}" height="${rH}" fill="var(--success)" rx="2"></rect>
      <text x="${x + groupW / 2}" y="${h + 14}" font-size="9" fill="#6B7280" text-anchor="middle">${m.label}</text>`;
    })
    .join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${chartW} ${h + 20}" style="width:100%;height:130px;display:block;">${bars}</svg>
    <div style="display:flex;gap:16px;font-size:11px;color:var(--text-secondary);margin-top:4px;">
      <span>🔴 Gastos</span><span>🟢 Receitas</span>
    </div>`;
}

// -------- Render: Dashboard --------
function renderDashboard() {
  const month = Calc.currentMonthKey();
  const transactions = Storage.getTransactions();
  const budgets = Storage.getBudgetsForMonth(month);

  const totalSpent = Calc.totalByType(transactions, month, 'expense');
  document.getElementById('dash-total-spent').textContent = maskCurrency(totalSpent);

  const cmp = Calc.comparisonPrevMonth(transactions, month);
  const cmpEl = document.getElementById('dash-comparison');
  if (cmp.pct === null) {
    cmpEl.textContent = 'Sem dados do mês passado para comparar.';
  } else if (state.hideValues) {
    const arrow = cmp.diff >= 0 ? '↑' : '↓';
    cmpEl.textContent = `${arrow} ${Math.abs(cmp.pct).toFixed(0)}% vs. mês passado`;
  } else {
    const arrow = cmp.diff >= 0 ? '↑' : '↓';
    cmpEl.textContent = `${arrow} ${Math.abs(cmp.pct).toFixed(0)}% vs. mês passado (${Calc.fmtBRL(cmp.passado)})`;
  }

  // Gráficos
  renderCategoryChart('dash-chart-categories', Calc.totalsByCategory(transactions, month, 'expense'));
  renderTrendChart('dash-chart-trend', buildTrendData(transactions));

  // Receitas do mês (salário + outras fontes)
  const totalIncome = Calc.totalByType(transactions, month, 'income');
  document.getElementById('dash-total-income').textContent = maskCurrency(totalIncome);
  const incomeByCategory = Calc.totalsByCategory(transactions, month, 'income');
  const incomeEntries = Object.entries(incomeByCategory);
  document.getElementById('dash-income-breakdown').innerHTML = incomeEntries.length
    ? incomeEntries
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => `<div class="cat-row"><div class="cat-name">${catIcon(cat)} ${cat}</div><div class="cat-values">${maskCurrency(val)}</div></div>`)
        .join('')
    : `<div class="empty-state">Nenhuma receita lançada este mês.</div>`;

  // Alertas: orçamento estourando + contas a vencer + faturas de cartão a vencer
  const budgetStatuses = Calc.budgetStatus(budgets, transactions, month);
  const alerts = [
    ...Calc.billAlerts(Storage.getBills(), month),
    ...Calc.cardAlerts(Storage.getCards(), transactions),
    ...Calc.budgetAlerts(budgetStatuses),
  ];
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
          <div class="cat-values">${maskCurrency(b.spent)} / ${maskCurrency(b.limitAmount)} (${b.percent.toFixed(0)}%)</div>
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
        <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${maskCurrency(t.amount)}</div>
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
    renderCards();
    loadProfileForm();
    renderProfileRecommendation();
  }
}

// ==================== NOTIFICAÇÕES (vencimento hoje/atrasado) ====================
// 100% local: dispara uma notificação nativa do aparelho quando o app é aberto
// e há uma conta ou fatura vencendo hoje ou já atrasada. Sem internet não existe
// como acordar o app sozinho quando ele está fechado — a notificação só sai
// quando o usuário abre o app naquele dia.

function updateNotifStatus() {
  const el = document.getElementById('notif-status');
  if (!('Notification' in window)) {
    el.textContent = 'Seu navegador não suporta notificações.';
    return;
  }
  const statusMap = {
    granted: '✅ Notificações ativadas.',
    denied: '🚫 Notificações bloqueadas — ative nas configurações do navegador/app.',
    default: 'Notificações ainda não ativadas.',
  };
  el.textContent = statusMap[Notification.permission];
}

document.getElementById('btn-enable-notif').addEventListener('click', () => {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(() => {
    updateNotifStatus();
    checkAndNotifyDueToday();
  });
});

function checkAndNotifyDueToday() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = todayISO();
  const notifiedKey = `finapp_notified_${today}`;
  const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

  const month = Calc.currentMonthKey();
  const dueBills = Calc.billAlerts(Storage.getBills(), month).filter((a) => a.diffDays <= 0 && !notified.includes('bill:' + a.billId));
  const dueCards = Calc.cardAlerts(Storage.getCards(), Storage.getTransactions()).filter(
    (a) => a.diffDays <= 0 && !notified.includes('card:' + a.cardId)
  );

  dueBills.forEach((a) => {
    new Notification('💰 Conta vencendo hoje', { body: a.message, tag: 'bill-' + a.billId });
    notified.push('bill:' + a.billId);
  });
  dueCards.forEach((a) => {
    new Notification('💳 Fatura vencendo hoje', { body: a.message, tag: 'card-' + a.cardId });
    notified.push('card:' + a.cardId);
  });

  if (dueBills.length || dueCards.length) {
    localStorage.setItem(notifiedKey, JSON.stringify(notified));
  }
}

// -------- Init --------
document.getElementById('btn-toggle-hide').textContent = state.hideValues ? '🙈' : '👁️';
renderAll();
updateNotifStatus();
checkAndNotifyDueToday();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW falhou', e));
  });
}
