// UI: navegação entre telas, renderização e handlers de formulário.

const state = {
  screen: 'dashboard',
  txType: 'expense',
  txCategory: null,
  txPayment: 'Dinheiro',
  txCurrency: 'BRL',
  invMovement: 'aporte',
  invCurrency: 'BRL',
  simCategory: null,
  simPayment: 'Dinheiro',
  hideValues: localStorage.getItem('finapp_hide_values') === '1',
  viewMonth: Calc.currentMonthKey(),
  multiCurrency: localStorage.getItem('finapp_multi_currency') === '1',
};

// Só mostra seletor de moeda pra quem ativou — por padrão fica tudo em R$, sem ruído
function multiCurrencyOn() {
  return state.multiCurrency && Storage.getCurrencies().length > 1;
}

// Formata um valor com a moeda do próprio registro (sem conversão), respeitando o modo oculto
function fmtCurrency(value, currencyCode) {
  const meta = Storage.getCurrency(currencyCode);
  return state.hideValues ? '••••••' : Calc.fmtMoney(value, meta);
}

function accountIcon(account) {
  const t = ACCOUNT_TYPES.find((x) => x.value === account.type);
  return t ? t.icon : '🏦';
}

// <option>s das contas de uma moeda; emptyLabel = primeira opção "sem conta" (ou null para não ter)
function accountOptionsHTML(currency, selectedId, emptyLabel) {
  const accounts = Storage.getAccounts().filter((a) => (a.currency || 'BRL') === currency);
  return (
    (emptyLabel ? `<option value="">${emptyLabel}</option>` : '') +
    accounts
      .map(
        (a) =>
          `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${accountIcon(a)} ${a.name} (${Calc.fmtMoney(a.balance, Storage.getCurrency(a.currency))})</option>`
      )
      .join('')
  );
}

// -------- Diálogos no tema do app (substituem alert()/confirm() nativos) --------
function appAlert(message) {
  return new Promise((resolve) => {
    const el = document.getElementById('appalert-message');
    el.style.whiteSpace = 'pre-line';
    el.textContent = message;
    openModal('modal-appalert');
    document.getElementById('btn-appalert-ok').onclick = () => {
      closeModal('modal-appalert');
      resolve();
    };
  });
}

function appConfirm(message, { danger = false, okText = null, cancelText = null } = {}) {
  return new Promise((resolve) => {
    // white-space: pre-line para as mensagens que usam \n fazerem parágrafo de verdade
    const msgEl = document.getElementById('appconfirm-message');
    msgEl.style.whiteSpace = 'pre-line';
    msgEl.textContent = message;
    const okBtn = document.getElementById('btn-appconfirm-ok');
    const cancelBtn = document.getElementById('btn-appconfirm-cancel');
    okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    okBtn.textContent = okText || (danger ? 'Sim, continuar' : 'Confirmar');
    cancelBtn.textContent = cancelText || 'Cancelar';
    openModal('modal-appconfirm');
    const finish = (result) => {
      closeModal('modal-appconfirm');
      cancelBtn.textContent = 'Cancelar';
      resolve(result);
    };
    okBtn.onclick = () => finish(true);
    cancelBtn.onclick = () => finish(false);
  });
}

// -------- Navegação por mês (compartilhada entre Início e Orçamento) --------
function renderMonthNav() {
  const isCurrent = state.viewMonth === Calc.currentMonthKey();
  document.querySelectorAll('[data-month-nav]').forEach((nav) => {
    nav.querySelector('[data-month-label]').textContent = Calc.monthLabel(state.viewMonth);
    nav.querySelector('[data-month-today]').style.display = isCurrent ? 'none' : 'block';
  });
}

function shiftViewMonth(delta) {
  state.viewMonth = Calc.shiftMonth(state.viewMonth, delta);
  renderMonthNav();
  renderAll();
}

document.querySelectorAll('[data-month-prev]').forEach((btn) => btn.addEventListener('click', () => shiftViewMonth(-1)));
document.querySelectorAll('[data-month-next]').forEach((btn) => btn.addEventListener('click', () => shiftViewMonth(1)));
document.querySelectorAll('[data-month-today]').forEach((btn) =>
  btn.addEventListener('click', () => {
    state.viewMonth = Calc.currentMonthKey();
    renderMonthNav();
    renderAll();
  })
);

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
  dashboard: 'Meu Bolso Sem Achismo',
  analysis: 'Análise detalhada',
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

document.getElementById('btn-open-analysis').addEventListener('click', () => showScreen('analysis'));
document.getElementById('btn-analysis-back').addEventListener('click', () => showScreen('dashboard'));

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
  else openTxModal();
});

// ==================== TRANSAÇÃO (gasto/receita) ====================

function renderAccountOptions(selectEl, selectedId) {
  const accounts = Storage.getAccounts().filter((a) => (a.currency || 'BRL') === state.txCurrency);
  selectEl.innerHTML =
    `<option value="">— nenhuma —</option>` +
    accounts
      .map(
        (a) =>
          `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${accountIcon(a)} ${a.name} (${Calc.fmtMoney(a.balance, Storage.getCurrency(a.currency))})</option>`
      )
      .join('');
}

function renderTxCurrencyChips() {
  const currencies = Storage.getCurrencies();
  const wrap = document.getElementById('tx-currency-wrap');
  const isCardPayment = state.txType === 'expense' && CARD_PAYMENT_METHODS.includes(state.txPayment);
  wrap.style.display = multiCurrencyOn() && !isCardPayment ? 'block' : 'none';
  document.getElementById('tx-currency-chips').innerHTML = currencies
    .map((c) => `<div class="chip ${c.code === state.txCurrency ? 'selected' : ''}" data-currency="${c.code}">${c.symbol} ${c.code}</div>`)
    .join('');
  document.querySelectorAll('#tx-currency-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => setTxCurrency(chip.dataset.currency));
  });
  document.getElementById('tx-currency-prefix').textContent = Storage.getCurrency(state.txCurrency).symbol;
}

function setTxCurrency(code) {
  state.txCurrency = code;
  renderTxCurrencyChips();
  renderAccountOptions(document.getElementById('tx-account'));
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

function describeTxPayment(tx) {
  const currency = tx.currency || 'BRL';
  const currencyTxt = currency !== 'BRL' ? ` Moeda: ${Storage.getCurrency(currency).symbol} ${currency}.` : '';
  if (!tx.paymentMethod) return (tx.type === 'income' ? 'Receita.' : '') + currencyTxt;
  let extra = '';
  if (tx.paymentMethod === 'Cartão de Crédito') extra = ` (${tx.cardName || 'cartão'}${tx.installmentLabel ? ' ' + tx.installmentLabel : ''})`;
  else if (tx.cardName) extra = ` (${tx.cardName})`;
  return `Forma de pagamento: ${tx.paymentMethod}${extra} — não editável aqui. Para mudar, apague e lance de novo.${currencyTxt}`;
}

// O sinal do efeito no saldo depende do TIPO do lançamento. Antes o cartão de
// benefício sempre debitava, independente de ser gasto ou receita: editar um gasto
// de R$ 50 e trocar para receita deixava o saldo do vale R$ 100 abaixo do real.
function reverseTransactionEffects(tx) {
  const signal = tx.type === 'income' ? 1 : -1;
  if (tx.accountId) {
    Storage.adjustAccountBalance(tx.accountId, -signal * tx.amount);
  }
  if (tx.toAccountId) {
    Storage.adjustAccountBalance(tx.toAccountId, -tx.amount);
  }
  if (tx.cardId) {
    const card = Storage.getCards().find((c) => c.id === tx.cardId);
    if (card && card.kind !== 'credito') Storage.adjustCardBalance(tx.cardId, -signal * tx.amount);
  }
}

function applyTransactionEffects(tx) {
  const signal = tx.type === 'income' ? 1 : -1;
  if (tx.accountId) {
    Storage.adjustAccountBalance(tx.accountId, signal * tx.amount);
  }
  if (tx.toAccountId) {
    Storage.adjustAccountBalance(tx.toAccountId, tx.amount);
  }
  if (tx.cardId) {
    const card = Storage.getCards().find((c) => c.id === tx.cardId);
    if (card && card.kind !== 'credito') Storage.adjustCardBalance(tx.cardId, signal * tx.amount);
  }
}

async function deleteTransactionById(id) {
  const tx = Storage.getTransaction(id);
  if (!tx) return;
  if (!(await appConfirm('Apagar este lançamento? Essa ação não pode ser desfeita.', { danger: true }))) return;
  reverseTransactionEffects(tx);
  Storage.deleteTransaction(id);
  renderAll();
}

function openTxModal(prefill, editId) {
  state.editingTxId = editId || null;
  const deleteBtn = document.getElementById('btn-delete-tx');
  const infoEl = document.getElementById('tx-edit-payment-info');

  if (editId) {
    const tx = Storage.getTransaction(editId);
    if (!tx) return;
    document.getElementById('tx-modal-title').textContent = 'Editar lançamento';
    document.getElementById('tx-amount').value = tx.amount;
    document.getElementById('tx-desc').value = tx.description || '';
    document.getElementById('tx-date').value = tx.date;
    state.txCurrency = tx.currency || 'BRL';
    setTxType(tx.type);
    state.txCategory = tx.category;
    renderTxCategories();
    document.getElementById('tx-payment-wrap').style.display = 'none';
    document.getElementById('tx-currency-wrap').style.display = 'none';
    document.getElementById('tx-account-wrap').style.display = 'none';
    infoEl.style.display = 'block';
    infoEl.textContent = describeTxPayment(tx);
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('tx-modal-title').textContent = 'Novo lançamento';
    document.getElementById('tx-amount').value = prefill ? prefill.amount : '';
    document.getElementById('tx-desc').value = '';
    document.getElementById('tx-date').value = todayISO();
    document.getElementById('tx-card-name').value = '';
    document.getElementById('tx-installments').value = prefill ? prefill.installments || 1 : 1;
    document.getElementById('tx-installment-start').value = 1;
    updateInstallmentStartVisibility();
    state.txCurrency = 'BRL';
    setTxType('expense');
    if (prefill && prefill.category) state.txCategory = prefill.category;
    renderTxCategories();
    setTxPayment(prefill ? prefill.payment || 'Dinheiro' : 'Dinheiro');
    renderTxCurrencyChips();
    renderAccountOptions(document.getElementById('tx-account'));
    infoEl.style.display = 'none';
    deleteBtn.style.display = 'none';
  }
  openModal('modal-tx');
}

document.getElementById('btn-delete-tx').addEventListener('click', () => {
  if (!state.editingTxId) return;
  deleteTransactionById(state.editingTxId);
  closeModal('modal-tx');
});

function setTxType(type) {
  state.txType = type;
  document.querySelectorAll('#modal-tx .type-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.type === type);
  });
  document.getElementById('tx-payment-wrap').style.display = type === 'expense' ? 'block' : 'none';
  state.txCategory = null;
  renderTxCategories();
  updateTxAccountVisibility();
  renderTxCurrencyChips();
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
  if (isCredit || benefitKind) state.txCurrency = 'BRL'; // cartões são sempre em R$
  updateTxAccountVisibility();
  updateInstallmentStartVisibility();
  updateInvoiceHint();
  renderTxCurrencyChips();
}

function updateInvoiceHint() {
  const hintEl = document.getElementById('tx-invoice-hint');
  const isCredit = state.txPayment === 'Cartão de Crédito' && state.txType === 'expense';
  const cardId = document.getElementById('tx-card-select').value;
  const card = isCredit && cardId && cardId !== '__other__' ? Storage.getCards().find((c) => c.id === cardId) : null;
  if (!card) {
    hintEl.style.display = 'none';
    return;
  }
  const date = document.getElementById('tx-date').value || todayISO();
  const { dueDate } = Calc.cardInvoiceForDate(card, date);
  const label = dueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  hintEl.textContent = `📅 Cai na fatura de ${label} (vence ${dueDate.toLocaleDateString('pt-BR')}).`;
  hintEl.style.display = 'block';
}
document.getElementById('tx-card-select').addEventListener('change', updateInvoiceHint);
document.getElementById('tx-date').addEventListener('change', updateInvoiceHint);

function updateInstallmentStartVisibility() {
  const installments = parseInt(document.getElementById('tx-installments').value) || 1;
  const wrap = document.getElementById('tx-installment-start-wrap');
  wrap.style.display = installments > 1 ? 'block' : 'none';
  const startInput = document.getElementById('tx-installment-start');
  startInput.max = installments;
  if (parseInt(startInput.value) > installments) startInput.value = installments;
}
document.getElementById('tx-installments').addEventListener('input', updateInstallmentStartVisibility);

function updateTxAccountVisibility() {
  const showAccount = state.txType === 'income' || !CARD_PAYMENT_METHODS.includes(state.txPayment);
  document.getElementById('tx-account-wrap').style.display = showAccount ? 'block' : 'none';
}

document.getElementById('btn-save-tx').addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('tx-amount').value);
  if (!amount || amount <= 0) {
    await appAlert('Informe um valor válido.');
    return;
  }
  const date = document.getElementById('tx-date').value || todayISO();
  const description = document.getElementById('tx-desc').value.trim();
  const category = state.txCategory;

  if (state.editingTxId) {
    const old = Storage.getTransaction(state.editingTxId);
    reverseTransactionEffects(old);
    const updated = { ...old, amount, category, date, description, type: state.txType };
    applyTransactionEffects(updated);
    Storage.updateTransaction(state.editingTxId, { amount, category, date, description, type: state.txType });
    closeModal('modal-tx');
    renderAll();
    return;
  }

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
    const startInstallment = Math.min(Math.max(1, parseInt(document.getElementById('tx-installment-start').value) || 1), installments);
    const parts = Calc.splitInstallments(amount, installments);
    const remainingParts = parts.slice(startInstallment - 1);
    remainingParts.forEach((partAmount, i) => {
      Storage.addTransaction({
        type: 'expense',
        amount: partAmount,
        category,
        date: Calc.addMonthsToDate(date, i),
        description,
        paymentMethod: state.txPayment,
        cardId,
        cardName,
        installmentLabel: `${startInstallment + i}/${installments}`,
        currency: 'BRL',
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
      currency: 'BRL',
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
      currency: state.txCurrency,
    });
    if (accountId) {
      Storage.adjustAccountBalance(accountId, state.txType === 'income' ? amount : -amount);
    }
  }

  closeModal('modal-tx');
  renderAll();
});

// ==================== INVESTIMENTOS ====================

