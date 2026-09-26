// Métricas (estilo BI) + regras de orientação financeira (estilo CFP), tudo calculado no cliente.

// Datas guardadas como 'YYYY-MM-DD' devem ser lidas no fuso local, nunca em UTC
// (new Date('YYYY-MM-DD') interpreta como UTC meia-noite, o que "volta" um dia
// em fusos negativos como o do Brasil). Toda leitura de data-only passa por aqui.
function parseLocalDate(dateInput) {
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
  }
  return new Date(dateInput);
}

function toLocalISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(date) {
  const d = parseLocalDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthKey() {
  return monthKey(new Date());
}

function prevMonthKey(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function fmtBRL(value) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Formata valor com o símbolo/casas decimais da moeda (sem depender de Intl reconhecer o código,
// já que moedas como BTC não são ISO 4217). currencyMeta = { code, symbol, decimals }.
function fmtMoney(value, currencyMeta) {
  const meta = currencyMeta || { symbol: 'R$', decimals: 2 };
  if (meta.symbol === 'R$') return fmtBRL(value);
  const num = (Number(value) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${meta.symbol} ${num}`;
}

function daysInMonth(year, monthIndex1based) {
  return new Date(year, monthIndex1based, 0).getDate();
}

// Último dia do mês 'YYYY-MM' como 'YYYY-MM-DD'. É a data em que o vale é recarregado.
// Fevereiro, meses de 30 e de 31 dias saem certos porque daysInMonth resolve cada caso.
function lastDayOfMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
}

// Quais recargas de um cartão de benefício ainda não foram creditadas.
// Só entra mês cujo último dia JÁ passou (ou é hoje) — nunca adianta recarga.
// A varredura começa no mês em que a recarga automática foi ligada, então ligar
// hoje não faz aparecer crédito retroativo de meses anteriores.
function pendingRechargeMonths(card, todayStr) {
  if (!card || card.kind === 'credito') return [];
  if (!card.autoRecharge || !(Number(card.monthlyDeposit) > 0)) return [];

  const done = card.rechargedMonths || [];
  const start = card.rechargeSince || monthKey(parseLocalDate(todayStr));
  const current = monthKey(parseLocalDate(todayStr));

  const pending = [];
  let m = start;
  // Teto de 24 iterações: protege contra rechargeSince corrompido virar laço infinito.
  for (let i = 0; i < 24 && m <= current; i++) {
    if (!done.includes(m) && lastDayOfMonth(m) <= todayStr) pending.push(m);
    m = shiftMonth(m, 1);
  }
  return pending;
}

// Meses em que uma receita recorrente já deveria ter caído e ainda não foi lançada.
// Mesma regra dos vales: só mês cujo dia de pagamento já chegou, nunca adiantado,
// e a varredura começa quando a recorrência foi criada (sem retroativo surpresa).
function pendingIncomeMonths(item, todayStr) {
  if (!item || item.active === false) return [];
  if (!(Number(item.amount) > 0) || !item.payDay) return [];

  const done = item.postedMonths || [];
  const current = monthKey(parseLocalDate(todayStr));
  const start = item.since || current;

  const pending = [];
  let m = start;
  for (let i = 0; i < 24 && m <= current; i++) {
    const [y, mm] = m.split('-').map(Number);
    // Dia 31 em mês de 30 cai no último dia, mesma regra das contas a pagar.
    const day = Math.min(item.payDay, daysInMonth(y, mm));
    const dateStr = `${m}-${String(day).padStart(2, '0')}`;
    if (!done.includes(m) && dateStr <= todayStr) pending.push({ month: m, date: dateStr });
    m = shiftMonth(m, 1);
  }
  return pending;
}

// Data de vencimento da conta para um mês 'YYYY-MM', ajustando o dia se o mês for mais curto
function billDueDateForMonth(bill, month) {
  const [y, m] = month.split('-').map(Number);
  const day = Math.min(bill.dueDay, daysInMonth(y, m));
  return new Date(y, m - 1, day);
}

// Em qual fatura uma compra cai. Toda fatura fecha automaticamente 6 dias antes
// do vencimento (padrão comum entre os bancos) — sem precisar cadastrar nada.
function cardInvoiceForDate(card, dateStr) {
  const d = parseLocalDate(dateStr);
  const candidateMonth = monthKey(d);
  const candidateDue = billDueDateForMonth({ dueDay: card.dueDay }, candidateMonth);
  const closing = new Date(candidateDue);
  closing.setDate(closing.getDate() - 6);

  let dueDate = candidateDue;
  if (d > closing) {
    const nextMonth = monthKey(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    dueDate = billDueDateForMonth({ dueDay: card.dueDay }, nextMonth);
  }
  return { month: monthKey(dueDate), dueDate };
}

// Soma amount + n meses, preservando o dia (usado para parcelas de cartão)
function addMonthsToDate(dateStr, n) {
  const d = parseLocalDate(dateStr);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = daysInMonth(target.getFullYear(), target.getMonth() + 1);
  target.setDate(Math.min(day, lastDay));
  return toLocalISODate(target);
}

// Divide um valor em N parcelas iguais, jogando o resto de arredondamento na última
function splitInstallments(amount, installments) {
  const base = Math.floor((amount / installments) * 100) / 100;
  const parts = new Array(installments).fill(base);
  const remainder = Math.round((amount - base * installments) * 100) / 100;
  parts[parts.length - 1] = Math.round((parts[parts.length - 1] + remainder) * 100) / 100;
  return parts;
}

const Calc = {
  monthKey,
  currentMonthKey,
  fmtBRL,
  fmtMoney,
  billDueDateForMonth,
  cardInvoiceForDate,
  addMonthsToDate,
  splitInstallments,
  parseLocalDate,
  toLocalISODate,
  shiftMonth,
  monthLabel,
  lastDayOfMonth,
  pendingRechargeMonths,
  pendingIncomeMonths,
  prevMonthKey,
  daysInMonth,

  // --- Pagamento parcial ---
  // Quanto já foi pago de uma conta fixa no mês. partialPaid = { 'YYYY-MM': valor }.
  billPaidSoFar(bill, month) {
    return Number(((bill && bill.partialPaid) || {})[month] || 0);
  },
  // Valor da conta no mês: o informado no 1º pagamento parcial (luz varia) ou o cadastrado.
  billAmountForMonth(bill, month) {
    const custom = ((bill && bill.monthAmount) || {})[month];
    return custom != null ? Number(custom) : Number((bill && bill.amount) || 0);
  },
  billRemaining(bill, month) {
    if ((bill.paidMonths || []).includes(month)) return 0;
    return Math.max(Math.round((Calc.billAmountForMonth(bill, month) - Calc.billPaidSoFar(bill, month)) * 100) / 100, 0);
  },
  cardPaidSoFar(card, month) {
    return Number(((card && card.partialPaid) || {})[month] || 0);
  },

  // Resultado de um pagamento dividido em várias formas: quanto está sendo pago agora,
  // quanto fica faltando e se a conta fecha. Tolerância de meio centavo para arredondamento.
  // Pagar a mais (multa, juros) também quita.
  paymentSplitSummary(lines, total, alreadyPaid = 0) {
    const round2 = (v) => Math.round(v * 100) / 100;
    const valid = (lines || []).filter((l) => Number(l.amount) > 0);
    const paying = round2(valid.reduce((sum, l) => sum + Number(l.amount), 0));
    const remainingBefore = round2(Math.max(total - alreadyPaid, 0));
    const remainingAfter = round2(Math.max(remainingBefore - paying, 0));
    return { paying, remainingBefore, remainingAfter, settles: paying > 0 && remainingAfter <= 0.005, lines: valid };
  },

  // Alertas de contas a pagar: vencida, vence hoje, ou vence em até 3 dias
  billAlerts(bills, month) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bills
      .filter((b) => b.active !== false && !b.paidMonths.includes(month))
      .map((b) => {
        const due = billDueDateForMonth(b, month);
        const diffDays = Math.round((due - today) / 86400000);
        const paidSoFar = Calc.billPaidSoFar(b, month);
        const owed = Calc.billRemaining(b, month);
        const valor = paidSoFar > 0 ? `faltam ${fmtBRL(owed)} de ${fmtBRL(Calc.billAmountForMonth(b, month))}` : fmtBRL(owed);
        let severity = null;
        let message = null;
        if (diffDays < 0) {
          severity = 'critical';
          message = `${b.name} venceu em ${due.toLocaleDateString('pt-BR')} (${valor}) e ainda não foi ${paidSoFar > 0 ? 'quitada' : 'paga'}.`;
        } else if (diffDays === 0) {
          severity = 'critical';
          message = `${b.name} vence hoje (${valor}).`;
        } else if (diffDays <= 3) {
          severity = 'warning';
          message = `${b.name} vence em ${diffDays} dia${diffDays > 1 ? 's' : ''} (${due.toLocaleDateString('pt-BR')}), ${valor}.`;
        }
        return severity ? { severity, message, billId: b.id, due, diffDays } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.diffDays - b.diffDays);
  },

  transactionsForMonth(transactions, month) {
    return transactions.filter((t) => monthKey(t.date) === month);
  },

  // Duas perguntas diferentes que antes compartilhavam a mesma conta:
  //
  //   cardInvoiceTotal  -> "quanto vence NESTE mês?"  (só as parcelas do mês)
  //   cardCommitted     -> "quanto do limite está preso?" (mês atual + parcelas futuras)
  //
  // Somar as parcelas futuras na fatura fazia o alerta de vencimento cobrar
  // R$ 300 de uma compra de R$ 300 em 3x, quando o que vence é R$ 100.
  //
  // Ambas somam só a moeda pedida: misturar R$, US$ e ₿ num total só contradiz
  // a regra do app de nunca converter moeda (ver DEFAULT_CURRENCIES em storage.js).
  cardInvoiceTotal(cardId, transactions, month = currentMonthKey(), currency = 'BRL') {
    return transactions
      .filter((t) => t.cardId === cardId && t.type === 'expense' && (t.currency || 'BRL') === currency && monthKey(t.date) === month)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  },

  cardCommitted(cardId, transactions, currency = 'BRL') {
    const month = currentMonthKey();
    return transactions
      .filter((t) => t.cardId === cardId && t.type === 'expense' && (t.currency || 'BRL') === currency && monthKey(t.date) >= month)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  },

  cardAvailableLimit(card, transactions) {
    const committed = Calc.cardCommitted(card.id, transactions);
    const invoice = Calc.cardInvoiceTotal(card.id, transactions);
    return { outstanding: committed, committed, invoice, available: (card.limit || 0) - committed };
  },

  // Alertas de vencimento de fatura dos cartões de crédito
  cardAlerts(cards, transactions) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const month = currentMonthKey();
    return cards
      .filter((c) => c.kind === 'credito' && c.dueDay && !(c.paidMonths || []).includes(month))
      .map((c) => {
        const due = billDueDateForMonth({ dueDay: c.dueDay }, month);
        const diffDays = Math.round((due - today) / 86400000);
        // O alerta fala do que vence agora — parcelas de meses futuros não entram.
        const outstanding = Math.round((Calc.cardInvoiceTotal(c.id, transactions, month) - Calc.cardPaidSoFar(c, month)) * 100) / 100;
        if (outstanding <= 0) return null;
        let severity = null;
        let message = null;
        if (diffDays < 0) {
          severity = 'critical';
          message = `Fatura do ${c.name} venceu em ${due.toLocaleDateString('pt-BR')} (${fmtBRL(outstanding)}).`;
        } else if (diffDays === 0) {
          severity = 'critical';
          message = `Fatura do ${c.name} vence hoje (${fmtBRL(outstanding)}).`;
        } else if (diffDays <= 3) {
          severity = 'warning';
          message = `Fatura do ${c.name} vence em ${diffDays} dia${diffDays > 1 ? 's' : ''} (${due.toLocaleDateString('pt-BR')}), ${fmtBRL(outstanding)}.`;
        }
        return severity ? { severity, message, cardId: c.id, diffDays } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.diffDays - b.diffDays);
  },

  totalByType(transactions, month, type, currency = 'BRL') {
    return Calc.transactionsForMonth(transactions, month)
      .filter((t) => t.type === type && (t.currency || 'BRL') === currency)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  },

  totalsByCategory(transactions, month, type = 'expense', currency = 'BRL') {
    const list = Calc.transactionsForMonth(transactions, month).filter((t) => t.type === type && (t.currency || 'BRL') === currency);
    const map = {};
    for (const t of list) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    }
    return map;
  },

  // Totais por moeda (sem conversão): usado pra mostrar "+ US$ 50, ₿ 0,01" separado do total em R$
  totalsByCurrency(transactions, month, type) {
    const list = Calc.transactionsForMonth(transactions, month).filter((t) => t.type === type);
    const map = {};
    for (const t of list) {
      const code = t.currency || 'BRL';
      map[code] = (map[code] || 0) + Number(t.amount);
    }
    return map;
  },

  // Contas fixas ainda não pagas que vão cair na categoria no mês. Mês passado
  // não entra: conta que não foi paga lá é atraso, não previsão. Aporte de
  // investimento também não, porque não é gasto.
  committedBillsByCategory(bills, month) {
    const map = {};
    if (!bills || month < currentMonthKey()) return map;
    for (const b of bills) {
      if (b.active === false || b.isInvestment) continue;
      const owed = Calc.billRemaining(b, month);
      if (owed <= 0) continue;
      map[b.category] = (map[b.category] || 0) + owed;
    }
    return map;
  },

  // Status do orçamento: OK (<80%), AVISO (80-100%), ULTRAPASSADO (>100%).
  // percent/status olham só o que já foi gasto; projected* somam as contas fixas
  // que ainda vão vencer no mês ("vou estourar quando pagar a luz?").
  budgetStatus(budgets, transactions, month, bills = []) {
    const totals = Calc.totalsByCategory(transactions, month);
    const committedMap = Calc.committedBillsByCategory(bills, month);
    const statusFor = (pct) => (pct > 100 ? 'ULTRAPASSADO' : pct >= 80 ? 'AVISO' : 'OK');
    return budgets
      .filter((b) => b.month === month)
      .map((b) => {
        const spent = totals[b.category] || 0;
        const committed = committedMap[b.category] || 0;
        const projected = spent + committed;
        const percent = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
        const projectedPercent = b.limitAmount > 0 ? (projected / b.limitAmount) * 100 : 0;
        return {
          category: b.category,
          limitAmount: b.limitAmount,
          spent,
          committed,
          projected,
          remaining: b.limitAmount - projected,
          percent,
          projectedPercent,
          status: statusFor(percent),
          projectedStatus: statusFor(projectedPercent),
        };
      })
      .sort((a, b) => b.projectedPercent - a.projectedPercent);
  },

  // Sugere tirar limite de categorias com folga para cobrir as que vão estourar.
  // Sempre a partir do previsto (gasto + contas a vencer), para não sugerir tirar
  // dinheiro de uma categoria que ainda tem conta para pagar. Não deixa a doadora
  // com menos de 10% do limite dela de margem — zerar a folga só empurra o problema.
  reallocationSuggestions(statuses) {
    const round2 = (v) => Math.round(v * 100) / 100;
    const donors = statuses
      .filter((s) => s.limitAmount > 0)
      .map((s) => ({ category: s.category, slack: s.limitAmount - s.projected - s.limitAmount * 0.1 }))
      .filter((d) => d.slack >= 1)
      .sort((a, b) => b.slack - a.slack);
    const moves = [];
    const needers = statuses.filter((s) => s.projected > s.limitAmount).sort((a, b) => b.projected - b.limitAmount - (a.projected - a.limitAmount));
    for (const n of needers) {
      let need = n.projected - n.limitAmount;
      for (const d of donors) {
        if (need <= 0.005) break;
        if (d.slack < 1) continue;
        const amount = round2(Math.min(need, d.slack));
        d.slack -= amount;
        need -= amount;
        moves.push({ from: d.category, to: n.category, amount });
      }
      if (need > 0.005) moves.push({ from: null, to: n.category, amount: round2(need) });
    }
    return moves;
  },

  // Quanto guardar por mês e de onde tirar. Entradas são números já agregados
  // (a tela monta a partir do storage), o que deixa a regra testável sozinha.
  //   income           renda líquida mensal
  //   fixedBills       contas fixas mensais (sem aportes)
  //   investmentBills  aportes programados já cadastrados como conta
  //   installments     parcelas de cartão que caem no mês
  //   avgExpenses      média de gasto dos meses fechados (null se não há histórico)
  //   variableByCategory { categoria: média mensal } dos gastos que não são conta fixa
  //   recommendedPct   { categoria: % da renda sugerido }
  //   emergencyGap     quanto falta para a reserva de emergência
  savingsPlan({ income, fixedBills = 0, investmentBills = 0, installments = 0, avgExpenses = null, variableByCategory = {}, recommendedPct = {}, emergencyGap = 0, targetPct = 20 }) {
    if (!(income > 0)) return null;
    const round2 = (v) => Math.round(v * 100) / 100;
    const target = round2((income * targetPct) / 100);
    const committed = fixedBills + installments;
    const variable = avgExpenses !== null ? Math.max(avgExpenses - fixedBills, 0) : null;
    // Aporte programado já é poupança: conta a favor da meta, não contra.
    const estimatedSavings = variable !== null ? round2(income - committed - variable) : null;
    const gap = estimatedSavings !== null ? round2(Math.max(target - estimatedSavings, 0)) : null;
    const freeForVariable = round2(income - committed - target);

    // Cortes: primeiro onde o gasto passa do sugerido para a renda, cortando
    // o excesso (e não mais do que ele) até cobrir o que falta.
    const cuts = [];
    if (gap > 0) {
      let left = gap;
      const over = Object.entries(variableByCategory)
        .map(([category, avg]) => {
          const pct = recommendedPct[category] != null ? recommendedPct[category] : 5;
          const ideal = (income * pct) / 100;
          return { category, avg, excess: avg - ideal };
        })
        .filter((c) => c.excess > 1)
        .sort((a, b) => b.excess - a.excess);
      for (const c of over) {
        if (left <= 0.005) break;
        const cut = round2(Math.min(c.excess, left));
        left -= cut;
        cuts.push({ category: c.category, current: round2(c.avg), suggested: round2(c.avg - cut), cut });
      }
    }
    const cutsTotal = round2(cuts.reduce((s, c) => s + c.cut, 0));

    const monthly = Math.max(target - investmentBills, 0);
    const monthsToReserve = emergencyGap > 0 && target > 0 ? Math.ceil(emergencyGap / target) : 0;
    return {
      target,
      targetPct,
      committed: round2(committed),
      fixedBills: round2(fixedBills),
      installments: round2(installments),
      investmentBills: round2(investmentBills),
      toSetAside: round2(monthly),
      variable: variable !== null ? round2(variable) : null,
      estimatedSavings,
      gap,
      freeForVariable,
      cuts,
      uncovered: gap !== null ? round2(Math.max(gap - cutsTotal, 0)) : null,
      monthsToReserve,
      committedPct: round2((committed / income) * 100),
    };
  },

  // Projeção de gasto até o fim do mês, baseada no ritmo atual
  projectionEndOfMonth(transactions, month) {
    const now = new Date();
    const isCurrent = month === currentMonthKey();
    // parseLocalDate e não new Date('YYYY-MM-01'): este último lê como UTC e volta
    // um dia em fuso negativo, que é justamente o bug que parseLocalDate evita.
    const dayOfMonth = isCurrent ? now.getDate() : parseLocalDate(month + '-01').getDate();
    const daysInMonth = new Date(
      Number(month.split('-')[0]),
      Number(month.split('-')[1]),
      0
    ).getDate();
    const spentSoFar = Calc.totalByType(transactions, month, 'expense');
    if (!isCurrent || dayOfMonth === 0) return spentSoFar;
    return (spentSoFar / dayOfMonth) * daysInMonth;
  },

  comparisonPrevMonth(transactions, month) {
    const prev = prevMonthKey(month);
    const atual = Calc.totalByType(transactions, month, 'expense');
    const passado = Calc.totalByType(transactions, prev, 'expense');
    const diff = atual - passado;
    const pct = passado > 0 ? (diff / passado) * 100 : null;
    return { atual, passado, diff, pct };
  },

  savingsRate(transactions, month, income) {
    const spent = Calc.totalByType(transactions, month, 'expense');
    const renda = income || Calc.totalByType(transactions, month, 'income');
    if (!renda) return null;
    return ((renda - spent) / renda) * 100;
  },

  // --- Investimentos ---
  investmentSummary(investments, currency = 'BRL') {
    const byClass = {};
    let total = 0;
    for (const inv of investments) {
      if ((inv.currency || 'BRL') !== currency) continue;
      const signal = inv.movement === 'resgate' ? -1 : 1;
      const val = Number(inv.amount) * signal;
      byClass[inv.assetClass] = (byClass[inv.assetClass] || 0) + val;
      total += val;
    }
    return { byClass, total };
  },

  // Agrupa por corretora (quem não informou cai em "Sem corretora")
  investmentSummaryByBroker(investments, currency = 'BRL') {
    const byBroker = {};
    let total = 0;
    for (const inv of investments) {
      if ((inv.currency || 'BRL') !== currency) continue;
      const signal = inv.movement === 'resgate' ? -1 : 1;
      const val = Number(inv.amount) * signal;
      const broker = inv.broker && inv.broker.trim() ? inv.broker.trim() : 'Sem corretora';
      byBroker[broker] = (byBroker[broker] || 0) + val;
      total += val;
    }
    return { byBroker, total };
  },

  // Agrupa por nome do ativo (soma aportes recorrentes do mesmo investimento, ex: previdência mensal)
  investmentSummaryByName(investments, currency = 'BRL') {
    const byName = {};
    for (const inv of investments) {
      if ((inv.currency || 'BRL') !== currency) continue;
      const signal = inv.movement === 'resgate' ? -1 : 1;
      const val = Number(inv.amount) * signal;
      const name = inv.name && inv.name.trim() ? inv.name.trim() : inv.assetClass;
      if (!byName[name]) byName[name] = { total: 0, count: 0, assetClass: inv.assetClass, maturity: inv.maturity || null };
      byName[name].total += val;
      byName[name].count += 1;
      if (inv.maturity && (!byName[name].maturity || inv.maturity > byName[name].maturity)) {
        byName[name].maturity = inv.maturity;
      }
    }
    return byName;
  },

  // Total investido por moeda, sem conversão (ex: R$ 12.000 + US$ 1.200 + ₿ 0,05, cada um separado)
  investmentTotalsByCurrency(investments) {
    const map = {};
    for (const inv of investments) {
      const code = inv.currency || 'BRL';
      const signal = inv.movement === 'resgate' ? -1 : 1;
      map[code] = (map[code] || 0) + Number(inv.amount) * signal;
    }
    return map;
  },

  investmentAlerts(investments, riskProfile) {
    const { byClass, total } = Calc.investmentSummary(investments);
    const alerts = [];
    if (total <= 0) return alerts;
    for (const [cls, val] of Object.entries(byClass)) {
      const pct = (val / total) * 100;
      if (pct > 50) {
        alerts.push({
          severity: 'warning',
          message: `Você tem ${pct.toFixed(0)}% do seu patrimônio investido em ${cls}. Considere diversificar para reduzir risco.`,
        });
      }
      if (cls === 'Cripto') {
        const limit = riskProfile === 'Conservador' ? 0 : riskProfile === 'Moderado' ? 10 : 15;
        if (pct > limit) {
          alerts.push({
            severity: 'warning',
            message: `Cripto representa ${pct.toFixed(0)}% da carteira, acima do recomendado (${limit}%) para o perfil ${riskProfile}.`,
          });
        }
      }
    }
    return alerts;
  },

  // --- Orientação CFP-lite ---
  // 6 meses é o piso, não o teto. A conta antiga (dependentes + 3) devolvia 4 meses
  // para quem tem 1 dependente — menos do que para quem não tem nenhum, que é o
  // oposto da intenção. Agora dependente só acrescenta.
  emergencyFundTarget(monthlyExpenses, dependents) {
    const months = Math.min(6 + Math.max(Number(dependents) || 0, 0), 12);
    return monthlyExpenses * months;
  },

  // Base mensal de gastos para a meta de reserva.
  // Usar o mês corrente fazia a meta ser quase zero no dia 1 e ir engordando até
  // o dia 31 — a reserva ideal mudava todo dia. Aqui só entram meses FECHADOS,
  // com média dos até 3 últimos, para a meta ficar estável.
  averageMonthlyExpenses(transactions, monthsBack = 3) {
    const current = currentMonthKey();
    const closed = [];
    for (let i = 1; i <= monthsBack; i++) {
      const m = shiftMonth(current, -i);
      const total = Calc.totalByType(transactions, m, 'expense');
      if (Calc.transactionsForMonth(transactions, m).length > 0) closed.push(total);
    }
    if (closed.length === 0) return null;
    return closed.reduce((a, b) => a + b, 0) / closed.length;
  },

  suggestion503020(income) {
    return {
      necessidades: income * 0.5,
      desejos: income * 0.3,
      poupancaInvestimento: income * 0.2,
    };
  },

  // Recomendação priorizada (reserva → equilíbrio → investir), baseada no progresso
  progressRecommendation({ emergencyBalance, emergencyTarget, hasDebt, debtHigh, hasCheapDebt }) {
    if (hasDebt && debtHigh) {
      return {
        priority: 0,
        message: 'Priorize quitar dívidas caras antes de investir — os juros normalmente superam qualquer rentabilidade.',
      };
    }
    // Dívida barata não justifica parar de investir: financiamento e consignado
    // costumam cobrar menos do que um investimento conservador rende.
    if (hasCheapDebt && emergencyTarget > 0 && emergencyBalance >= emergencyTarget) {
      return {
        priority: 3,
        message:
          'Reserva completa e só dívidas baratas (financiamento/consignado). Não há pressa em antecipar essas parcelas: compare a taxa do contrato com o que seu investimento rende antes de decidir.',
      };
    }
    if (emergencyTarget <= 0) {
      return { priority: 1, message: 'Registre seus gastos fixos para calcularmos sua reserva de emergência ideal.' };
    }
    const ratio = emergencyBalance / emergencyTarget;
    if (ratio < 0.5) {
      return {
        priority: 1,
        message: `Prioridade: construir reserva de emergência. Meta: ${fmtBRL(emergencyTarget)}. Você tem ${fmtBRL(emergencyBalance)} (${(ratio * 100).toFixed(0)}%).`,
      };
    }
    if (ratio < 1) {
      return {
        priority: 2,
        message: `Você já tem ${(ratio * 100).toFixed(0)}% da reserva de emergência. Complete a reserva e comece a investir uma parte pequena.`,
      };
    }
    return {
      priority: 3,
      message: 'Reserva de emergência completa! Agora foque em investir 15-25% da renda para crescimento de patrimônio.',
    };
  },

  // Simulação "posso gastar isso?": compara o impacto do gasto (1ª parcela, se parcelado)
  // contra o que resta no orçamento da categoria este mês.
  canSpend({ amount, installments, budgetStatus }) {
    const parts = splitInstallments(amount, installments || 1);
    const monthlyImpact = parts[0];

    if (!budgetStatus) {
      return {
        canSpend: null,
        monthlyImpact,
        message: 'Nenhum orçamento definido para essa categoria ainda. Configure um limite em Orçamento para eu poder avaliar.',
      };
    }

    // Conta fixa que ainda vai vencer na categoria já está "gasta": sem isso o
    // app dizia "pode gastar" e a conta de luz estourava o orçamento depois.
    const committed = budgetStatus.committed || 0;
    const remaining = budgetStatus.limitAmount - budgetStatus.spent - committed;
    const remainingAfter = remaining - monthlyImpact;
    const parcelaTxt = installments > 1 ? ` (1ª de ${installments} parcelas de ${fmtBRL(monthlyImpact)})` : '';
    const contasTxt = committed > 0 ? `, já descontando ${fmtBRL(committed)} de contas previstas` : '';

    if (remainingAfter >= 0) {
      return {
        canSpend: true,
        monthlyImpact,
        remainingAfter,
        message: `Pode gastar${parcelaTxt}. Depois desse gasto sobram ${fmtBRL(remainingAfter)} no orçamento de ${budgetStatus.category} este mês${contasTxt}.`,
      };
    }
    return {
      canSpend: false,
      monthlyImpact,
      remainingAfter,
      message: `Vai estourar o orçamento de ${budgetStatus.category}${parcelaTxt} em ${fmtBRL(Math.abs(remainingAfter))}. Hoje restam ${fmtBRL(Math.max(remaining, 0))} nessa categoria${contasTxt}.`,
    };
  },

  budgetAlerts(budgetStatuses) {
    return budgetStatuses
      .filter((b) => b.status !== 'OK' || (b.projectedStatus && b.projectedStatus === 'ULTRAPASSADO'))
      .map((b) => {
        if (b.status === 'ULTRAPASSADO') {
          return {
            severity: 'critical',
            message: `Você ultrapassou o orçamento de ${b.category} em ${fmtBRL(b.spent - b.limitAmount)} (${(b.percent - 100).toFixed(0)}% acima).`,
          };
        }
        if (b.projectedStatus === 'ULTRAPASSADO') {
          return {
            severity: 'warning',
            message: `${b.category} vai estourar em ${fmtBRL(b.projected - b.limitAmount)} quando as contas previstas (${fmtBRL(b.committed)}) forem pagas.`,
          };
        }
        return { severity: 'warning', message: `${b.category} está em ${b.percent.toFixed(0)}% do orçamento.` };
      });
  },

  // Efeito de um aporte/resgate no saldo da conta de origem/destino:
  // aporte tira dinheiro da conta, resgate devolve.
  investmentAccountDelta(inv) {
    if (!inv || !inv.accountId) return 0;
    return (inv.movement === 'resgate' ? 1 : -1) * Number(inv.amount || 0);
  },
};
