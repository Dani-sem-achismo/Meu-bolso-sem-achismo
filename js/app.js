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
};

// Formata um valor com a moeda do próprio registro (sem conversão), respeitando o modo oculto
function fmtCurrency(value, currencyCode) {
  const meta = Storage.getCurrency(currencyCode);
  return state.hideValues ? '••••••' : Calc.fmtMoney(value, meta);
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
  cadastro: 'Cadastro',
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
  document.getElementById('fab-add').style.display = name === 'more' || name === 'cadastro' ? 'none' : 'flex';
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
          `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.type === 'carteira' ? '👛' : '🏦'} ${a.name} (${Calc.fmtMoney(a.balance, Storage.getCurrency(a.currency))})</option>`
      )
      .join('');
}

function renderTxCurrencyChips() {
  const currencies = Storage.getCurrencies();
  const wrap = document.getElementById('tx-currency-wrap');
  const isCardPayment = state.txType === 'expense' && CARD_PAYMENT_METHODS.includes(state.txPayment);
  wrap.style.display = currencies.length > 1 && !isCardPayment ? 'block' : 'none';
  document.getElementById('tx-currency-chips').innerHTML = currencies
    .map((c) => `<div class="chip ${c.code === state.txCurrency ? 'selected' : ''}" data-currency="${c.code}">${c.symbol} ${c.code}</div>`)
    .join('');
  document.querySelectorAll('#tx-currency-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => setTxCurrency(chip.dataset.currency));
  });
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

function reverseTransactionEffects(tx) {
  if (tx.accountId) {
    Storage.adjustAccountBalance(tx.accountId, tx.type === 'income' ? -tx.amount : tx.amount);
  }
  if (tx.cardId) {
    const card = Storage.getCards().find((c) => c.id === tx.cardId);
    if (card && card.kind !== 'credito') Storage.adjustCardBalance(tx.cardId, tx.amount);
  }
}

function applyTransactionEffects(tx) {
  if (tx.accountId) {
    Storage.adjustAccountBalance(tx.accountId, tx.type === 'income' ? tx.amount : -tx.amount);
  }
  if (tx.cardId) {
    const card = Storage.getCards().find((c) => c.id === tx.cardId);
    if (card && card.kind !== 'credito') Storage.adjustCardBalance(tx.cardId, -tx.amount);
  }
}

function deleteTransactionById(id) {
  const tx = Storage.getTransaction(id);
  if (!tx) return;
  if (!confirm('Apagar este lançamento? Essa ação não pode ser desfeita.')) return;
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
  renderTxCurrencyChips();
}

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

document.getElementById('btn-save-tx').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('tx-amount').value);
  if (!amount || amount <= 0) {
    alert('Informe um valor válido.');
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
    document.getElementById('inv-date').value = inv.date;
    document.getElementById('inv-rate').value = inv.rate || '';
    document.getElementById('inv-maturity').value = inv.maturity || '';
    sel.value = inv.assetClass;
    liqSel.value = inv.liquidity || 'Diária';
    state.invCurrency = inv.currency || 'BRL';
    renderInvCurrencyChips();
    setInvMovement(inv.movement);
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('inv-modal-title').textContent = 'Novo aporte / resgate';
    document.getElementById('inv-amount').value = '';
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-date').value = todayISO();
    document.getElementById('inv-rate').value = '';
    document.getElementById('inv-maturity').value = '';
    state.invCurrency = 'BRL';
    renderInvCurrencyChips();
    setInvMovement('aporte');
    deleteBtn.style.display = 'none';
  }
  openModal('modal-inv');
}