function openInvModal(editId) {
  state.editingInvId = editId || null;
  const deleteBtn = document.getElementById('btn-delete-inv');
  const sel = document.getElementById('inv-class');
  sel.innerHTML = ASSET_CLASSES.map((c) => `<option value="${c}">${c}</option>`).join('');
  const liqSel = document.getElementById('inv-liquidity');
  liqSel.innerHTML = LIQUIDITY_OPTIONS.map((l) => `<option value="${l}">${l}</option>`).join('');

  if (editId) {
    const inv = Storage.getInvestments().find((i) => i.id === editId);
    if (!inv) return;
    document.getElementById('inv-modal-title').textContent = 'Editar investimento';
    document.getElementById('inv-amount').value = inv.amount;
    document.getElementById('inv-name').value = inv.name || '';
    document.getElementById('inv-broker').value = inv.broker || '';
    document.getElementById('inv-date').value = inv.date;
    document.getElementById('inv-rate').value = inv.rate || '';
    document.getElementById('inv-maturity').value = inv.maturity || '';
    sel.value = inv.assetClass;
    liqSel.value = inv.liquidity || 'Diária';
    state.invCurrency = inv.currency || 'BRL';
    state.invAccountId = inv.accountId || '';
    renderInvCurrencyChips();
    setInvMovement(inv.movement);
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('inv-modal-title').textContent = 'Novo aporte / resgate';
    document.getElementById('inv-amount').value = '';
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-broker').value = '';
    document.getElementById('inv-date').value = todayISO();
    document.getElementById('inv-rate').value = '';
    document.getElementById('inv-maturity').value = '';
    state.invCurrency = 'BRL';
    // Sugere a conta com mais saldo: é de onde quase sempre sai o aporte.
    const candidates = Storage.getAccounts().filter((a) => (a.currency || 'BRL') === 'BRL' && a.type !== 'cofre');
    state.invAccountId = candidates.length ? candidates.reduce((a, b) => (Number(b.balance) > Number(a.balance) ? b : a)).id : '';
    renderInvCurrencyChips();
    setInvMovement('aporte');
    deleteBtn.style.display = 'none';
  }
  openModal('modal-inv');
}

function renderInvCurrencyChips() {
  const currencies = Storage.getCurrencies();
  const wrap = document.getElementById('inv-currency-wrap');
  wrap.style.display = multiCurrencyOn() ? 'block' : 'none';
  document.getElementById('inv-currency-chips').innerHTML = currencies
    .map((c) => `<div class="chip ${c.code === state.invCurrency ? 'selected' : ''}" data-currency="${c.code}">${c.symbol} ${c.code}</div>`)
    .join('');
  document.querySelectorAll('#inv-currency-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.invCurrency = chip.dataset.currency;
      state.invAccountId = '';
      renderInvCurrencyChips();
    });
  });
  renderInvAccountSelect();
}

function renderInvAccountSelect() {
  const sel = document.getElementById('inv-account');
  const isResgate = state.invMovement === 'resgate';
  document.getElementById('inv-account-label').textContent = isResgate ? 'Volta para qual conta?' : 'Sai de qual conta?';
  sel.innerHTML = accountOptionsHTML(state.invCurrency, state.invAccountId, 'Não mexer no saldo de nenhuma conta');
  sel.value = state.invAccountId || '';
  const hint = document.getElementById('inv-account-hint');
  hint.textContent = sel.value
    ? isResgate
      ? 'O valor resgatado entra no saldo dessa conta.'
      : 'O valor sai do saldo dessa conta e vai para o investimento.'
    : Storage.getAccounts().length
    ? 'Use quando o dinheiro já tinha saído antes ou veio de fora do app.'
    : 'Cadastre suas contas em Ajustes para o aporte descontar do saldo.';
}
document.getElementById('inv-account').addEventListener('change', (e) => {
  state.invAccountId = e.target.value;
  renderInvAccountSelect();
});

function setInvMovement(mov) {
  state.invMovement = mov;
  document.querySelectorAll('#modal-inv .type-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.movement === mov);
  });
  renderInvAccountSelect();
}
document.querySelectorAll('#modal-inv .type-btn').forEach((btn) => {
  btn.addEventListener('click', () => setInvMovement(btn.dataset.movement));
});

document.getElementById('btn-save-inv').addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('inv-amount').value);
  if (!amount || amount <= 0) {
    await appAlert('Informe um valor válido.');
    return;
  }
  const patch = {
    amount,
    assetClass: document.getElementById('inv-class').value,
    name: document.getElementById('inv-name').value.trim(),
    broker: document.getElementById('inv-broker').value.trim(),
    date: document.getElementById('inv-date').value || todayISO(),
    movement: state.invMovement,
    liquidity: document.getElementById('inv-liquidity').value,
    rate: document.getElementById('inv-rate').value.trim(),
    maturity: document.getElementById('inv-maturity').value || null,
    currency: state.invCurrency,
    accountId: document.getElementById('inv-account').value || null,
  };
  if (state.editingInvId) {
    // Desfaz o efeito antigo no saldo antes de aplicar o novo (valor ou conta podem ter mudado)
    const old = Storage.getInvestments().find((i) => i.id === state.editingInvId);
    if (old && old.accountId) Storage.adjustAccountBalance(old.accountId, -Calc.investmentAccountDelta(old));
    Storage.updateInvestment(state.editingInvId, patch);
  } else {
    Storage.addInvestment(patch);
  }
  if (patch.accountId) Storage.adjustAccountBalance(patch.accountId, Calc.investmentAccountDelta(patch));
  closeModal('modal-inv');
  renderAll();
});

document.getElementById('btn-delete-inv').addEventListener('click', async () => {
  if (!state.editingInvId) return;
  const inv = Storage.getInvestments().find((i) => i.id === state.editingInvId);
  const msg = inv && inv.accountId
    ? 'Apagar este registro de investimento? O valor volta para o saldo da conta usada.'
    : 'Apagar este registro de investimento?';
  if (!(await appConfirm(msg, { danger: true }))) return;
  if (inv && inv.accountId) Storage.adjustAccountBalance(inv.accountId, -Calc.investmentAccountDelta(inv));
  Storage.deleteInvestment(state.editingInvId);
  closeModal('modal-inv');
  renderAll();
});

// ==================== CONTAS A PAGAR ====================

function openBillModal(editId) {
  state.editingBillId = editId || null;
  const deleteBtn = document.getElementById('btn-delete-bill');

  const classSel = document.getElementById('bill-inv-class');
  classSel.innerHTML = ASSET_CLASSES.map((c) => `<option value="${c}">${c}</option>`).join('');
  const liqSel = document.getElementById('bill-inv-liquidity');
  liqSel.innerHTML = LIQUIDITY_OPTIONS.map((l) => `<option value="${l}">${l}</option>`).join('');

  const isInvCheckbox = document.getElementById('bill-is-investment');
  if (editId) {
    const bill = Storage.getBills().find((b) => b.id === editId);
    if (!bill) return;
    document.getElementById('bill-modal-title').textContent = 'Editar conta';
    document.getElementById('bill-name').value = bill.name;
    document.getElementById('bill-amount').value = bill.amount;
    document.getElementById('bill-day').value = bill.dueDay;
    state.billCategory = bill.category;
    isInvCheckbox.checked = !!bill.isInvestment;
    classSel.value = bill.invClass || ASSET_CLASSES[0];
    document.getElementById('bill-inv-broker').value = bill.invBroker || '';
    liqSel.value = bill.invLiquidity || 'Diária';
    document.getElementById('bill-inv-maturity').value = bill.invMaturity || '';
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('bill-modal-title').textContent = 'Nova conta a pagar';
    document.getElementById('bill-name').value = '';
    document.getElementById('bill-amount').value = '';
    document.getElementById('bill-day').value = '';
    state.billCategory = Storage.getCategories()[0].name;
    isInvCheckbox.checked = false;
    classSel.value = ASSET_CLASSES[0];
    document.getElementById('bill-inv-broker').value = '';
    liqSel.value = 'Diária';
    document.getElementById('bill-inv-maturity').value = '';
    deleteBtn.style.display = 'none';
  }
  document.getElementById('bill-investment-fields').style.display = isInvCheckbox.checked ? 'block' : 'none';
  renderBillCategories();
  openModal('modal-bill');
}
document.getElementById('btn-add-bill').addEventListener('click', () => openBillModal());

document.getElementById('bill-is-investment').addEventListener('change', (e) => {
  document.getElementById('bill-investment-fields').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('btn-delete-bill').addEventListener('click', async () => {
  if (!state.editingBillId) return;
  if (!(await appConfirm('Apagar esta conta a pagar?', { danger: true }))) return;
  Storage.deleteBill(state.editingBillId);
  closeModal('modal-bill');
  renderAll();
});

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

document.getElementById('btn-save-bill').addEventListener('click', async () => {
  const name = document.getElementById('bill-name').value.trim();
  const amount = parseFloat(document.getElementById('bill-amount').value);
  const dueDay = parseInt(document.getElementById('bill-day').value);
  if (!name || !amount || amount <= 0 || !dueDay || dueDay < 1 || dueDay > 31) {
    await appAlert('Preencha nome, valor e um dia de vencimento válido (1-31).');
    return;
  }
  const isInvestment = document.getElementById('bill-is-investment').checked;
  const patch = {
    name,
    amount,
    dueDay,
    category: state.billCategory,
    isInvestment,
    invClass: isInvestment ? document.getElementById('bill-inv-class').value : null,
    invBroker: isInvestment ? document.getElementById('bill-inv-broker').value.trim() : null,
    invLiquidity: isInvestment ? document.getElementById('bill-inv-liquidity').value : null,
    invMaturity: isInvestment ? document.getElementById('bill-inv-maturity').value || null : null,
  };
  if (state.editingBillId) {
    Storage.updateBill(state.editingBillId, patch);
  } else {
    Storage.addBill(patch);
  }
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
        <div class="tx-left" data-edit-bill="${b.id}" style="cursor:pointer;">
          <div class="tx-icon">${b.isInvestment ? '📈' : catIcon(b.category)}</div>
          <div>
            <div class="tx-desc">${b.name}${b.isInvestment ? ' · aporte' : ''}</div>
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

  listEl.querySelectorAll('[data-edit-bill]').forEach((el) => {
    el.addEventListener('click', () => openBillModal(el.dataset.editBill));
  });

  listEl.querySelectorAll('[data-pay-bill]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPayBillModal(btn.dataset.payBill);
    });
  });
}

function openPayBillModal(billId) {
  const bill = Storage.getBills().find((b) => b.id === billId);
  if (!bill) return;
  const month = Calc.currentMonthKey();
  if (bill.paidMonths.includes(month)) return;
  state.payingBillId = billId;
  document.getElementById('pay-bill-name').textContent = bill.name;
  document.getElementById('pay-bill-amount').value = bill.amount;
  document.getElementById('pay-bill-date').value = todayISO();
  const accSel = document.getElementById('pay-bill-account');
  const brlAccounts = Storage.getAccounts().filter((a) => (a.currency || 'BRL') === 'BRL');
  accSel.innerHTML =
    `<option value="">— nenhuma —</option>` +
    brlAccounts.map((a) => `<option value="${a.id}">${accountIcon(a)} ${a.name} (${Calc.fmtBRL(a.balance)})</option>`).join('');
  openModal('modal-pay-bill');
}

document.getElementById('btn-save-pay-bill').addEventListener('click', async () => {
  const billId = state.payingBillId;
  const bill = Storage.getBills().find((b) => b.id === billId);
  if (!bill) return;
  const amount = parseFloat(document.getElementById('pay-bill-amount').value);
  if (!amount || amount <= 0) {
    await appAlert('Informe um valor válido.');
    return;
  }
  const date = document.getElementById('pay-bill-date').value || todayISO();
  const accountId = document.getElementById('pay-bill-account').value || null;
  payBill(bill, amount, date, accountId);
  closeModal('modal-pay-bill');
  renderAll();
});

function payBill(bill, amount, date, accountId) {
  const month = Calc.currentMonthKey();
  if (bill.paidMonths.includes(month)) return;
  Storage.markBillPaid(bill.id, month);
  if (bill.isInvestment) {
    Storage.addInvestment({
      amount,
      assetClass: bill.invClass || 'Renda Fixa',
      name: bill.name,
      broker: bill.invBroker || '',
      date,
      movement: 'aporte',
      liquidity: bill.invLiquidity || 'Diária',
      rate: '',
      maturity: bill.invMaturity || null,
      currency: 'BRL',
      // Guarda a conta para que apagar o aporte devolva o valor ao saldo
      accountId: accountId || null,
    });
  } else {
    Storage.addTransaction({
      type: 'expense',
      amount,
      category: bill.category,
      date,
      description: `Conta: ${bill.name}`,
      paymentMethod: null,
      accountId,
      currency: 'BRL',
    });
  }
  if (accountId) {
    Storage.adjustAccountBalance(accountId, -amount);
  }
  renderAll();
}

// ==================== CONTAS/SALDOS ====================

function openAccountModal(editId, presetType) {
  state.editingAccountId = editId || null;
  const deleteBtn = document.getElementById('btn-delete-account');
  const currencies = Storage.getCurrencies();
  const currencySel = document.getElementById('account-currency');
  currencySel.innerHTML = currencies.map((c) => `<option value="${c.code}">${c.symbol} ${c.code}</option>`).join('');
  document.getElementById('account-currency-wrap').style.display = multiCurrencyOn() ? 'block' : 'none';

  if (editId) {
    const acc = Storage.getAccounts().find((a) => a.id === editId);
    if (!acc) return;
    document.getElementById('account-modal-title').textContent = 'Editar conta';
    document.getElementById('account-name').value = acc.name;
    document.getElementById('account-type').value = acc.type;
    document.getElementById('account-balance').value = acc.balance;
    currencySel.value = acc.currency || 'BRL';
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('account-modal-title').textContent = 'Nova conta ou carteira';
    document.getElementById('account-name').value = '';
    document.getElementById('account-type').value = presetType || 'banco';
    document.getElementById('account-balance').value = '';
    currencySel.value = 'BRL';
    deleteBtn.style.display = 'none';
  }
  openModal('modal-account');
}
document.getElementById('btn-add-account').addEventListener('click', () => openAccountModal());

document.getElementById('btn-save-account').addEventListener('click', async () => {
  const name = document.getElementById('account-name').value.trim();
  const type = document.getElementById('account-type').value;
  const balance = parseFloat(document.getElementById('account-balance').value) || 0;
  const currency = document.getElementById('account-currency').value || 'BRL';
  if (!name) {
    await appAlert('Dê um nome para a conta/carteira.');
    return;
  }
  let created = null;
  if (state.editingAccountId) {
    Storage.updateAccount(state.editingAccountId, { name, type, balance, currency });
  } else {
    created = Storage.addAccount({ name, type, balance, currency });
  }
  closeModal('modal-account');
  renderAll();
  // Quem criou o cofre a partir da transferência volta para ela com o cofre já escolhido
  const next = state.afterAccountSave;
  state.afterAccountSave = null;
  if (next && created) next(created);
});

document.getElementById('btn-delete-account').addEventListener('click', async () => {
  if (!state.editingAccountId) return;
  if (!(await appConfirm('Apagar esta conta/carteira? Lançamentos já registrados não serão apagados.', { danger: true }))) return;
  Storage.deleteAccount(state.editingAccountId);
  closeModal('modal-account');
  renderAll();
});

function renderAccounts() {
  const accounts = Storage.getAccounts();
  const brl = accounts.filter((a) => (a.currency || 'BRL') === 'BRL');
  const totalBRL = brl.reduce((s, a) => s + Number(a.balance), 0);
  const vaultBRL = brl.filter((a) => a.type === 'cofre').reduce((s, a) => s + Number(a.balance), 0);
  document.getElementById('accounts-total').textContent = maskCurrency(totalBRL);

  const byCurrency = {};
  accounts.forEach((a) => {
    const code = a.currency || 'BRL';
    if (code === 'BRL') return;
    byCurrency[code] = (byCurrency[code] || 0) + Number(a.balance);
  });
  document.getElementById('accounts-other-currencies').innerHTML =
    (vaultBRL > 0 ? `<div class="sub-line">🐷 ${maskCurrency(vaultBRL)} disso está guardado em cofres (fora do disponível)</div>` : '') +
    Object.entries(byCurrency)
      .map(([code, val]) => `<div class="sub-line">${fmtCurrency(val, code)} em ${code}</div>`)
      .join('');

  const listEl = document.getElementById('accounts-list');
  listEl.innerHTML = accounts.length
    ? accounts
        .map(
          (a) => `
      <div class="tx-item" data-edit-account="${a.id}" style="cursor:pointer;">
        <div class="tx-left">
          <div class="tx-icon">${accountIcon(a)}</div>
          <div class="tx-desc">${a.name}</div>
        </div>
        <div class="tx-amount income">${fmtCurrency(a.balance, a.currency)}</div>
      </div>`
        )
        .join('')
    : `<div class="empty-state">Nenhuma conta cadastrada. Adicione seus bancos e o dinheiro que você tem em casa.</div>`;

  listEl.querySelectorAll('[data-edit-account]').forEach((el) => {
    el.addEventListener('click', () => openAccountModal(el.dataset.editAccount));
  });
}

// ==================== TRANSFERIR / GUARDAR DINHEIRO ====================
// Move dinheiro entre contas do próprio usuário (banco → cofre, banco → banco...).
// Não é gasto nem receita: não entra nos totais do mês nem nos orçamentos.
// "Para um investimento" leva ao aporte com a conta de origem já escolhida.

const TRANSFER_TO_INVEST = '__invest';

function openTransferModal({ mode = 'transfer', toId = null } = {}) {
  const accounts = Storage.getAccounts();
  if (accounts.length === 0) {
    appAlert('Cadastre primeiro suas contas em Ajustes > Contas bancárias e carteira.');
    return;
  }
  state.transferMode = mode;
  document.getElementById('transfer-modal-title').textContent = mode === 'guardar' ? 'Guardar dinheiro' : 'Transferir entre contas';
  document.getElementById('transfer-amount').value = '';
  document.getElementById('transfer-desc').value = '';
  document.getElementById('transfer-date').value = todayISO();

  const fromSel = document.getElementById('transfer-from');
  const nonVault = accounts.filter((a) => a.type !== 'cofre');
  const defaultFrom = (nonVault.length ? nonVault : accounts).reduce((a, b) => (Number(b.balance) > Number(a.balance) ? b : a));
  fromSel.innerHTML = accounts
    .map((a) => `<option value="${a.id}">${accountIcon(a)} ${a.name} (${Calc.fmtMoney(a.balance, Storage.getCurrency(a.currency))})</option>`)
    .join('');
  fromSel.value = defaultFrom.id;
  renderTransferTo(toId);
  openModal('modal-transfer');
}

function renderTransferTo(preferredId) {
  const fromSel = document.getElementById('transfer-from');
  const from = Storage.getAccounts().find((a) => a.id === fromSel.value);
  const currency = from ? from.currency || 'BRL' : 'BRL';
  const targets = Storage.getAccounts().filter((a) => a.id !== fromSel.value && (a.currency || 'BRL') === currency);
  const toSel = document.getElementById('transfer-to');
  const current = preferredId || toSel.value;
  // No modo "guardar", cofres aparecem primeiro
  const ordered = state.transferMode === 'guardar' ? [...targets].sort((a, b) => (b.type === 'cofre') - (a.type === 'cofre')) : targets;
  toSel.innerHTML =
    ordered
      .map((a) => `<option value="${a.id}">${accountIcon(a)} ${a.name} (${Calc.fmtMoney(a.balance, Storage.getCurrency(a.currency))})</option>`)
      .join('') + `<option value="${TRANSFER_TO_INVEST}">📈 Um investimento (corretora, Tesouro, CDB…)</option>`;
  if (current && [...toSel.options].some((o) => o.value === current)) toSel.value = current;
  updateTransferHint();
}

function updateTransferHint() {
  const toVal = document.getElementById('transfer-to').value;
  const to = Storage.getAccounts().find((a) => a.id === toVal);
  const hasVault = Storage.getAccounts().some((a) => a.type === 'cofre');
  const hint = document.getElementById('transfer-hint');
  if (toVal === TRANSFER_TO_INVEST) hint.textContent = 'Você vai escolher o tipo de investimento e a corretora na próxima tela.';
  else if (to && to.type === 'cofre') hint.textContent = 'Dinheiro no cofre fica guardado e sai do "Disponível" da tela inicial.';
  else if (!hasVault) hint.textContent = 'Dica: crie um cofre (caixinha, reserva) para separar o que você está guardando.';
  else hint.textContent = '';
  document.getElementById('btn-save-transfer').textContent = toVal === TRANSFER_TO_INVEST ? 'Continuar para o aporte' : 'Transferir';
}

document.getElementById('transfer-from').addEventListener('change', () => renderTransferTo());
document.getElementById('transfer-to').addEventListener('change', updateTransferHint);
document.getElementById('btn-open-transfer').addEventListener('click', () => openTransferModal());
document.getElementById('btn-save-to-vault').addEventListener('click', () => openTransferModal({ mode: 'guardar' }));
document.getElementById('btn-save-to-invest').addEventListener('click', () => openInvModal());

document.getElementById('btn-transfer-new-vault').addEventListener('click', () => {
  closeModal('modal-transfer');
  const mode = state.transferMode;
  state.afterAccountSave = (created) => openTransferModal({ mode, toId: created.id });
  openAccountModal(null, 'cofre');
});

document.getElementById('btn-save-transfer').addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('transfer-amount').value);
  const fromId = document.getElementById('transfer-from').value;
  const toId = document.getElementById('transfer-to').value;
  if (!amount || amount <= 0) {
    await appAlert('Informe um valor válido.');
    return;
  }
  if (!toId) {
    await appAlert('Escolha para onde vai o dinheiro. Se não tiver outra conta, crie um cofre.');
    return;
  }
  if (toId === TRANSFER_TO_INVEST) {
    closeModal('modal-transfer');
    openInvModal();
    const from = Storage.getAccounts().find((a) => a.id === fromId);
    state.invCurrency = from ? from.currency || 'BRL' : 'BRL';
    state.invAccountId = fromId;
    renderInvCurrencyChips();
    document.getElementById('inv-amount').value = amount;
    return;
  }
  const accounts = Storage.getAccounts();
  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  if (!from || !to) return;
  if (Number(from.balance) < amount) {
    const ok = await appConfirm(
      `${from.name} tem ${Calc.fmtMoney(from.balance, Storage.getCurrency(from.currency))}. Transferir ${Calc.fmtMoney(amount, Storage.getCurrency(from.currency))} deixa o saldo negativo. Continuar?`
    );
    if (!ok) return;
  }
  const desc = document.getElementById('transfer-desc').value.trim();
  Storage.addTransaction({
    type: 'transfer',
    amount,
    date: document.getElementById('transfer-date').value || todayISO(),
    description: desc || `${from.name} → ${to.name}`,
    accountId: from.id,
    toAccountId: to.id,
    category: null,
    paymentMethod: null,
    currency: from.currency || 'BRL',
  });
  Storage.adjustAccountBalance(from.id, -amount);
  Storage.adjustAccountBalance(to.id, amount);
  closeModal('modal-transfer');
  renderAll();
});

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

function openCardModal(editId) {
  state.editingCardId = editId || null;
  const deleteBtn = document.getElementById('btn-delete-card');
  if (editId) {
    const card = Storage.getCards().find((c) => c.id === editId);
    if (!card) return;
    document.getElementById('card-modal-title').textContent = 'Editar cartão';
    document.getElementById('card-name').value = card.name;
    document.getElementById('card-due-day').value = card.dueDay || '';
    document.getElementById('card-limit').value = card.limit || '';
    document.getElementById('card-deposit').value = card.monthlyDeposit || '';
    document.getElementById('card-balance').value = card.balance || '';
    document.getElementById('card-auto-recharge').checked = !!card.autoRecharge;
    const infoEl = document.getElementById('card-recharge-info');
    const last = (card.rechargedMonths || []).slice().sort().pop();
    if (last) {
      infoEl.textContent = `Última recarga creditada: ${Calc.monthLabel(last)}.`;
      infoEl.style.display = 'block';
    } else {
      infoEl.style.display = 'none';
    }
    setCardKind(card.kind);
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('card-modal-title').textContent = 'Novo cartão';
    document.getElementById('card-name').value = '';
    document.getElementById('card-due-day').value = '';
    document.getElementById('card-limit').value = '';
    document.getElementById('card-deposit').value = '';
    document.getElementById('card-balance').value = '';
    document.getElementById('card-auto-recharge').checked = false;
    document.getElementById('card-recharge-info').style.display = 'none';
    setCardKind('credito');
    deleteBtn.style.display = 'none';
  }
  openModal('modal-card');
}
document.getElementById('btn-add-card').addEventListener('click', () => openCardModal());

document.getElementById('btn-save-card').addEventListener('click', async () => {
  const name = document.getElementById('card-name').value.trim();
  if (!name) {
    await appAlert('Dê um nome para o cartão.');
    return;
  }
  let patch;
  if (state.cardKind === 'credito') {
    const dueDay = parseInt(document.getElementById('card-due-day').value);
    const limit = parseFloat(document.getElementById('card-limit').value) || 0;
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      await appAlert('Informe um dia de vencimento válido (1-31).');
      return;
    }
    patch = { name, kind: 'credito', dueDay, limit };
  } else {
    const monthlyDeposit = parseFloat(document.getElementById('card-deposit').value) || 0;
    const balance = parseFloat(document.getElementById('card-balance').value) || 0;
    const autoRecharge = document.getElementById('card-auto-recharge').checked;
    if (autoRecharge && monthlyDeposit <= 0) {
      await appAlert('Para recarregar sozinho todo mês, informe o valor que cai por mês.');
      return;
    }
    patch = { name, kind: state.cardKind, monthlyDeposit, balance, autoRecharge };
    // rechargeSince marca de onde a varredura começa. Só é gravado ao LIGAR a recarga,
    // e sempre no mês corrente: ligar hoje nunca credita meses passados de uma vez.
    const existing = state.editingCardId ? Storage.getCards().find((c) => c.id === state.editingCardId) : null;
    if (autoRecharge && !(existing && existing.autoRecharge)) {
      patch.rechargeSince = Calc.currentMonthKey();
    }
  }
  if (state.editingCardId) {
    Storage.updateCard(state.editingCardId, patch);
  } else {
    Storage.addCard(patch);
  }
  closeModal('modal-card');
  // Ligar a recarga no próprio último dia do mês já credita na hora, sem esperar
  // o app ser reaberto.
  applyPendingRecharges();
  renderAll();
});

document.getElementById('btn-delete-card').addEventListener('click', async () => {
  if (!state.editingCardId) return;
  if (!(await appConfirm('Apagar este cartão? Lançamentos já registrados não serão apagados.', { danger: true }))) return;
  Storage.deleteCard(state.editingCardId);
  closeModal('modal-card');
  renderAll();
});