function renderInvCurrencyChips() {
  const currencies = Storage.getCurrencies();
  const wrap = document.getElementById('inv-currency-wrap');
  wrap.style.display = currencies.length > 1 ? 'block' : 'none';
  document.getElementById('inv-currency-chips').innerHTML = currencies
    .map((c) => `<div class="chip ${c.code === state.invCurrency ? 'selected' : ''}" data-currency="${c.code}">${c.symbol} ${c.code}</div>`)
    .join('');
  document.querySelectorAll('#inv-currency-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.invCurrency = chip.dataset.currency;
      renderInvCurrencyChips();
    });
  });
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
  const patch = {
    amount,
    assetClass: document.getElementById('inv-class').value,
    name: document.getElementById('inv-name').value.trim(),
    date: document.getElementById('inv-date').value || todayISO(),
    movement: state.invMovement,
    liquidity: document.getElementById('inv-liquidity').value,
    rate: document.getElementById('inv-rate').value.trim(),
    maturity: document.getElementById('inv-maturity').value || null,
    currency: state.invCurrency,
  };
  if (state.editingInvId) {
    Storage.updateInvestment(state.editingInvId, patch);
  } else {
    Storage.addInvestment(patch);
  }
  closeModal('modal-inv');
  renderAll();
});

document.getElementById('btn-delete-inv').addEventListener('click', () => {
  if (!state.editingInvId) return;
  if (!confirm('Apagar este registro de investimento?')) return;
  Storage.deleteInvestment(state.editingInvId);
  closeModal('modal-inv');
  renderAll();
});

// ==================== CONTAS A PAGAR ====================

function openBillModal(editId) {
  state.editingBillId = editId || null;
  const deleteBtn = document.getElementById('btn-delete-bill');
  if (editId) {
    const bill = Storage.getBills().find((b) => b.id === editId);
    if (!bill) return;
    document.getElementById('bill-modal-title').textContent = 'Editar conta';
    document.getElementById('bill-name').value = bill.name;
    document.getElementById('bill-amount').value = bill.amount;
    document.getElementById('bill-day').value = bill.dueDay;
    state.billCategory = bill.category;
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('bill-modal-title').textContent = 'Nova conta a pagar';
    document.getElementById('bill-name').value = '';
    document.getElementById('bill-amount').value = '';
    document.getElementById('bill-day').value = '';
    state.billCategory = Storage.getCategories()[0].name;
    deleteBtn.style.display = 'none';
  }
  renderBillCategories();
  openModal('modal-bill');
}
document.getElementById('btn-add-bill').addEventListener('click', () => openBillModal());