// Se a recarga deste mês já caiu, a próxima é a do mês que vem — senão a data
// mostrada seria uma que já passou.
function nextRechargeLabel(card) {
  const current = Calc.currentMonthKey();
  const done = (card.rechargedMonths || []).includes(current);
  const month = done ? Calc.shiftMonth(current, 1) : current;
  return Calc.parseLocalDate(Calc.lastDayOfMonth(month)).toLocaleDateString('pt-BR');
}

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
        // Aqui a pergunta é "quanto do limite está preso", então entra o comprometido
        // (mês atual + parcelas futuras) — diferente da fatura que vence agora.
        const { committed, invoice, available } = Calc.cardAvailableLimit(c, transactions);
        const outstanding = committed;
        const pct = c.limit > 0 ? (outstanding / c.limit) * 100 : 0;
        const statusClass = pct > 100 ? 'status-ultrapassado' : pct >= 80 ? 'status-aviso' : 'status-ok';
        const paid = (c.paidMonths || []).includes(Calc.currentMonthKey());
        return `
        <div class="cat-row" style="display:block;">
          <div data-edit-card="${c.id}" style="cursor:pointer;">
            <div class="cat-name">${kindInfo.icon} ${c.name}${paid ? ' · ✅ paga este mês' : ''}</div>
            <div class="cat-values">Vence dia ${c.dueDay} · ${maskCurrency(outstanding)} de ${maskCurrency(c.limit)} comprometido</div>
            <div class="sub-line">Fatura deste mês: ${maskCurrency(invoice)}</div>
            <div class="progress-bar"><div class="progress-fill ${statusClass}" style="width:${Math.min(Math.max(pct, 0), 100)}%"></div></div>
            <div class="sub-line" style="margin-top:4px;">Disponível: ${maskCurrency(available)}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
            ${outstanding > 0 && !paid ? `<button class="chip" data-pay-card="${c.id}">💰 Marcar fatura como paga</button>` : ''}
            <button class="chip" data-card-initial="${c.id}">📋 Lançar situação atual</button>
          </div>
        </div>`;
      }
      return `
      <div class="tx-item" data-edit-card="${c.id}" style="cursor:pointer;">
        <div class="tx-left">
          <div class="tx-icon">${kindInfo.icon}</div>
          <div>
            <div class="tx-desc">${c.name}</div>
            <div class="tx-date">${kindInfo.label}${c.monthlyDeposit ? ' · cai ' + maskCurrency(c.monthlyDeposit) + '/mês' : ''}${c.autoRecharge ? ' · 🔄 automática' : ''}</div>
            ${c.autoRecharge && c.monthlyDeposit > 0 ? `<div class="sub-line">Próxima recarga: ${nextRechargeLabel(c)}</div>` : ''}
          </div>
        </div>
        <div class="tx-amount income">${maskCurrency(c.balance)}</div>
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('[data-edit-card]').forEach((el) => {
    el.addEventListener('click', () => openCardModal(el.dataset.editCard));
  });
  listEl.querySelectorAll('[data-pay-card]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openPayCardModal(el.dataset.payCard);
    });
  });
  listEl.querySelectorAll('[data-card-initial]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openCardInitialModal(el.dataset.cardInitial);
    });
  });
}

// ==================== RECARGA AUTOMÁTICA DO VALE (alimentação/refeição) ====================
// O vale cai no último dia do mês. Duas coisas acontecem juntas, e as duas importam:
//   1. o saldo do cartão sobe;
//   2. entra uma receita do mês, porque o vale É renda — parte da alimentação sai dele,
//      e sem contar isso o "Recebido" do mês fica menor do que a realidade.
//
// Não existe servidor nem agendador: o app só roda quando é aberto. Então em vez de
// "executar no dia 30", a regra é "ao abrir, credite todo mês fechado que ainda não foi
// creditado". Abrir o app no dia 5 recupera a recarga do dia 30 que ninguém rodou.
const RECHARGE_CATEGORY = 'Benefício (VA/VR)';

function applyPendingRecharges() {
  const today = Calc.toLocalISODate(new Date());
  let creditedCount = 0;
  let creditedTotal = 0;

  Storage.getCards().forEach((card) => {
    const pending = Calc.pendingRechargeMonths(card, today);
    if (pending.length === 0) return;

    Storage.addIncomeCategory(RECHARGE_CATEGORY, '🍽️');

    pending.forEach((month) => {
      const amount = Number(card.monthlyDeposit);
      // A receita é datada no último dia do mês a que ela pertence, não em hoje.
      // Assim uma recarga recuperada com atraso entra no mês certo do histórico.
      Storage.addTransaction({
        type: 'income',
        amount,
        category: RECHARGE_CATEGORY,
        date: Calc.lastDayOfMonth(month),
        description: `Recarga automática · ${card.name}`,
        paymentMethod: null,
        cardId: card.id,
        cardName: card.name,
        installmentLabel: null,
        currency: 'BRL',
        autoRecharge: true,
      });
      Storage.adjustCardBalance(card.id, amount);
      Storage.markCardRecharged(card.id, month);
      creditedCount++;
      creditedTotal += amount;
    });
  });

  return { creditedCount, creditedTotal };
}

// ==================== RECEITAS RECORRENTES (salário, aluguel recebido) ====================
// Mesma ideia da recarga do vale: sem servidor, o app lança ao ser aberto tudo que
// já deveria ter caído. Evita relançar o salário na mão todo mês.

function applyPendingIncomes() {
  const today = Calc.toLocalISODate(new Date());
  let count = 0;
  let total = 0;

  Storage.getRecurringIncomes().forEach((item) => {
    Calc.pendingIncomeMonths(item, today).forEach(({ month, date }) => {
      Storage.addIncomeCategory(item.category, '💼');
      const tx = {
        type: 'income',
        amount: Number(item.amount),
        category: item.category,
        date,
        description: item.name,
        paymentMethod: null,
        cardId: null,
        cardName: null,
        installmentLabel: null,
        accountId: item.accountId || null,
        currency: 'BRL',
        recurringId: item.id,
      };
      Storage.addTransaction(tx);
      if (item.accountId) Storage.adjustAccountBalance(item.accountId, Number(item.amount));
      Storage.markRecurringIncomePosted(item.id, month);
      count++;
      total += Number(item.amount);
    });
  });

  return { count, total };
}

function openRecurringModal(editId) {
  state.editingRecurringId = editId || null;
  const accSel = document.getElementById('rec-account');
  const brl = Storage.getAccounts().filter((a) => (a.currency || 'BRL') === 'BRL');
  accSel.innerHTML = `<option value="">— nenhuma —</option>` + brl.map((a) => `<option value="${a.id}">${a.name}</option>`).join('');

  const catSel = document.getElementById('rec-category');
  catSel.innerHTML = Storage.getIncomeCategories().map((c) => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');

  const del = document.getElementById('btn-delete-recurring');
  if (editId) {
    const item = Storage.getRecurringIncomes().find((r) => r.id === editId);
    if (!item) return;
    document.getElementById('rec-modal-title').textContent = 'Editar receita recorrente';
    document.getElementById('rec-name').value = item.name;
    document.getElementById('rec-amount').value = item.amount;
    document.getElementById('rec-day').value = item.payDay;
    catSel.value = item.category;
    accSel.value = item.accountId || '';
    del.style.display = 'block';
  } else {
    document.getElementById('rec-modal-title').textContent = 'Nova receita recorrente';
    document.getElementById('rec-name').value = '';
    document.getElementById('rec-amount').value = '';
    document.getElementById('rec-day').value = '';
    catSel.value = 'Salário';
    accSel.value = '';
    del.style.display = 'none';
  }
  openModal('modal-recurring');
}
document.getElementById('btn-add-recurring').addEventListener('click', () => openRecurringModal());

document.getElementById('btn-save-recurring').addEventListener('click', async () => {
  const name = document.getElementById('rec-name').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  const payDay = parseInt(document.getElementById('rec-day').value);
  if (!name || !amount || amount <= 0 || !payDay || payDay < 1 || payDay > 31) {
    await appAlert('Preencha nome, valor e um dia de recebimento válido (1-31).');
    return;
  }
  const patch = {
    name,
    amount,
    payDay,
    category: document.getElementById('rec-category').value,
    accountId: document.getElementById('rec-account').value || null,
  };
  if (state.editingRecurringId) {
    Storage.updateRecurringIncome(state.editingRecurringId, patch);
  } else {
    // since = mês atual: criar hoje não gera meses retroativos de uma vez.
    Storage.addRecurringIncome({ ...patch, since: Calc.currentMonthKey() });
  }
  closeModal('modal-recurring');
  applyPendingIncomes();
  renderAll();
});

document.getElementById('btn-delete-recurring').addEventListener('click', async () => {
  if (!state.editingRecurringId) return;
  if (!(await appConfirm('Apagar esta receita recorrente? Os lançamentos já feitos continuam no histórico.', { danger: true }))) return;
  Storage.deleteRecurringIncome(state.editingRecurringId);
  closeModal('modal-recurring');
  renderAll();
});

function renderRecurringIncomes() {
  const listEl = document.getElementById('recurring-list');
  if (!listEl) return;
  const items = Storage.getRecurringIncomes();
  if (items.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nenhuma receita recorrente. Cadastre seu salário e o app lança sozinho todo mês.</div>`;
    return;
  }
  listEl.innerHTML = items
    .map((r) => {
      const jaCaiu = (r.postedMonths || []).includes(Calc.currentMonthKey());
      return `
      <div class="tx-item" data-edit-rec="${r.id}" style="cursor:pointer;">
        <div class="tx-left">
          <div class="tx-icon">${catIcon(r.category)}</div>
          <div>
            <div class="tx-desc">${r.name}</div>
            <div class="tx-date">Todo dia ${r.payDay} · ${r.category}${jaCaiu ? ' · ✅ lançado este mês' : ''}</div>
          </div>
        </div>
        <div class="tx-amount income">${maskCurrency(r.amount)}</div>
      </div>`;
    })
    .join('');
  listEl.querySelectorAll('[data-edit-rec]').forEach((el) => {
    el.addEventListener('click', () => openRecurringModal(el.dataset.editRec));
  });
}

// ==================== PAGAR FATURA DO CARTÃO (transferência, não gasto novo) ====================
// As compras que geraram a fatura já foram lançadas nas categorias certas quando
// parceladas. Marcar a fatura como paga só tira o dinheiro do banco escolhido —
// não soma de novo no total de gastos nem nos orçamentos.

function openPayCardModal(cardId) {
  const card = Storage.getCards().find((c) => c.id === cardId);
  if (!card) return;
  const { outstanding } = Calc.cardAvailableLimit(card, Storage.getTransactions());
  state.payingCardId = cardId;
  document.getElementById('pay-card-name').textContent = card.name;
  document.getElementById('pay-card-outstanding').textContent = `Fatura em aberto: ${Calc.fmtBRL(outstanding)}`;
  document.getElementById('pay-card-amount').value = outstanding.toFixed(2);
  document.getElementById('pay-card-date').value = todayISO();
  const accSel = document.getElementById('pay-card-account');
  const brlAccounts = Storage.getAccounts().filter((a) => (a.currency || 'BRL') === 'BRL');
  accSel.innerHTML = brlAccounts.length
    ? brlAccounts.map((a) => `<option value="${a.id}">${accountIcon(a)} ${a.name} (${Calc.fmtBRL(a.balance)})</option>`).join('')
    : `<option value="">Nenhuma conta cadastrada — adicione em Mais</option>`;
  openModal('modal-pay-card');
}

document.getElementById('btn-save-pay-card').addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('pay-card-amount').value);
  if (!amount || amount <= 0) {
    await appAlert('Informe um valor válido.');
    return;
  }
  const accountId = document.getElementById('pay-card-account').value;
  if (!accountId) {
    await appAlert('Escolha de qual conta saiu o pagamento.');
    return;
  }
  const card = Storage.getCards().find((c) => c.id === state.payingCardId);
  const date = document.getElementById('pay-card-date').value || todayISO();
  Storage.addTransaction({
    type: 'transfer',
    amount,
    date,
    description: `Pagamento fatura: ${card.name}`,
    cardId: card.id,
    accountId,
    category: null,
    paymentMethod: null,
    currency: 'BRL',
  });
  Storage.adjustAccountBalance(accountId, -amount);
  Storage.markCardBillPaid(card.id, Calc.currentMonthKey());
  closeModal('modal-pay-card');
  renderAll();
});

// ==================== CONFIGURAÇÃO INICIAL DO CARTÃO ====================
// Pra quem já usa o cartão e não quer lançar compra por compra: informa a
// fatura atual e o total que ainda falta pagar nos próximos meses de uma vez.

function openCardInitialModal(cardId) {
  const card = Storage.getCards().find((c) => c.id === cardId);
  if (!card) return;
  state.cardInitialId = cardId;
  document.getElementById('cardinitial-name').textContent = card.name;
  document.getElementById('cardinitial-current').value = '';
  document.getElementById('cardinitial-future-total').value = '';
  document.getElementById('cardinitial-future-months').value = 1;
  openModal('modal-card-initial');
}

document.getElementById('btn-save-card-initial').addEventListener('click', async () => {
  const card = Storage.getCards().find((c) => c.id === state.cardInitialId);
  if (!card) return;
  const current = parseFloat(document.getElementById('cardinitial-current').value) || 0;
  const futureTotal = parseFloat(document.getElementById('cardinitial-future-total').value) || 0;
  const futureMonths = Math.max(1, parseInt(document.getElementById('cardinitial-future-months').value) || 1);

  if (current <= 0 && futureTotal <= 0) {
    await appAlert('Informe pelo menos um valor.');
    return;
  }

  const today = todayISO();
  if (current > 0) {
    Storage.addTransaction({
      type: 'expense',
      amount: current,
      category: 'Outros',
      date: today,
      description: 'Saldo inicial - fatura atual',
      paymentMethod: 'Cartão de Crédito',
      cardId: card.id,
      cardName: card.name,
      installmentLabel: null,
      currency: 'BRL',
    });
  }
  if (futureTotal > 0) {
    const parts = Calc.splitInstallments(futureTotal, futureMonths);
    parts.forEach((partAmount, i) => {
      Storage.addTransaction({
        type: 'expense',
        amount: partAmount,
        category: 'Outros',
        date: Calc.addMonthsToDate(today, i + 1),
        description: 'Saldo inicial - parcela futura',
        paymentMethod: 'Cartão de Crédito',
        cardId: card.id,
        cardName: card.name,
        installmentLabel: `${i + 1}/${futureMonths}`,
        currency: 'BRL',
      });
    });
  }
  closeModal('modal-card-initial');
  renderAll();
  await appAlert('Situação atual do cartão lançada!');
});

// ==================== CATEGORIAS DE GASTO ====================

function openCategoryModal(name) {
  state.editingCategoryName = name || null;
  const deleteBtn = document.getElementById('btn-delete-category');
  if (name) {
    const cat = Storage.getCategories().find((c) => c.name === name);
    if (!cat) return;
    document.getElementById('category-modal-title').textContent = 'Editar categoria';
    document.getElementById('category-icon').value = cat.icon;
    document.getElementById('category-name').value = cat.name;
    document.getElementById('category-pct').value = cat.recommendedPct != null ? cat.recommendedPct : '';
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('category-modal-title').textContent = 'Nova categoria de gasto';
    document.getElementById('category-icon').value = '🏷️';
    document.getElementById('category-name').value = '';
    document.getElementById('category-pct').value = 5;
    deleteBtn.style.display = 'none';
  }
  openModal('modal-category');
}
document.getElementById('btn-add-category').addEventListener('click', () => openCategoryModal());

document.getElementById('btn-save-category').addEventListener('click', async () => {
  const name = document.getElementById('category-name').value.trim();
  const icon = document.getElementById('category-icon').value.trim() || '🏷️';
  const pct = parseFloat(document.getElementById('category-pct').value) || 0;
  if (!name) {
    await appAlert('Dê um nome para a categoria.');
    return;
  }
  if (state.editingCategoryName) {
    Storage.updateCategoryFull(state.editingCategoryName, { name, icon, recommendedPct: pct });
  } else {
    Storage.addCategory(name, icon);
    Storage.setCategoryRecommendedPct(name, pct);
  }
  closeModal('modal-category');
  renderAll();
});

document.getElementById('btn-delete-category').addEventListener('click', async () => {
  if (!state.editingCategoryName) return;
  if (!(await appConfirm('Apagar esta categoria? Lançamentos já feitos com ela continuam guardados, só não vai mais aparecer para escolher.', { danger: true }))) return;
  Storage.deleteCategory(state.editingCategoryName);
  closeModal('modal-category');
  renderAll();
});

function renderExpenseCategories() {
  const categories = Storage.getCategories();
  const listEl = document.getElementById('expense-categories-list');
  listEl.innerHTML = categories
    .map(
      (c) => `
    <div class="cat-row" data-edit-category="${c.name}" style="cursor:pointer;">
      <div class="cat-name">${c.icon} ${c.name}</div>
      <div class="cat-values">${c.recommendedPct != null ? c.recommendedPct + '%' : ''}</div>
    </div>`
    )
    .join('');
  listEl.querySelectorAll('[data-edit-category]').forEach((el) => {
    el.addEventListener('click', () => openCategoryModal(el.dataset.editCategory));
  });
}

// ==================== TIPOS DE RECEITA ====================

function openIncomeCategoryModal(name) {
  state.editingIncomeCategoryName = name || null;
  const deleteBtn = document.getElementById('btn-delete-income-category');
  if (name) {
    const cat = Storage.getIncomeCategories().find((c) => c.name === name);
    if (!cat) return;
    document.getElementById('income-category-modal-title').textContent = 'Editar tipo de receita';
    document.getElementById('income-category-icon').value = cat.icon;
    document.getElementById('income-category-name').value = cat.name;
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('income-category-modal-title').textContent = 'Novo tipo de receita';
    document.getElementById('income-category-icon').value = '➕';
    document.getElementById('income-category-name').value = '';
    deleteBtn.style.display = 'none';
  }
  openModal('modal-income-category');
}
document.getElementById('btn-add-income-category').addEventListener('click', () => openIncomeCategoryModal());

document.getElementById('btn-save-income-category').addEventListener('click', async () => {
  const name = document.getElementById('income-category-name').value.trim();
  const icon = document.getElementById('income-category-icon').value.trim() || '➕';
  if (!name) {
    await appAlert('Dê um nome para o tipo de receita.');
    return;
  }
  if (state.editingIncomeCategoryName) {
    Storage.updateIncomeCategoryFull(state.editingIncomeCategoryName, { name, icon });
  } else {
    Storage.addIncomeCategory(name, icon);
  }
  closeModal('modal-income-category');
  renderAll();
});

document.getElementById('btn-delete-income-category').addEventListener('click', async () => {
  if (!state.editingIncomeCategoryName) return;
  if (!(await appConfirm('Apagar este tipo de receita?', { danger: true }))) return;
  Storage.deleteIncomeCategory(state.editingIncomeCategoryName);
  closeModal('modal-income-category');
  renderAll();
});

function renderIncomeCategories() {
  const categories = Storage.getIncomeCategories();
  const listEl = document.getElementById('income-categories-list');
  listEl.innerHTML = categories
    .map(
      (c) => `
    <div class="cat-row" data-edit-income-category="${c.name}" style="cursor:pointer;">
      <div class="cat-name">${c.icon} ${c.name}</div>
    </div>`
    )
    .join('');
  listEl.querySelectorAll('[data-edit-income-category]').forEach((el) => {
    el.addEventListener('click', () => openIncomeCategoryModal(el.dataset.editIncomeCategory));
  });
}

// ==================== MOEDAS ====================

function openCurrencyModal(code) {
  state.editingCurrencyCode = code || null;
  const deleteBtn = document.getElementById('btn-delete-currency');
  if (code) {
    const cur = Storage.getCurrency(code);
    document.getElementById('currency-modal-title').textContent = 'Editar moeda';
    document.getElementById('currency-code').value = cur.code;
    document.getElementById('currency-symbol').value = cur.symbol;
    document.getElementById('currency-decimals').value = cur.decimals;
    deleteBtn.style.display = code === 'BRL' ? 'none' : 'block';
  } else {
    document.getElementById('currency-modal-title').textContent = 'Nova moeda';
    document.getElementById('currency-code').value = '';
    document.getElementById('currency-symbol').value = '';
    document.getElementById('currency-decimals').value = 2;
    deleteBtn.style.display = 'none';
  }
  openModal('modal-currency');
}
document.getElementById('btn-add-currency').addEventListener('click', () => openCurrencyModal());

document.getElementById('btn-save-currency').addEventListener('click', async () => {
  const code = document.getElementById('currency-code').value.trim().toUpperCase();
  const symbol = document.getElementById('currency-symbol').value.trim();
  const decimals = parseInt(document.getElementById('currency-decimals').value);
  if (!code || !symbol) {
    await appAlert('Preencha código e símbolo da moeda.');
    return;
  }
  if (state.editingCurrencyCode) {
    Storage.updateCurrencyFull(state.editingCurrencyCode, { code, symbol, decimals });
  } else {
    if (Storage.getCurrencies().find((c) => c.code === code)) {
      await appAlert('Já existe uma moeda com esse código.');
      return;
    }
    Storage.addCurrency(code, symbol, decimals);
  }
  closeModal('modal-currency');
  renderAll();
});

document.getElementById('btn-delete-currency').addEventListener('click', async () => {
  if (!state.editingCurrencyCode || state.editingCurrencyCode === 'BRL') return;
  if (!(await appConfirm('Apagar esta moeda? Lançamentos já feitos nela continuam guardados, só não vai mais aparecer para escolher.', { danger: true }))) return;
  Storage.deleteCurrency(state.editingCurrencyCode);
  closeModal('modal-currency');
  renderAll();
});

document.getElementById('toggle-multi-currency').addEventListener('change', (e) => {
  state.multiCurrency = e.target.checked;
  localStorage.setItem('finapp_multi_currency', state.multiCurrency ? '1' : '0');
  document.getElementById('currencies-section').style.display = state.multiCurrency ? 'block' : 'none';
});

function renderCurrenciesList() {
  document.getElementById('toggle-multi-currency').checked = state.multiCurrency;
  document.getElementById('currencies-section').style.display = state.multiCurrency ? 'block' : 'none';

  const currencies = Storage.getCurrencies();
  const listEl = document.getElementById('currencies-list');
  listEl.innerHTML = currencies
    .map(
      (c) => `
    <div class="cat-row" data-edit-currency="${c.code}" style="cursor:pointer;">
      <div class="cat-name">${c.symbol} ${c.code}</div>
      <div class="cat-values">${c.decimals} ${c.decimals === 1 ? 'casa decimal' : 'casas decimais'}</div>
    </div>`
    )
    .join('');
  listEl.querySelectorAll('[data-edit-currency]').forEach((el) => {
    el.addEventListener('click', () => openCurrencyModal(el.dataset.editCurrency));
  });
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

document.getElementById('btn-calc-simulate').addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('sim-amount').value);
  if (!amount || amount <= 0) {
    await appAlert('Informe um valor válido.');
    return;
  }
  const installments =
    state.simPayment === 'Cartão de Crédito' ? Math.max(1, parseInt(document.getElementById('sim-installments').value) || 1) : 1;

  const month = Calc.currentMonthKey();
  const transactions = Storage.getTransactions();
  const budgets = Storage.getBudgetsForMonth(month);
  const budgetStatuses = Calc.budgetStatus(budgets, transactions, month, Storage.getBills());
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
function renderOnboarding() {
  const card = document.getElementById('onboarding-card');
  if (localStorage.getItem('finapp_onboarding_dismissed') === '1') {
    card.style.display = 'none';
    return;
  }

  const profile = Storage.getProfile();
  const hasIncome = (profile.incomeNet || 0) > 0;
  const hasAccountsOrCards = Storage.getAccounts().length > 0 || Storage.getCards().length > 0;
  const hasTransaction = Storage.getTransactions().length > 0;

  if (hasIncome && hasAccountsOrCards && hasTransaction) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  const steps = [
    { done: hasIncome, label: 'Configure sua renda', action: 'profile' },
    { done: hasAccountsOrCards, label: 'Cadastre uma conta ou cartão', action: 'cadastro' },
    { done: hasTransaction, label: 'Registre seu primeiro gasto', action: 'tx' },
  ];
  document.getElementById('onboarding-steps').innerHTML = steps
    .map(
      (s) => `
    <div class="cat-row" ${s.done ? '' : `data-onboarding-action="${s.action}" style="cursor:pointer;"`}>
      <div class="cat-name">${s.done ? '✅' : '⬜'} ${s.label}</div>
      ${s.done ? '' : '<div class="cat-values">›</div>'}
    </div>`
    )
    .join('');
  document.querySelectorAll('[data-onboarding-action]').forEach((el) => {
    el.addEventListener('click', () => {
      const action = el.dataset.onboardingAction;
      if (action === 'profile') {
        showScreen('more');
        document.getElementById('section-profile').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'cadastro') {
        showScreen('more');
        document.getElementById('section-accounts').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'tx') {
        openTxModal();
      }
    });
  });
}
document.getElementById('btn-dismiss-onboarding').addEventListener('click', () => {
  localStorage.setItem('finapp_onboarding_dismissed', '1');
  document.getElementById('onboarding-card').style.display = 'none';
});

function openAlertsModal() {
  const alerts = state.dashAlerts || [];
  const listEl = document.getElementById('alerts-list');
  listEl.innerHTML = alerts.length
    ? alerts
        .map((a) => {
          const payBtn = a.billId
            ? `<button class="chip" data-dash-pay-bill="${a.billId}" style="margin-top:8px;">💰 Marcar como paga</button>`
            : a.cardId
            ? `<button class="chip" data-dash-pay-card="${a.cardId}" style="margin-top:8px;">💰 Marcar fatura como paga</button>`
            : '';
          return `<div class="alert ${a.severity}"><div>${a.message}</div>${payBtn}</div>`;
        })
        .join('')
    : `<div class="empty-state">Nenhum alerta agora. 🎉</div>`;
  listEl.querySelectorAll('[data-dash-pay-bill]').forEach((el) => {
    el.addEventListener('click', () => {
      closeModal('modal-alerts');
      openPayBillModal(el.dataset.dashPayBill);
    });
  });
  listEl.querySelectorAll('[data-dash-pay-card]').forEach((el) => {
    el.addEventListener('click', () => {
      closeModal('modal-alerts');
      openPayCardModal(el.dataset.dashPayCard);
    });
  });
  openModal('modal-alerts');
}

// Barra de orçamento que mostra o estouro inteiro: a escala vai até o maior entre
// limite e previsto, então 150% aparece como 150% (e não travado em 100%), com
// uma marca onde fica o limite. A parte listrada são contas fixas que ainda vão vencer.
function budgetProgressHTML(statuses) {
  return statuses
    .map((b) => {
      const scale = Math.max(b.limitAmount, b.projected, 0.01);
      const spentW = (b.spent / scale) * 100;
      const committedW = (b.committed / scale) * 100;
      const limitPos = (b.limitAmount / scale) * 100;
      const over = b.projected > b.limitAmount;
      const statusClass = b.status === 'OK' ? 'status-ok' : b.status === 'AVISO' ? 'status-aviso' : 'status-ultrapassado';
      const projClass = b.projectedStatus === 'ULTRAPASSADO' ? 'status-ultrapassado' : b.projectedStatus === 'AVISO' ? 'status-aviso' : 'status-ok';
      const diff = Math.abs(b.limitAmount - b.projected);
      const diffPct = b.limitAmount > 0 ? Math.abs(b.projectedPercent - 100) : 0;
      const verdict = over
        ? `<span class="budget-verdict over">${b.committed > 0 && b.spent <= b.limitAmount ? 'Vai estourar' : 'Estourou'} ${maskCurrency(diff)} (${diffPct.toFixed(0)}% acima)</span>`
        : `<span class="budget-verdict ok">Restam ${maskCurrency(diff)} (${diffPct.toFixed(0)}% do limite)</span>`;
      const committedLine =
        b.committed > 0
          ? `<div class="sub-line">+ ${maskCurrency(b.committed)} em contas a vencer → previsão ${maskCurrency(b.projected)} (${b.projectedPercent.toFixed(0)}%)</div>`
          : '';
      return `
      <div class="cat-row budget-progress-row">
        <div class="budget-progress-head">
          <div class="cat-name">${catIcon(b.category)} ${b.category}</div>
          <div class="cat-values"><strong>${maskCurrency(b.spent)}</strong> de ${maskCurrency(b.limitAmount)} · ${b.percent.toFixed(0)}%</div>
        </div>
        <div class="progress-bar budget-bar" role="img" aria-label="${b.category}: ${b.percent.toFixed(0)}% gasto, previsão ${b.projectedPercent.toFixed(0)}%">
          <div class="progress-fill ${statusClass}" style="width:${spentW}%"></div>
          ${committedW > 0 ? `<div class="progress-committed ${projClass}" style="left:${spentW}%;width:${committedW}%"></div>` : ''}
          ${over ? `<div class="progress-limit" style="left:${limitPos}%"></div>` : ''}
        </div>
        ${committedLine}
        <div class="sub-line">${verdict}</div>
      </div>`;
    })
    .join('');
}

// Monta as entradas do plano de economia a partir do que está salvo
function buildSavingsPlan() {
  const profile = Storage.getProfile();
  const recurring = Storage.getRecurringIncomes();
  const recurringTotal = recurring.filter((r) => r.active !== false && (r.currency || 'BRL') === 'BRL').reduce((s, r) => s + Number(r.amount || 0), 0);
  const income = profile.incomeNet > 0 ? profile.incomeNet : recurringTotal;
  if (!(income > 0)) return null;

  const transactions = Storage.getTransactions();
  const bills = Storage.getBills().filter((b) => b.active !== false);
  const fixedBills = bills.filter((b) => !b.isInvestment).reduce((s, b) => s + Number(b.amount || 0), 0);
  const investmentBills = bills.filter((b) => b.isInvestment).reduce((s, b) => s + Number(b.amount || 0), 0);
  const month = Calc.currentMonthKey();
  const creditIds = new Set(Storage.getCards().filter((c) => c.kind === 'credito').map((c) => c.id));
  const installments = transactions
    .filter((t) => t.type === 'expense' && creditIds.has(t.cardId) && t.installmentLabel && Calc.monthKey(t.date) === month && (t.currency || 'BRL') === 'BRL')
    .reduce((s, t) => s + Number(t.amount), 0);

  // Gasto variável médio por categoria nos últimos 3 meses fechados, sem as contas fixas
  const variableByCategory = {};
  let monthsWithData = 0;
  for (let i = 1; i <= 3; i++) {
    const m = Calc.shiftMonth(month, -i);
    const list = Calc.transactionsForMonth(transactions, m).filter((t) => t.type === 'expense' && (t.currency || 'BRL') === 'BRL');
    if (!list.length) continue;
    monthsWithData++;
    list
      .filter((t) => !(t.description || '').startsWith('Conta: '))
      .forEach((t) => {
        variableByCategory[t.category] = (variableByCategory[t.category] || 0) + Number(t.amount);
      });
  }
  if (monthsWithData) Object.keys(variableByCategory).forEach((k) => (variableByCategory[k] /= monthsWithData));

  const recommendedPct = {};
  Storage.getCategories().forEach((c) => (recommendedPct[c.name] = c.recommendedPct));
  const avg = Calc.averageMonthlyExpenses(transactions, 3);
  const emergencyTarget = Calc.emergencyFundTarget(avg !== null ? avg : income * 0.7, profile.dependents);
  const vaults = Storage.getAccounts().filter((a) => a.type === 'cofre' && (a.currency || 'BRL') === 'BRL').reduce((s, a) => s + Number(a.balance), 0);
  const reserve = Math.max(Number(profile.emergencyFundBalance || 0), vaults);

  return Calc.savingsPlan({
    income,
    fixedBills,
    investmentBills,
    installments,
    avgExpenses: avg,
    variableByCategory,
    recommendedPct,
    emergencyGap: Math.max(emergencyTarget - reserve, 0),
  });
}