document.getElementById('btn-delete-bill').addEventListener('click', () => {
  if (!state.editingBillId) return;
  if (!confirm('Apagar esta conta a pagar?')) return;
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

document.getElementById('btn-save-bill').addEventListener('click', () => {
  const name = document.getElementById('bill-name').value.trim();
  const amount = parseFloat(document.getElementById('bill-amount').value);
  const dueDay = parseInt(document.getElementById('bill-day').value);
  if (!name || !amount || amount <= 0 || !dueDay || dueDay < 1 || dueDay > 31) {
    alert('Preencha nome, valor e um dia de vencimento válido (1-31).');
    return;
  }
  if (state.editingBillId) {
    Storage.updateBill(state.editingBillId, { name, amount, dueDay, category: state.billCategory });
  } else {
    Storage.addBill({ name, amount, dueDay, category: state.billCategory });
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

  listEl.querySelectorAll('[data-edit-bill]').forEach((el) => {
    el.addEventListener('click', () => openBillModal(el.dataset.editBill));
  });

  listEl.querySelectorAll('[data-pay-bill]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
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

function openAccountModal(editId) {
  state.editingAccountId = editId || null;
  const deleteBtn = document.getElementById('btn-delete-account');
  const currencies = Storage.getCurrencies();
  const currencySel = document.getElementById('account-currency');
  currencySel.innerHTML = currencies.map((c) => `<option value="${c.code}">${c.symbol} ${c.code}</option>`).join('');
  document.getElementById('account-currency-wrap').style.display = currencies.length > 1 ? 'block' : 'none';

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
    document.getElementById('account-type').value = 'banco';
    document.getElementById('account-balance').value = '';
    currencySel.value = 'BRL';
    deleteBtn.style.display = 'none';
  }
  openModal('modal-account');
}
document.getElementById('btn-add-account').addEventListener('click', () => openAccountModal());

document.getElementById('btn-save-account').addEventListener('click', () => {
  const name = document.getElementById('account-name').value.trim();
  const type = document.getElementById('account-type').value;
  const balance = parseFloat(document.getElementById('account-balance').value) || 0;
  const currency = document.getElementById('account-currency').value || 'BRL';
  if (!name) {
    alert('Dê um nome para a conta/carteira.');
    return;
  }
  if (state.editingAccountId) {
    Storage.updateAccount(state.editingAccountId, { name, type, balance, currency });
  } else {
    Storage.addAccount({ name, type, balance, currency });
  }
  closeModal('modal-account');
  renderAll();
});

document.getElementById('btn-delete-account').addEventListener('click', () => {
  if (!state.editingAccountId) return;
  if (!confirm('Apagar esta conta/carteira? Lançamentos já registrados não serão apagados.')) return;
  Storage.deleteAccount(state.editingAccountId);
  closeModal('modal-account');
  renderAll();
});

function renderAccounts() {
  const accounts = Storage.getAccounts();
  const totalBRL = accounts.filter((a) => (a.currency || 'BRL') === 'BRL').reduce((s, a) => s + Number(a.balance), 0);
  document.getElementById('accounts-total').textContent = maskCurrency(totalBRL);

  const byCurrency = {};
  accounts.forEach((a) => {
    const code = a.currency || 'BRL';
    if (code === 'BRL') return;
    byCurrency[code] = (byCurrency[code] || 0) + Number(a.balance);
  });
  document.getElementById('accounts-other-currencies').innerHTML = Object.entries(byCurrency)
    .map(([code, val]) => `<div class="sub-line">${fmtCurrency(val, code)} em ${code}</div>`)
    .join('');

  const listEl = document.getElementById('accounts-list');
  listEl.innerHTML = accounts.length
    ? accounts
        .map(
          (a) => `
      <div class="tx-item" data-edit-account="${a.id}" style="cursor:pointer;">
        <div class="tx-left">
          <div class="tx-icon">${a.type === 'carteira' ? '👛' : '🏦'}</div>
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
    setCardKind(card.kind);
    deleteBtn.style.display = 'block';
  } else {
    document.getElementById('card-modal-title').textContent = 'Novo cartão';
    document.getElementById('card-name').value = '';
    document.getElementById('card-due-day').value = '';
    document.getElementById('card-limit').value = '';
    document.getElementById('card-deposit').value = '';
    document.getElementById('card-balance').value = '';
    setCardKind('credito');
    deleteBtn.style.display = 'none';
  }
  openModal('modal-card');
}
document.getElementById('btn-add-card').addEventListener('click', () => openCardModal());

document.getElementById('btn-save-card').addEventListener('click', () => {
  const name = document.getElementById('card-name').value.trim();
  if (!name) {
    alert('Dê um nome para o cartão.');
    return;
  }
  let patch;
  if (state.cardKind === 'credito') {
    const dueDay = parseInt(document.getElementById('card-due-day').value);
    const limit = parseFloat(document.getElementById('card-limit').value) || 0;
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      alert('Informe um dia de vencimento válido (1-31).');
      return;
    }
    patch = { name, kind: 'credito', dueDay, limit };
  } else {
    const monthlyDeposit = parseFloat(document.getElementById('card-deposit').value) || 0;
    const balance = parseFloat(document.getElementById('card-balance').value) || 0;
    patch = { name, kind: state.cardKind, monthlyDeposit, balance };
  }
  if (state.editingCardId) {
    Storage.updateCard(state.editingCardId, patch);
  } else {
    Storage.addCard(patch);
  }
  closeModal('modal-card');
  renderAll();
});

document.getElementById('btn-delete-card').addEventListener('click', () => {
  if (!state.editingCardId) return;
  if (!confirm('Apagar este cartão? Lançamentos já registrados não serão apagados.')) return;
  Storage.deleteCard(state.editingCardId);
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
        <div class="cat-row" data-edit-card="${c.id}" style="display:block;cursor:pointer;">
          <div class="cat-name">${kindInfo.icon} ${c.name}</div>
          <div class="cat-values">Vence dia ${c.dueDay} · usado ${maskCurrency(outstanding)} / ${maskCurrency(c.limit)} · disponível ${maskCurrency(available)}</div>
          <div class="progress-bar"><div class="progress-fill ${statusClass}" style="width:${Math.min(Math.max(pct, 0), 100)}%"></div></div>
        </div>`;
      }
      return `
      <div class="tx-item" data-edit-card="${c.id}" style="cursor:pointer;">
        <div class="tx-left">
          <div class="tx-icon">${kindInfo.icon}</div>
          <div>
            <div class="tx-desc">${c.name}</div>
            <div class="tx-date">${kindInfo.label}${c.monthlyDeposit ? ' · cai ' + maskCurrency(c.monthlyDeposit) + '/mês' : ''}</div>
          </div>
        </div>
        <div class="tx-amount income">${maskCurrency(c.balance)}</div>
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('[data-edit-card]').forEach((el) => {
    el.addEventListener('click', () => openCardModal(el.dataset.editCard));
  });
}

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

document.getElementById('btn-save-category').addEventListener('click', () => {
  const name = document.getElementById('category-name').value.trim();
  const icon = document.getElementById('category-icon').value.trim() || '🏷️';
  const pct = parseFloat(document.getElementById('category-pct').value) || 0;
  if (!name) {
    alert('Dê um nome para a categoria.');
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

document.getElementById('btn-delete-category').addEventListener('click', () => {
  if (!state.editingCategoryName) return;
  if (!confirm('Apagar esta categoria? Lançamentos já feitos com ela continuam guardados, só não vai mais aparecer para escolher.')) return;
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

document.getElementById('btn-save-income-category').addEventListener('click', () => {
  const name = document.getElementById('income-category-name').value.trim();
  const icon = document.getElementById('income-category-icon').value.trim() || '➕';
  if (!name) {
    alert('Dê um nome para o tipo de receita.');
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

document.getElementById('btn-delete-income-category').addEventListener('click', () => {
  if (!state.editingIncomeCategoryName) return;
  if (!confirm('Apagar este tipo de receita?')) return;
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

document.getElementById('btn-save-currency').addEventListener('click', () => {
  const code = document.getElementById('currency-code').value.trim().toUpperCase();
  const symbol = document.getElementById('currency-symbol').value.trim();
  const decimals = parseInt(document.getElementById('currency-decimals').value);
  if (!code || !symbol) {
    alert('Preencha código e símbolo da moeda.');
    return;
  }
  if (state.editingCurrencyCode) {
    Storage.updateCurrencyFull(state.editingCurrencyCode, { code, symbol, decimals });
  } else {
    if (Storage.getCurrencies().find((c) => c.code === code)) {
      alert('Já existe uma moeda com esse código.');
      return;
    }
    Storage.addCurrency(code, symbol, decimals);
  }
  closeModal('modal-currency');
  renderAll();
});

document.getElementById('btn-delete-currency').addEventListener('click', () => {
  if (!state.editingCurrencyCode || state.editingCurrencyCode === 'BRL') return;
  if (!confirm('Apagar esta moeda? Lançamentos já feitos nela continuam guardados, só não vai mais aparecer para escolher.')) return;
  Storage.deleteCurrency(state.editingCurrencyCode);
  closeModal('modal-currency');
  renderAll();
});

function renderCurrenciesList() {
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
  const month = state.viewMonth;
  const isCurrentMonth = month === Calc.currentMonthKey();
  const transactions = Storage.getTransactions();
  const budgets = Storage.getBudgetsForMonth(month);

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
  const budgetStatuses = Calc.budgetStatus(budgets, transactions, month);
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
  const alertsEl = document.getElementById('dash-alerts');
  alertsEl.innerHTML = alerts.length
    ? alerts.map((a) => `<div class="alert ${a.severity}">${a.message}</div>`).join('')
    : !isCurrentMonth
    ? `<div class="alert info">Você está vendo ${Calc.monthLabel(month)}. Toque em "Hoje" para voltar ao mês atual.</div>`
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
        <div class="tx-left" data-edit-tx="${t.id}" style="cursor:pointer;">
          <div class="tx-icon">${t.type === 'income' ? '💰' : catIcon(t.category)}</div>
          <div>
            <div class="tx-desc">${t.description || t.category}</div>
            <div class="tx-date">${Calc.parseLocalDate(t.date).toLocaleDateString('pt-BR')}${paymentTag}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${fmtCurrency(t.amount, t.currency)}</div>
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

  const byCurrency = Calc.investmentTotalsByCurrency(investments);
  const otherEntries = Object.entries(byCurrency).filter(([code]) => code !== 'BRL');
  document.getElementById('inv-other-currencies').innerHTML = otherEntries.length
    ? otherEntries
        .map(([code, val]) => `<div class="sub-line">${Calc.fmtMoney(val, Storage.getCurrency(code))} investido em ${code}</div>`)
        .join('')
    : '';

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
  renderMonthNav();
  renderDashboard();
  if (state.screen === 'budgets') renderBudgets();
  if (state.screen === 'investments') renderInvestments();
  if (state.screen === 'cadastro') {
    renderAccounts();
    renderCards();
    renderExpenseCategories();
    renderIncomeCategories();
    renderCurrenciesList();
    renderBills();
  }
  if (state.screen === 'more') {
    loadProfileForm();
    renderProfileRecommendation();
    renderPinStatus();
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
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById('input-import-backup').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (err) {
      alert('Arquivo inválido. Selecione um backup exportado por este app.');
      return;
    }
    if (!confirm('Isso vai substituir todos os dados atuais do app pelos do backup. Continuar?')) return;
    BACKUP_KEYS.forEach((key) => localStorage.removeItem(key));
    Object.entries(data).forEach(([key, rawValue]) => {
      if (BACKUP_KEYS.includes(key)) localStorage.setItem(key, rawValue);
    });
    alert('Backup importado! O app vai recarregar.');
    location.reload();
  };
  reader.readAsText(file);
});

// ==================== COMO USAR ====================

document.getElementById('btn-open-help').addEventListener('click', () => openModal('modal-help'));

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
          return `
      <div class="tx-item">
        <div class="tx-left" data-hedit-tx="${t.id}" style="cursor:pointer;">
          <div class="tx-icon">${t.type === 'income' ? '💰' : catIcon(t.category)}</div>
          <div>
            <div class="tx-desc">${t.description || t.category}</div>
            <div class="tx-date">${Calc.parseLocalDate(t.date).toLocaleDateString('pt-BR')}${paymentTag}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${Calc.fmtMoney(t.amount, Storage.getCurrency(t.currency))}</div>
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

function lockKeyPress(digit) {
  if (lockPinBuffer.length >= 4) return;
  lockPinBuffer += digit;
  renderLockDots();
  document.getElementById('lock-error').textContent = '';
  if (lockPinBuffer.length === 4) {
    setTimeout(() => {
      if (lockPinBuffer === localStorage.getItem('finapp_pin')) {
        sessionStorage.setItem('finapp_unlocked', '1');
        document.getElementById('lock-screen').style.display = 'none';
      } else {
        document.getElementById('lock-error').textContent = 'PIN incorreto.';
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

document.getElementById('btn-forgot-pin').addEventListener('click', () => {
  if (!confirm('Isso remove o PIN de acesso (seus dados continuam salvos normalmente). Continuar?')) return;
  localStorage.removeItem('finapp_pin');
  sessionStorage.setItem('finapp_unlocked', '1');
  document.getElementById('lock-screen').style.display = 'none';
  renderPinStatus();
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

document.getElementById('btn-save-pin').addEventListener('click', () => {
  const p1 = document.getElementById('set-pin-1').value;
  const p2 = document.getElementById('set-pin-2').value;
  if (!/^\d{4}$/.test(p1)) {
    alert('O PIN deve ter exatamente 4 números.');
    return;
  }
  if (p1 !== p2) {
    alert('Os PINs não coincidem.');
    return;
  }
  localStorage.setItem('finapp_pin', p1);
  sessionStorage.setItem('finapp_unlocked', '1');
  closeModal('modal-set-pin');
  renderPinStatus();
});

document.getElementById('btn-remove-pin').addEventListener('click', () => {
  if (!confirm('Remover o bloqueio por PIN?')) return;
  localStorage.removeItem('finapp_pin');
  renderPinStatus();
});

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