function renderDashboard() {
  const month = state.viewMonth;
  const isCurrentMonth = month === Calc.currentMonthKey();
  const transactions = Storage.getTransactions();
  const budgets = Storage.getBudgetsForMonth(month);

  renderOnboarding();

  const totalSpent = Calc.totalByType(transactions, month, 'expense');
  document.getElementById('dash-total-spent').textContent = maskCurrency(totalSpent);

  // Outras moedas do mês (sem conversão — cada uma some separada)
  const expenseByCurrency = Calc.totalsByCurrency(transactions, month, 'expense');
  const incomeByCurrency = Calc.totalsByCurrency(transactions, month, 'income');
  const otherCurrencyCodes = [...new Set([...Object.keys(expenseByCurrency), ...Object.keys(incomeByCurrency)])].filter((c) => c !== 'BRL');
  document.getElementById('dash-other-currencies').innerHTML = otherCurrencyCodes
    .map((code) => {
      const parts = [];
      if (expenseByCurrency[code]) parts.push(`gasto ${fmtCurrency(expenseByCurrency[code], code)}`);
      if (incomeByCurrency[code]) parts.push(`receita ${fmtCurrency(incomeByCurrency[code], code)}`);
      return `<div class="sub-line">${code}: ${parts.join(' · ')}</div>`;
    })
    .join('');

  const cmp = Calc.comparisonPrevMonth(transactions, month);
  const cmpEl = document.getElementById('dash-comparison');
  if (cmp.pct === null) {
    cmpEl.textContent = 'Sem dados do mês anterior para comparar.';
  } else if (state.hideValues) {
    const arrow = cmp.diff >= 0 ? '↑' : '↓';
    cmpEl.textContent = `${arrow} ${Math.abs(cmp.pct).toFixed(0)}% vs. mês anterior`;
  } else {
    const arrow = cmp.diff >= 0 ? '↑' : '↓';
    cmpEl.textContent = `${arrow} ${Math.abs(cmp.pct).toFixed(0)}% vs. mês anterior (${Calc.fmtBRL(cmp.passado)})`;
  }

  // Gráficos
  renderCategoryChart('dash-chart-categories', Calc.totalsByCategory(transactions, month, 'expense'));
  renderTrendChart('dash-chart-trend', buildTrendData(transactions));

  // Receitas do mês (salário + outras fontes)
  const totalIncome = Calc.totalByType(transactions, month, 'income');
  document.getElementById('dash-total-income').textContent = maskCurrency(totalIncome);
  const availableEl = document.getElementById('dash-available');
  const availableNoteEl = document.getElementById('dash-available-note');
  const allBrlAccounts = Storage.getAccounts().filter((a) => (a.currency || 'BRL') === 'BRL');
  const brlAccounts = allBrlAccounts.filter((a) => a.type !== 'cofre');
  const vaultTotal = allBrlAccounts.filter((a) => a.type === 'cofre').reduce((sum, a) => sum + Number(a.balance), 0);
  let available;
  if (brlAccounts.length > 0) {
    available = brlAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
    availableNoteEl.textContent =
      'Disponível = saldo somado das suas contas e carteira em R$.' +
      (vaultTotal > 0 ? ` 🐷 ${maskCurrency(vaultTotal)} guardados em cofres ficam fora.` : '');
  } else {
    available = totalIncome - totalSpent;
    availableNoteEl.textContent = 'Cadastre suas contas em Mais para ver o saldo real disponível — por enquanto, comparando receitas e gastos só deste mês.';
  }
  availableEl.textContent = maskCurrency(available);
  availableEl.style.color = available < 0 ? 'var(--danger)' : 'var(--text)';

  // Saldo dos vales aparece SEPARADO, não somado: vale não é dinheiro em conta —
  // só compra comida. Juntar os dois num número só faria a pessoa achar que tem
  // mais dinheiro livre do que tem.
  const valeTotal = Storage.getCards()
    .filter((c) => c.kind !== 'credito')
    .reduce((sum, c) => sum + Number(c.balance || 0), 0);
  const valeEl = document.getElementById('dash-benefit-balance');
  if (valeEl) {
    valeEl.innerHTML =
      valeTotal > 0 ? `<div class="sub-line">🍽️ + ${maskCurrency(valeTotal)} em vales (só para alimentação, fora do disponível acima)</div>` : '';
  }
  const incomeByCategory = Calc.totalsByCategory(transactions, month, 'income');
  const incomeEntries = Object.entries(incomeByCategory);
  document.getElementById('dash-income-breakdown').innerHTML = incomeEntries.length
    ? incomeEntries
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => `<div class="cat-row"><div class="cat-name">${catIcon(cat)} ${cat}</div><div class="cat-values">${maskCurrency(val)}</div></div>`)
        .join('')
    : `<div class="empty-state">Nenhuma receita lançada este mês.</div>`;

  // Alertas: orçamento estourando + contas a vencer + faturas de cartão a vencer
  // (vencimentos só fazem sentido olhando o mês real de hoje, não um mês passado/futuro navegado)
  const budgetStatuses = Calc.budgetStatus(budgets, transactions, month, Storage.getBills());
  const alerts = [...Calc.budgetAlerts(budgetStatuses)];
  if (isCurrentMonth) {
    alerts.unshift(...Calc.billAlerts(Storage.getBills(), month), ...Calc.cardAlerts(Storage.getCards(), transactions));
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
  }
  // Alertas ficam recolhidos num botão só: a lista inteira na tela inicial
  // empurrava o resumo para baixo e virava ruído.
  state.dashAlerts = alerts;
  const alertsEl = document.getElementById('dash-alerts');
  if (alerts.length) {
    const critical = alerts.filter((a) => a.severity === 'critical').length;
    const top = critical ? 'critical' : alerts.some((a) => a.severity === 'warning') ? 'warning' : 'info';
    const detail = critical ? ` · ${critical} urgente${critical > 1 ? 's' : ''}` : '';
    alertsEl.innerHTML = `
      <button class="alert-summary ${top}" id="btn-open-alerts">
        <span>🔔 ${alerts.length} alerta${alerts.length > 1 ? 's' : ''}${detail}</span>
        <span class="alert-summary-cta">Ver ›</span>
      </button>`;
    document.getElementById('btn-open-alerts').addEventListener('click', openAlertsModal);
  } else {
    alertsEl.innerHTML = !isCurrentMonth
      ? `<div class="alert info">Você está vendo ${Calc.monthLabel(month)}. Toque em "Hoje" para voltar ao mês atual.</div>`
      : '';
  }

  // Uma linha só sobre poupança; o plano completo fica em Orçamento
  const plan = buildSavingsPlan();
  const savingsLineEl = document.getElementById('dash-savings-line');
  savingsLineEl.innerHTML = plan
    ? `<button class="alert-summary info" id="btn-dash-savings">
        <span>🎯 Meta: guardar ${maskCurrency(plan.target)}/mês (${plan.targetPct}% da renda)</span>
        <span class="alert-summary-cta">Plano ›</span>
      </button>`
    : '';
  const savingsBtn = document.getElementById('btn-dash-savings');
  if (savingsBtn) savingsBtn.addEventListener('click', () => showScreen('budgets'));

  // Orçamento por categoria
  const budgetsEl = document.getElementById('dash-budgets');
  budgetsEl.innerHTML = budgetStatuses.length
    ? budgetProgressHTML(budgetStatuses)
    : `<div class="empty-state">Nenhum orçamento definido. Configure na aba Orçamento.</div>`;

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
          const isTransfer = t.type === 'transfer';
          return `
      <div class="tx-item">
        <div class="tx-left" ${isTransfer ? '' : `data-edit-tx="${t.id}" style="cursor:pointer;"`}>
          <div class="tx-icon">${isTransfer ? '🔄' : t.type === 'income' ? '💰' : catIcon(t.category)}</div>
          <div>
            <div class="tx-desc">${t.description || t.category}</div>
            <div class="tx-date">${Calc.parseLocalDate(t.date).toLocaleDateString('pt-BR')}${paymentTag}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="tx-amount ${isTransfer ? 'transfer' : t.type}">${t.type === 'income' ? '+' : '-'} ${fmtCurrency(t.amount, t.currency)}</div>
          <button class="close-btn" data-delete-tx="${t.id}" title="Apagar">🗑️</button>
        </div>
      </div>`;
        })
        .join('')
    : `<div class="empty-state">Nenhuma transação este mês. Toque em "+" para começar.</div>`;

  txEl.querySelectorAll('[data-edit-tx]').forEach((el) => {
    el.addEventListener('click', () => openTxModal(null, el.dataset.editTx));
  });
  txEl.querySelectorAll('[data-delete-tx]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTransactionById(el.dataset.deleteTx);
    });
  });
}

// -------- Render: Orçamentos --------
function renderBudgets() {
  const month = state.viewMonth;
  const categories = Storage.getCategories();
  const budgets = Storage.getBudgetsForMonth(month);
  const profile = Storage.getProfile();
  const income = profile.incomeNet || 0;

  const totalBudgeted = budgets.reduce((sum, b) => sum + (b.limitAmount || 0), 0);
  const totalAlertEl = document.getElementById('budget-total-alert');
  if (income > 0 && totalBudgeted > income) {
    const pct = (totalBudgeted / income) * 100;
    totalAlertEl.innerHTML = `<div class="alert critical">A soma dos orçamentos das categorias (${Calc.fmtBRL(totalBudgeted)}) passou de 100% da sua renda líquida — está em ${pct.toFixed(0)}%. Ajuste os limites para não planejar gastar mais do que ganha.</div>`;
  } else {
    totalAlertEl.innerHTML = '';
  }

  renderBudgetProgress(month, budgets);
  renderSavingsPlan();

  const wrap = document.getElementById('budget-inputs');
  wrap.innerHTML = categories
    .map((c) => {
      const existing = budgets.find((b) => b.category === c.name);
      const pct = c.recommendedPct != null ? c.recommendedPct : 5;
      const suggested = income > 0 ? (income * pct) / 100 : null;
      const actualPct = income > 0 && existing && existing.limitAmount > 0 ? (existing.limitAmount / income) * 100 : null;
      return `
      <div class="budget-row">
        <div class="list-row-input" style="border-bottom:none;padding:0;align-items:flex-start;">
          <div class="cat-name">${c.icon} ${c.name}</div>
          <div style="text-align:right;">
            <input type="number" inputmode="decimal" class="budget-limit-input" data-budget-cat="${c.name}" placeholder="0,00" value="${existing ? existing.limitAmount : ''}">
            <div class="sub-line" data-actual-pct="${c.name}" style="margin-top:2px;">${actualPct !== null ? `= ${actualPct.toFixed(1)}% da renda líquida` : ''}</div>
          </div>
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
    input.addEventListener('input', () => {
      const val = parseFloat(input.value) || 0;
      const pctEl = wrap.querySelector(`[data-actual-pct="${CSS.escape(input.dataset.budgetCat)}"]`);
      if (pctEl) pctEl.textContent = income > 0 && val > 0 ? `= ${((val / income) * 100).toFixed(1)}% da renda líquida` : '';
    });
    input.addEventListener('change', () => {
      const val = parseFloat(input.value) || 0;
      Storage.setBudget(input.dataset.budgetCat, month, val);
      renderBudgets();
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

function renderBudgetProgress(month, budgets) {
  const statuses = Calc.budgetStatus(budgets, Storage.getTransactions(), month, Storage.getBills());
  document.getElementById('budget-progress').innerHTML = statuses.length
    ? budgetProgressHTML(statuses)
    : `<div class="empty-state">Defina limites abaixo para acompanhar quanto já gastou e quanto ainda vai gastar com as contas previstas.</div>`;

  // Remanejar só faz sentido para o mês atual ou futuro: mês fechado não muda mais.
  const reallocEl = document.getElementById('budget-reallocation');
  const moves = month >= Calc.currentMonthKey() ? Calc.reallocationSuggestions(statuses) : [];
  if (!moves.length) {
    reallocEl.innerHTML = '';
    return;
  }
  reallocEl.innerHTML = `
    <div class="card realloc-card">
      <p class="card-title">💡 Sugestão de remanejamento</p>
      ${moves
        .map((m, i) =>
          m.from
            ? `<div class="realloc-row">
                <div>Passe <strong>${maskCurrency(m.amount)}</strong> de ${catIcon(m.from)} ${m.from} para ${catIcon(m.to)} ${m.to}</div>
                <button class="chip" data-realloc="${i}">Aplicar</button>
              </div>`
            : `<div class="realloc-row"><div>Ainda faltam <strong>${maskCurrency(m.amount)}</strong> para ${catIcon(m.to)} ${m.to}: nenhuma categoria tem folga. Vale rever o gasto ou aumentar o limite total.</div></div>`
        )
        .join('')}
      <p class="sub-line" style="margin-top:6px;">Considera o que já foi gasto e as contas que ainda vão vencer. Mantém 10% de margem nas categorias que cedem.</p>
    </div>`;
  reallocEl.querySelectorAll('[data-realloc]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = moves[Number(btn.dataset.realloc)];
      const current = Storage.getBudgetsForMonth(month);
      const limitOf = (cat) => (current.find((b) => b.category === cat) || { limitAmount: 0 }).limitAmount;
      const round2 = (v) => Math.round(v * 100) / 100;
      Storage.setBudget(m.from, month, round2(limitOf(m.from) - m.amount));
      Storage.setBudget(m.to, month, round2(limitOf(m.to) + m.amount));
      renderBudgets();
      renderDashboard();
    });
  });
}

function renderSavingsPlan() {
  const el = document.getElementById('savings-plan');
  const plan = buildSavingsPlan();
  if (!plan) {
    el.innerHTML = `<div class="sub-line">Cadastre sua renda líquida em Ajustes &gt; Perfil (ou uma receita recorrente) para ver quanto guardar por mês.</div>`;
    return;
  }
  const steps = [];
  steps.push(
    plan.investmentBills > 0
      ? `Você já tem ${maskCurrency(plan.investmentBills)} em aportes programados. Separe mais <strong>${maskCurrency(plan.toSetAside)}</strong> no dia em que o salário cair.`
      : `Separe <strong>${maskCurrency(plan.toSetAside)}</strong> no dia em que o salário cair, antes de gastar (use "Guardar" na aba Investir).`
  );
  plan.cuts.forEach((c) => {
    steps.push(`Reduza ${catIcon(c.category)} ${c.category} de ${maskCurrency(c.current)} para <strong>${maskCurrency(c.suggested)}</strong>/mês (−${maskCurrency(c.cut)}).`);
  });
  if (plan.uncovered > 0) {
    steps.push(`Ainda faltam ${maskCurrency(plan.uncovered)}/mês. As contas fixas somam ${plan.committedPct.toFixed(0)}% da renda: vale renegociar alguma delas.`);
  }
  if (plan.monthsToReserve > 0) {
    steps.push(`Guardando a meta todo mês, sua reserva de emergência fica completa em cerca de <strong>${plan.monthsToReserve} ${plan.monthsToReserve === 1 ? 'mês' : 'meses'}</strong>.`);
  }

  const status =
    plan.estimatedSavings === null
      ? `<div class="sub-line">Assim que você fechar um mês com lançamentos, comparo sua sobra real com a meta.</div>`
      : plan.gap > 0
      ? `<div class="alert warning" style="margin:10px 0 0;">No seu ritmo atual sobram cerca de ${maskCurrency(plan.estimatedSavings)}/mês, ${maskCurrency(plan.gap)} abaixo da meta.</div>`
      : `<div class="alert info" style="margin:10px 0 0;">No seu ritmo atual sobram cerca de ${maskCurrency(plan.estimatedSavings)}/mês. Você já bate a meta. 👏</div>`;

  el.innerHTML = `
    <div class="savings-target">
      <div>
        <p class="card-title">Meta mensal (${plan.targetPct}% da renda)</p>
        <p class="big-number">${maskCurrency(plan.target)}</p>
      </div>
    </div>
    <div class="cat-row"><div class="cat-name">📌 Contas fixas previstas</div><div class="cat-values">${maskCurrency(plan.fixedBills)}</div></div>
    ${plan.installments > 0 ? `<div class="cat-row"><div class="cat-name">💳 Parcelas de cartão este mês</div><div class="cat-values">${maskCurrency(plan.installments)}</div></div>` : ''}
    <div class="cat-row"><div class="cat-name">🛒 Livre para o dia a dia</div><div class="cat-values" style="color:${plan.freeForVariable < 0 ? 'var(--danger)' : 'inherit'}">${maskCurrency(plan.freeForVariable)}</div></div>
    ${plan.variable !== null ? `<div class="cat-row"><div class="cat-name">📊 Seu gasto variável médio</div><div class="cat-values">${maskCurrency(plan.variable)}</div></div>` : ''}
    ${status}
    <p class="card-title" style="margin-top:14px;">Plano de economia</p>
    <ol class="savings-steps">${steps.map((t) => `<li>${t}</li>`).join('')}</ol>
    <p class="sub-line">Base: renda líquida, contas fixas cadastradas em Contas a pagar e média dos últimos 3 meses fechados.</p>`;
}

// -------- Render: Investimentos --------
function renderInvestments() {
  const investments = Storage.getInvestments();
  const profile = Storage.getProfile();
  const { byClass, total } = Calc.investmentSummary(investments);

  document.getElementById('inv-total').textContent = Calc.fmtBRL(total);

  const byCurrency = Calc.investmentTotalsByCurrency(investments);
  const otherEntries = Object.entries(byCurrency).filter(([code]) => code !== 'BRL');
  document.getElementById('inv-other-currencies').innerHTML = otherEntries.length
    ? otherEntries
        .map(([code, val]) => `<div class="sub-line">${Calc.fmtMoney(val, Storage.getCurrency(code))} investido em ${code}</div>`)
        .join('')
    : '';

  const vaults = Storage.getAccounts().filter((a) => a.type === 'cofre');
  document.getElementById('inv-vaults').innerHTML = vaults
    .map(
      (a) => `<div class="cat-row"><div class="cat-name">🐷 ${a.name}</div><div class="cat-values">${fmtCurrency(a.balance, a.currency)}</div></div>`
    )
    .join('');

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

  const { byBroker } = Calc.investmentSummaryByBroker(investments);
  const brokerEntries = Object.entries(byBroker).filter(([, v]) => v > 0);
  document.getElementById('inv-by-broker').innerHTML = brokerEntries.length
    ? brokerEntries
        .sort((a, b) => b[1] - a[1])
        .map(([broker, val]) => `<div class="cat-row"><div class="cat-name">${broker}</div><div class="cat-values">${Calc.fmtBRL(val)}</div></div>`)
        .join('')
    : `<div class="empty-state">Nenhum investimento em R$ registrado ainda.</div>`;

  const byName = Calc.investmentSummaryByName(investments);
  const nameEntries = Object.entries(byName).filter(([, v]) => v.total > 0);
  document.getElementById('inv-by-name').innerHTML = nameEntries.length
    ? nameEntries
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, v]) => {
          const sub = [v.count > 1 ? `${v.count} aportes` : null, v.maturity ? `venc. ${Calc.parseLocalDate(v.maturity).toLocaleDateString('pt-BR')}` : null]
            .filter(Boolean)
            .join(' · ');
          return `<div class="cat-row" style="display:block;"><div class="cat-name">${name}</div><div class="cat-values">${Calc.fmtBRL(v.total)}</div>${sub ? `<div class="sub-line">${sub}</div>` : ''}</div>`;
        })
        .join('')
    : `<div class="empty-state">Nenhum investimento em R$ registrado ainda.</div>`;

  const listEl = document.getElementById('inv-list');
  const sorted = [...investments].sort((a, b) => new Date(b.date) - new Date(a.date));
  listEl.innerHTML = sorted.length
    ? sorted
        .slice(0, 10)
        .map((i) => {
          const details = [i.broker, i.liquidity, i.rate, i.maturity ? `venc. ${Calc.parseLocalDate(i.maturity).toLocaleDateString('pt-BR')}` : null]
            .filter(Boolean)
            .join(' · ');
          return `
      <div class="tx-item" data-edit-inv="${i.id}" style="cursor:pointer;">
        <div class="tx-left">
          <div class="tx-icon">📈</div>
          <div>
            <div class="tx-desc">${i.name || i.assetClass}</div>
            <div class="tx-date">${i.assetClass}${details ? ' · ' + details : ''} · ${Calc.parseLocalDate(i.date).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div class="tx-amount ${i.movement === 'resgate' ? 'expense' : 'income'}">${i.movement === 'resgate' ? '-' : '+'} ${Calc.fmtMoney(i.amount, Storage.getCurrency(i.currency))}</div>
      </div>`;
        })
        .join('')
    : `<div class="empty-state">Toque em "+" para registrar seu primeiro aporte.</div>`;

  listEl.querySelectorAll('[data-edit-inv]').forEach((el) => {
    el.addEventListener('click', () => openInvModal(el.dataset.editInv));
  });
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
  document.getElementById('profile-debt-cheap').checked = !!p.hasCheapDebt;
}

document.getElementById('btn-save-profile').addEventListener('click', () => {
  const profile = {
    incomeGross: parseFloat(document.getElementById('profile-income-gross').value) || 0,
    incomeNet: parseFloat(document.getElementById('profile-income-net').value) || 0,
    dependents: parseInt(document.getElementById('profile-dependents').value) || 0,
    riskProfile: document.getElementById('profile-risk').value,
    emergencyFundBalance: parseFloat(document.getElementById('profile-emergency').value) || 0,
    hasDebt: document.getElementById('profile-debt').checked,
    hasCheapDebt: document.getElementById('profile-debt-cheap').checked,
  };
  Storage.saveProfile(profile);
  renderProfileRecommendation();
  renderAll();
});

function renderProfileRecommendation() {
  const profile = Storage.getProfile();
  const transactions = Storage.getTransactions();
  const month = Calc.currentMonthKey();
  // Base = média dos últimos meses FECHADOS. Usar o mês corrente fazia a meta ser
  // quase zero no dia 1 e crescer até o dia 31 — a reserva ideal mudava todo dia.
  const media = Calc.averageMonthlyExpenses(transactions, 3);
  const monthlyExpenses = media !== null ? media : profile.incomeNet * 0.7;
  const baseTxt =
    media !== null
      ? 'Base: média dos seus últimos meses fechados.'
      : 'Base: estimativa de 70% da sua renda — ainda não há mês fechado com lançamentos.';
  const target = Calc.emergencyFundTarget(monthlyExpenses, profile.dependents);
  const rec = Calc.progressRecommendation({
    emergencyBalance: profile.emergencyFundBalance,
    emergencyTarget: target,
    hasDebt: profile.hasDebt,
    debtHigh: profile.hasDebt,
    hasCheapDebt: profile.hasCheapDebt,
  });
  document.getElementById('profile-recommendation').innerHTML = `
    <strong>Meta de reserva de emergência:</strong> ${Calc.fmtBRL(target)}<br>
    <span class="sub-line">${baseTxt}</span><br><br>
    ${rec.message}`;
}

// -------- Render geral --------
function renderAll() {
  renderMonthNav();
  renderDashboard();
  if (state.screen === 'bills') {
    renderBills();
    renderCardBillsSummary();
  }
  if (state.screen === 'budgets') renderBudgets();
  if (state.screen === 'investments') renderInvestments();
  if (state.screen === 'more') {
    renderAccounts();
    renderCards();
    renderExpenseCategories();
    renderIncomeCategories();
    renderCurrenciesList();
    loadProfileForm();
    renderProfileRecommendation();
    renderPinStatus();
    renderRecurringIncomes();
    renderBackupReminder();
    renderUndoImport();
  }
}

function renderCardBillsSummary() {
  const cards = Storage.getCards().filter((c) => c.kind === 'credito');
  const transactions = Storage.getTransactions();

  const alerts = Calc.cardAlerts(cards, transactions);
  document.getElementById('card-bills-alerts').innerHTML = alerts.map((a) => `<div class="alert ${a.severity}">${a.message}</div>`).join('');

  const listEl = document.getElementById('card-bills-list');
  if (cards.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nenhum cartão de crédito cadastrado. Adicione em Mais.</div>`;
    return;
  }
  const month = Calc.currentMonthKey();
  listEl.innerHTML = cards
    .map((c) => {
      // Aqui a pergunta é "quanto vence agora", então é a fatura do mês — não o
      // total comprometido, que incluiria parcelas de meses futuros.
      const { committed, invoice } = Calc.cardAvailableLimit(c, transactions);
      const futuras = committed - invoice;
      const paid = (c.paidMonths || []).includes(month);
      return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">💳</div>
          <div>
            <div class="tx-desc">${c.name}</div>
            <div class="tx-date">Vence dia ${c.dueDay}${paid ? ' · ✅ paga este mês' : ''}</div>
            ${futuras > 0 ? `<div class="sub-line">+ ${maskCurrency(futuras)} em parcelas de meses seguintes</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div class="tx-amount expense">${maskCurrency(invoice)}</div>
          ${invoice > 0 && !paid ? `<button class="chip" style="margin-top:4px;" data-pay-card-bill="${c.id}">Marcar como paga</button>` : ''}
        </div>
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('[data-pay-card-bill]').forEach((btn) => {
    btn.addEventListener('click', () => openPayCardModal(btn.dataset.payCardBill));
  });
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

// Dispara via Service Worker (ServiceWorkerRegistration.showNotification), não via
// `new Notification()` direto — em PWA instalado no Android, `new Notification()`
// é bloqueado ("Illegal constructor") e a notificação simplesmente não sai.
async function checkAndNotifyDueToday() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;

  let registration;
  try {
    registration = await navigator.serviceWorker.ready;
  } catch (e) {
    return;
  }
  if (!registration || !registration.showNotification) return;

  const today = todayISO();
  const notifiedKey = `finapp_notified_${today}`;
  // Uma chave por dia era criada e nunca removida. Limpa as de outros dias.
  Object.keys(localStorage)
    .filter((k) => k.startsWith('finapp_notified_') && k !== notifiedKey)
    .forEach((k) => localStorage.removeItem(k));
  const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

  const month = Calc.currentMonthKey();
  const dueBills = Calc.billAlerts(Storage.getBills(), month).filter((a) => a.diffDays <= 0 && !notified.includes('bill:' + a.billId));
  const dueCards = Calc.cardAlerts(Storage.getCards(), Storage.getTransactions()).filter(
    (a) => a.diffDays <= 0 && !notified.includes('card:' + a.cardId)
  );

  for (const a of dueBills) {
    await registration.showNotification('💰 Conta vencendo hoje', {
      body: a.message,
      tag: 'bill-' + a.billId,
      icon: 'icons/icon.svg',
      data: { kind: 'bill', id: a.billId },
      actions: [{ action: 'pay', title: 'Marcar como paga' }],
    });
    notified.push('bill:' + a.billId);
  }
  for (const a of dueCards) {
    await registration.showNotification('💳 Fatura vencendo hoje', {
      body: a.message,
      tag: 'card-' + a.cardId,
      icon: 'icons/icon.svg',
      data: { kind: 'card', id: a.cardId },
      actions: [{ action: 'pay', title: 'Pagar fatura' }],
    });
    notified.push('card:' + a.cardId);
  }

  if (dueBills.length || dueCards.length) {
    localStorage.setItem(notifiedKey, JSON.stringify(notified));
  }
}

// Trata o clique/ação de uma notificação — tanto quando o app já está aberto
// (mensagem do SW) quanto quando é aberto de novo a partir do clique.
function handleNotificationAction({ action, kind, id }) {
  if (!kind || !id) return;
  if (kind === 'bill' && action === 'pay') {
    showScreen('bills');
    openPayBillModal(id);
  } else if (kind === 'card' && action === 'pay') {
    showScreen('bills');
    openPayCardModal(id);
  } else if (kind === 'bill' || kind === 'card') {
    showScreen('bills');
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'notification-action') {
      handleNotificationAction(event.data);
    }
  });
}

// App aberto a partir do clique na notificação (estava fechado) — vem por query string.
// Roda depois que o resto do app.js define suas funções (hoisting) e o DOM já está
// todo parseado (este script fica no fim do body), então pode chamar direto.
function handleNotificationLaunchParams() {
  const params = new URLSearchParams(location.search);
  if (params.get('ntf') !== '1') return;
  const action = params.get('action') || undefined;
  const kind = params.get('kind') || undefined;
  const id = params.get('id') || undefined;
  history.replaceState({}, '', location.pathname);
  handleNotificationAction({ action, kind, id });
}

// ==================== BACKUP (exportar/importar) ====================
// Como não há nuvem, o backup é um arquivo .json que o usuário salva e guarda
// onde quiser. Importar substitui todos os dados atuais pelos do arquivo.

const BACKUP_KEYS = Object.values(DB_KEYS).concat(['finapp_hide_values']);

document.getElementById('btn-export-backup').addEventListener('click', () => {
  const data = {};
  BACKUP_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = raw;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-financeiro-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  // Revogar na mesma hora cancela o download em alguns navegadores (Safari/iOS).
  // Como o backup é a ÚNICA porta de saída dos dados, vale esperar antes de soltar.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
  localStorage.setItem('finapp_last_backup', todayISO());
  renderBackupReminder();
});

document.getElementById('input-import-backup').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (err) {
      await appAlert('Arquivo inválido. Selecione um backup exportado por este app.');
      return;
    }
    // VALIDAR ANTES DE APAGAR. Na versão anterior o app apagava tudo e só depois
    // tentava restaurar: escolher um .json qualquer (válido, mas que não fosse um
    // backup) apagava todos os dados e não restaurava nada. Sem nuvem e sem undo,
    // isso era perda total e silenciosa.
    const isObject = data && typeof data === 'object' && !Array.isArray(data);
    const knownKeys = isObject ? Object.keys(data).filter((k) => BACKUP_KEYS.includes(k)) : [];
    if (knownKeys.length === 0) {
      await appAlert('Esse arquivo não parece um backup deste app — nenhum dado reconhecido foi encontrado. Nada foi alterado.');
      return;
    }
    // O conteúdo também precisa ser JSON válido, senão o app quebraria depois de importar.
    const corrompidas = knownKeys.filter((k) => {
      try {
        JSON.parse(data[k]);
        return false;
      } catch (err) {
        return true;
      }
    });
    if (corrompidas.length > 0) {
      await appAlert(`O backup está corrompido em: ${corrompidas.join(', ')}. Nada foi alterado.`);
      return;
    }

    const resumo = descreveBackup(data);
    if (!(await appConfirm(`Importar este backup?\n\n${resumo}\n\nSeus dados atuais serão substituídos — mas guardo uma cópia e você poderá desfazer.`, { danger: true })))
      return;

    // Rede de segurança: guarda o estado atual antes de sobrescrever.
    const snapshot = {};
    BACKUP_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw !== null) snapshot[key] = raw;
    });
    localStorage.setItem(UNDO_KEY, JSON.stringify({ at: new Date().toISOString(), data: snapshot }));

    BACKUP_KEYS.forEach((key) => localStorage.removeItem(key));
    Object.entries(data).forEach(([key, rawValue]) => {
      if (BACKUP_KEYS.includes(key)) localStorage.setItem(key, rawValue);
    });
    await appAlert('Backup importado! Se algo parecer errado, use "Desfazer importação" em Mais. O app vai recarregar.');
    location.reload();
  };
  reader.readAsText(file);
});

// Resume o que vem no arquivo, para a confirmação não ser às cegas
function descreveBackup(data) {
  const conta = (key) => {
    try {
      const v = JSON.parse(data[key] || '[]');
      return Array.isArray(v) ? v.length : null;
    } catch (err) {
      return null;
    }
  };
  const linhas = [
    ['lançamentos', conta(DB_KEYS.transactions)],
    ['cartões', conta(DB_KEYS.cards)],
    ['contas', conta(DB_KEYS.accounts)],
    ['contas a pagar', conta(DB_KEYS.bills)],
    ['investimentos', conta(DB_KEYS.investments)],
  ].filter(([, n]) => n !== null && n > 0);
  return linhas.length ? linhas.map(([nome, n]) => `• ${n} ${nome}`).join('\n') : '• (backup sem lançamentos)';
}

// ==================== DESFAZER IMPORTAÇÃO ====================
const UNDO_KEY = 'finapp_pre_import_snapshot';

function renderUndoImport() {
  const wrap = document.getElementById('undo-import-wrap');
  if (!wrap) return;
  const raw = localStorage.getItem(UNDO_KEY);
  if (!raw) {
    wrap.style.display = 'none';
    return;
  }
  let snap;
  try {
    snap = JSON.parse(raw);
  } catch (err) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  document.getElementById('undo-import-info').textContent =
    `Cópia guardada antes da última importação (${Calc.parseLocalDate(snap.at.slice(0, 10)).toLocaleDateString('pt-BR')}).`;
}

document.getElementById('btn-undo-import').addEventListener('click', async () => {
  const raw = localStorage.getItem(UNDO_KEY);
  if (!raw) return;
  if (!(await appConfirm('Voltar os dados para como estavam antes da última importação? O que foi importado será descartado.', { danger: true }))) return;
  const snap = JSON.parse(raw);
  BACKUP_KEYS.forEach((key) => localStorage.removeItem(key));
  Object.entries(snap.data).forEach(([key, rawValue]) => {
    if (BACKUP_KEYS.includes(key)) localStorage.setItem(key, rawValue);
  });
  localStorage.removeItem(UNDO_KEY);
  await appAlert('Dados restaurados. O app vai recarregar.');
  location.reload();
});

// ==================== LEMBRETE DE BACKUP ====================
// App 100% local: trocar de celular ou limpar os dados do navegador apaga tudo.
// Sem um lembrete, a pessoa só descobre isso quando já perdeu.
const BACKUP_REMINDER_DAYS = 30;

function renderBackupReminder() {
  const el = document.getElementById('backup-reminder');
  if (!el) return;
  const temDados = Storage.getTransactions().length > 0 || Storage.getCards().length > 0;
  if (!temDados) {
    el.style.display = 'none';
    return;
  }
  const last = localStorage.getItem('finapp_last_backup');
  if (!last) {
    el.style.display = 'block';
    el.className = 'alert warning';
    el.textContent = '⚠️ Você nunca exportou um backup. Seus dados existem só neste aparelho — se ele sumir ou você limpar os dados do navegador, não há como recuperar.';
    return;
  }
  const dias = Math.floor((Calc.parseLocalDate(todayISO()) - Calc.parseLocalDate(last)) / 86400000);
  if (dias >= BACKUP_REMINDER_DAYS) {
    el.style.display = 'block';
    el.className = 'alert warning';
    el.textContent = `⚠️ Seu último backup foi há ${dias} dias. Vale exportar de novo.`;
  } else {
    el.style.display = 'block';
    el.className = 'alert info';
    el.textContent = `✅ Último backup há ${dias} dia${dias === 1 ? '' : 's'}.`;
  }
}

// ==================== RESETAR APLICATIVO ====================

document.getElementById('btn-reset-app').addEventListener('click', async () => {
  const step1 = await appConfirm(
    'Isso apaga TUDO — gastos, receitas, contas, cartões, investimentos, categorias, PIN — e não tem como desfazer. Tem certeza?',
    { danger: true }
  );
  if (!step1) return;
  const step2 = await appConfirm('Última confirmação: quer mesmo resetar o aplicativo e perder todos os dados?', { danger: true });
  if (!step2) return;

  Object.keys(localStorage)
    .filter((key) => key.startsWith('finapp_'))
    .forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem('finapp_unlocked');
  location.reload();
});

// ==================== COMO USAR ====================

document.getElementById('btn-open-help').addEventListener('click', () => openModal('modal-help'));

// ==================== FIXAR APP NA TELA INICIAL (PWA) ====================

document.getElementById('btn-open-install').addEventListener('click', () => openModal('modal-install'));

document.querySelectorAll('[data-install-os]').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('[data-install-os]').forEach((c) => c.classList.remove('selected'));
    chip.classList.add('selected');
    const os = chip.dataset.installOs;
    document.getElementById('install-steps-android').style.display = os === 'android' ? 'block' : 'none';
    document.getElementById('install-steps-ios').style.display = os === 'ios' ? 'block' : 'none';
  });
});

function closeInstallModal() {
  localStorage.setItem('finapp_install_seen', '1');
  closeModal('modal-install');
}
document.getElementById('btn-install-done').addEventListener('click', closeInstallModal);
document.getElementById('btn-install-later').addEventListener('click', closeInstallModal);

function maybeShowInstallModal() {
  if (localStorage.getItem('finapp_install_seen') === '1') return;
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    localStorage.setItem('finapp_install_seen', '1');
    return;
  }
  if (document.getElementById('lock-screen').style.display === 'flex') return;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) {
    document.querySelector('[data-install-os="ios"]').click();
  }
  openModal('modal-install');
}

// ==================== HISTÓRICO / BUSCA DE TRANSAÇÕES ====================

state.historyFilters = { search: '', type: 'all', category: '' };

function openHistoryModal() {
  document.getElementById('history-search').value = '';
  state.historyFilters = { search: '', type: 'all', category: '' };
  renderHistoryTypeFilter();
  renderHistoryCategoryFilter();
  renderHistoryList();
  openModal('modal-history');
}
document.getElementById('btn-open-history').addEventListener('click', openHistoryModal);

function renderHistoryTypeFilter() {
  const wrap = document.getElementById('history-type-filter');
  const options = [
    { v: 'all', l: 'Todas' },
    { v: 'expense', l: 'Gastos' },
    { v: 'income', l: 'Receitas' },
  ];
  wrap.innerHTML = options
    .map((o) => `<div class="chip ${state.historyFilters.type === o.v ? 'selected' : ''}" data-htype="${o.v}">${o.l}</div>`)
    .join('');
  wrap.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.historyFilters.type = chip.dataset.htype;
      renderHistoryTypeFilter();
      renderHistoryList();
    });
  });
}

function renderHistoryCategoryFilter() {
  const sel = document.getElementById('history-category-filter');
  const names = [...new Set([...Storage.getCategories(), ...Storage.getIncomeCategories()].map((c) => c.name))];
  sel.innerHTML = `<option value="">Todas as categorias</option>` + names.map((n) => `<option value="${n}">${n}</option>`).join('');
  sel.value = state.historyFilters.category;
}
document.getElementById('history-category-filter').addEventListener('change', (e) => {
  state.historyFilters.category = e.target.value;
  renderHistoryList();
});
document.getElementById('history-search').addEventListener('input', (e) => {
  state.historyFilters.search = e.target.value.trim().toLowerCase();
  renderHistoryList();
});

function renderHistoryList() {
  const { search, type, category } = state.historyFilters;
  let list = [...Storage.getTransactions()];
  if (type !== 'all') list = list.filter((t) => t.type === type);
  if (category) list = list.filter((t) => t.category === category);
  if (search) {
    list = list.filter(
      (t) => (t.description || '').toLowerCase().includes(search) || (t.category || '').toLowerCase().includes(search)
    );
  }
  list.sort((a, b) => new Date(b.date) - new Date(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const listEl = document.getElementById('history-list');
  listEl.innerHTML = list.length
    ? list
        .map((t) => {
          const paymentTag =
            t.paymentMethod === 'Cartão de Crédito'
              ? ` · 💳 ${t.cardName || 'Cartão'}${t.installmentLabel ? ' ' + t.installmentLabel : ''}`
              : t.paymentMethod
              ? ` · ${t.paymentMethod}`
              : '';
          const isTransfer = t.type === 'transfer';
          return `
      <div class="tx-item">
        <div class="tx-left" ${isTransfer ? '' : `data-hedit-tx="${t.id}" style="cursor:pointer;"`}>
          <div class="tx-icon">${isTransfer ? '🔄' : t.type === 'income' ? '💰' : catIcon(t.category)}</div>
          <div>
            <div class="tx-desc">${t.description || t.category}</div>
            <div class="tx-date">${Calc.parseLocalDate(t.date).toLocaleDateString('pt-BR')}${paymentTag}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="tx-amount ${isTransfer ? 'transfer' : t.type}">${t.type === 'income' ? '+' : '-'} ${Calc.fmtMoney(t.amount, Storage.getCurrency(t.currency))}</div>
          <button class="close-btn" data-hdelete-tx="${t.id}" title="Apagar">🗑️</button>
        </div>
      </div>`;
        })
        .join('')
    : `<div class="empty-state">Nenhuma transação encontrada.</div>`;

  listEl.querySelectorAll('[data-hedit-tx]').forEach((el) => {
    el.addEventListener('click', () => {
      closeModal('modal-history');
      openTxModal(null, el.dataset.heditTx);
    });
  });
  listEl.querySelectorAll('[data-hdelete-tx]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTransactionById(el.dataset.hdeleteTx);
      renderHistoryList();
    });
  });
}

// ==================== BLOQUEIO POR PIN ====================
// PIN de 4 dígitos guardado só no aparelho, para dificultar que alguém que
// pegue o celular veja seus dados sem querer. Não é criptografia real —
// é uma trava simples de privacidade, consistente com o resto do app.

let lockPinBuffer = '';

function renderLockDots() {
  const dotsEl = document.getElementById('lock-dots');
  dotsEl.innerHTML = Array.from(
    { length: 4 },
    (_, i) =>
      `<span style="width:14px;height:14px;border-radius:50%;display:inline-block;background:${
        i < lockPinBuffer.length ? 'var(--primary)' : 'var(--border)'
      };"></span>`
  ).join('');
}

function renderLockKeypad() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  const keypad = document.getElementById('lock-keypad');
  keypad.innerHTML = keys
    .map((k) =>
      k === ''
        ? `<div></div>`
        : `<button data-lockkey="${k}" style="width:64px;height:64px;border-radius:50%;border:1px solid var(--border);background:var(--surface);font-size:20px;color:var(--text);">${k}</button>`
    )
    .join('');
  keypad.querySelectorAll('[data-lockkey]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lockkey === '⌫') lockBackspace();
      else lockKeyPress(btn.dataset.lockkey);
    });
  });
}

// Espera crescente após erros seguidos. Não impede quem tem o aparelho e muito
// tempo, mas transforma "tentar os 10 mil PINs" em algo inviável na mão.
function lockPenaltySeconds(fails) {
  if (fails < 3) return 0;
  if (fails < 5) return 30;
  if (fails < 8) return 120;
  return 300;
}

function lockRemainingBlock() {
  const until = Number(localStorage.getItem('finapp_pin_block_until') || 0);
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function lockKeyPress(digit) {
  const blocked = lockRemainingBlock();
  if (blocked > 0) {
    document.getElementById('lock-error').textContent = `Muitas tentativas. Espere ${blocked}s.`;
    return;
  }
  if (lockPinBuffer.length >= 4) return;
  lockPinBuffer += digit;
  renderLockDots();
  document.getElementById('lock-error').textContent = '';
  if (lockPinBuffer.length === 4) {
    setTimeout(() => {
      if (lockPinBuffer === localStorage.getItem('finapp_pin')) {
        localStorage.removeItem('finapp_pin_fails');
        localStorage.removeItem('finapp_pin_block_until');
        sessionStorage.setItem('finapp_unlocked', '1');
        document.getElementById('lock-screen').style.display = 'none';
        maybeShowInstallModal();
      } else {
        const fails = Number(localStorage.getItem('finapp_pin_fails') || 0) + 1;
        localStorage.setItem('finapp_pin_fails', String(fails));
        const penalty = lockPenaltySeconds(fails);
        if (penalty > 0) {
          localStorage.setItem('finapp_pin_block_until', String(Date.now() + penalty * 1000));
          document.getElementById('lock-error').textContent = `PIN incorreto. Espere ${penalty}s antes de tentar de novo.`;
        } else {
          document.getElementById('lock-error').textContent = 'PIN incorreto.';
        }
        lockPinBuffer = '';
        renderLockDots();
      }
    }, 150);
  }
}

function lockBackspace() {
  lockPinBuffer = lockPinBuffer.slice(0, -1);
  renderLockDots();
}

// Antes, "Esqueci meu PIN" simplesmente removia o PIN e abria o app — qualquer
// pessoa com o aparelho na mão entrava em dois toques, e a trava não protegia nada.
// Como não existe servidor para provar identidade, a única saída honesta é a mesma
// de um cofre local: sem a chave, o conteúdo não é acessível. Quem esquece o PIN
// recomeça do zero — por isso o caminho oferece exportar o backup antes.
document.getElementById('btn-forgot-pin').addEventListener('click', async () => {
  const passo1 = await appConfirm(
    'Não há como recuperar o PIN: ele fica só neste aparelho e o app não tem servidor.\n\n' +
      'A única forma de entrar sem ele é apagar os dados do app e começar de novo.\n\n' +
      'Quer continuar?',
    { danger: true }
  );
  if (!passo1) return;

  const querBackup = await appConfirm(
    'Antes de apagar: quer baixar um backup dos seus dados?\n\n' +
      'O arquivo é salvo normalmente e depois pode ser importado de volta — mesmo sem o PIN.',
    { okText: 'Baixar backup', cancelText: 'Pular' }
  );
  if (querBackup) {
    document.getElementById('btn-export-backup').click();
    await appAlert('Backup baixado. Guarde o arquivo antes de continuar.');
  }

  const passo2 = await appConfirm('Última confirmação: apagar TODOS os dados do app e remover o PIN?', { danger: true });
  if (!passo2) return;

  BACKUP_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('finapp_pin');
  localStorage.removeItem('finapp_pin_fails');
  localStorage.removeItem('finapp_pin_block_until');
  sessionStorage.setItem('finapp_unlocked', '1');
  location.reload();
});

renderLockKeypad();
renderLockDots();

function renderPinStatus() {
  const has = !!localStorage.getItem('finapp_pin');
  document.getElementById('pin-status').textContent = has
    ? '🔒 PIN ativado. O app pede o PIN sempre que você abrir de novo.'
    : 'Nenhum PIN configurado. Qualquer pessoa que abrir o app vê seus dados.';
  document.getElementById('btn-set-pin').textContent = has ? '🔒 Alterar PIN' : '🔒 Criar PIN';
  document.getElementById('btn-remove-pin').style.display = has ? 'block' : 'none';
}

document.getElementById('btn-set-pin').addEventListener('click', () => {
  document.getElementById('set-pin-1').value = '';
  document.getElementById('set-pin-2').value = '';
  openModal('modal-set-pin');
});

document.getElementById('btn-save-pin').addEventListener('click', async () => {
  const p1 = document.getElementById('set-pin-1').value;
  const p2 = document.getElementById('set-pin-2').value;
  if (!/^\d{4}$/.test(p1)) {
    await appAlert('O PIN deve ter exatamente 4 números.');
    return;
  }
  if (p1 !== p2) {
    await appAlert('Os PINs não coincidem.');
    return;
  }
  localStorage.setItem('finapp_pin', p1);
  sessionStorage.setItem('finapp_unlocked', '1');
  closeModal('modal-set-pin');
  renderPinStatus();
});

document.getElementById('btn-remove-pin').addEventListener('click', async () => {
  if (!(await appConfirm('Remover o bloqueio por PIN?', { danger: true }))) return;
  localStorage.removeItem('finapp_pin');
  renderPinStatus();
});

// -------- Init --------
document.getElementById('btn-toggle-hide').textContent = state.hideValues ? '🙈' : '👁️';

// Antes de renderizar: credita as recargas de vale que venceram enquanto o app
// esteve fechado, para a tela já abrir com o saldo e a receita corretos.
const recharged = applyPendingRecharges();
const incomes = applyPendingIncomes();

renderAll();

const avisos = [];
if (recharged.creditedCount > 0) {
  avisos.push(
    `🔄 ${recharged.creditedCount === 1 ? 'Recarga creditada' : recharged.creditedCount + ' recargas creditadas'}: ` +
      `${Calc.fmtBRL(recharged.creditedTotal)} no saldo dos seus vales, contando como receita.`
  );
}
if (incomes.count > 0) {
  avisos.push(
    `💼 ${incomes.count === 1 ? 'Receita lançada' : incomes.count + ' receitas lançadas'}: ${Calc.fmtBRL(incomes.total)} de receitas recorrentes.`
  );
}
if (avisos.length > 0) appAlert(avisos.join('\n\n'));
updateNotifStatus();
handleNotificationLaunchParams();
maybeShowInstallModal();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then(() => checkAndNotifyDueToday())
      .catch((e) => console.warn('SW falhou', e));
  });
} else {
  checkAndNotifyDueToday();
}
