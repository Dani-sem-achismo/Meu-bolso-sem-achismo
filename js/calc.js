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

// Data de vencimento da conta para um mês 'YYYY-MM', ajustando o dia se o mês for mais curto
function billDueDateForMonth(bill, month) {
  const [y, m] = month.split('-').map(Number);
  const day = Math.min(bill.dueDay, daysInMonth(y, m));
  return new Date(y, m - 1, day);
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
  addMonthsToDate,
  splitInstallments,
  parseLocalDate,
  toLocalISODate,
  shiftMonth,
  monthLabel,

  // Alertas de contas a pagar: vencida, vence hoje, ou vence em até 3 dias
  billAlerts(bills, month) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bills
      .filter((b) => b.active !== false && !b.paidMonths.includes(month))
      .map((b) => {
        const due = billDueDateForMonth(b, month);
        const diffDays = Math.round((due - today) / 86400000);
        let severity = null;
        let message = null;
        if (diffDays < 0) {
          severity = 'critical';
          message = `${b.name} venceu em ${due.toLocaleDateString('pt-BR')} (${fmtBRL(b.amount)}) e ainda não foi paga.`;
        } else if (diffDays === 0) {
          severity = 'critical';
          message = `${b.name} vence hoje (${fmtBRL(b.amount)}).`;
        } else if (diffDays <= 3) {
          severity = 'warning';
          message = `${b.name} vence em ${diffDays} dia${diffDays > 1 ? 's' : ''} (${due.toLocaleDateString('pt-BR')}), ${fmtBRL(b.amount)}.`;
        }
        return severity ? { severity, message, billId: b.id, due, diffDays } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.diffDays - b.diffDays);
  },

  transactionsForMonth(transactions, month) {
    return transactions.filter((t) => monthKey(t.date) === month);
  },

  // Saldo em aberto do cartão de crédito: soma das parcelas do mês atual em diante
  // (meses passados são considerados já pagos/fechados)
  cardOutstanding(cardId, transactions) {
    const month = currentMonthKey();
    return transactions
      .filter((t) => t.cardId === cardId && t.type === 'expense' && monthKey(t.date) >= month)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  },

  cardAvailableLimit(card, transactions) {
    const outstanding = Calc.cardOutstanding(card.id, transactions);
    return { outstanding, available: Math.max((card.limit || 0) - outstanding, -Infinity) };
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
        const { outstanding } = Calc.cardAvailableLimit(c, transactions);
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

  // Status do orçamento: OK (<80%), AVISO (80-100%), ULTRAPASSADO (>100%)
  budgetStatus(budgets, transactions, month) {
    const totals = Calc.totalsByCategory(transactions, month);
    return budgets
      .filter((b) => b.month === month)
      .map((b) => {
        const spent = totals[b.category] || 0;
        const percent = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
        let status = 'OK';
        if (percent > 100) status = 'ULTRAPASSADO';
        else if (percent >= 80) status = 'AVISO';
        return { category: b.category, limitAmount: b.limitAmount, spent, percent, status };
      })
      .sort((a, b) => b.percent - a.percent);
  },

  // Projeção de gasto até o fim do mês, baseada no ritmo atual
  projectionEndOfMonth(transactions, month) {
    const now = new Date();
    const isCurrent = month === currentMonthKey();
    const dayOfMonth = isCurrent ? now.getDate() : new Date(month + '-01').getDate();
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
  emergencyFundTarget(monthlyExpenses, dependents) {
    let months = 6;
    if (dependents > 0) months = Math.min(dependents + 3, 12);
    return monthlyExpenses * months;
  },

  suggestion503020(income) {
    return {
      necessidades: income * 0.5,
      desejos: income * 0.3,
      poupancaInvestimento: income * 0.2,
    };
  },

  // Recomendação priorizada (reserva → equilíbrio → investir), baseada no progresso
  progressRecommendation({ emergencyBalance, emergencyTarget, hasDebt, debtHigh }) {
    if (hasDebt && debtHigh) {
      return {
        priority: 0,
        message: 'Priorize quitar dívidas caras antes de investir — os juros normalmente superam qualquer rentabilidade.',
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

    const remaining = budgetStatus.limitAmount - budgetStatus.spent;
    const remainingAfter = remaining - monthlyImpact;
    const parcelaTxt = installments > 1 ? ` (1ª de ${installments} parcelas de ${fmtBRL(monthlyImpact)})` : '';

    if (remainingAfter >= 0) {
      return {
        canSpend: true,
        monthlyImpact,
        remainingAfter,
        message: `Pode gastar${parcelaTxt}. Depois desse gasto sobram ${fmtBRL(remainingAfter)} no orçamento de ${budgetStatus.category} este mês.`,
      };
    }
    return {
      canSpend: false,
      monthlyImpact,
      remainingAfter,
      message: `Vai estourar o orçamento de ${budgetStatus.category}${parcelaTxt} em ${fmtBRL(Math.abs(remainingAfter))}. Hoje restam ${fmtBRL(Math.max(remaining, 0))} nessa categoria.`,
    };
  },

  budgetAlerts(budgetStatuses) {
    return budgetStatuses
      .filter((b) => b.status !== 'OK')
      .map((b) => ({
        severity: b.status === 'ULTRAPASSADO' ? 'critical' : 'warning',
        message:
          b.status === 'ULTRAPASSADO'
            ? `Você ultrapassou o orçamento de ${b.category} em ${fmtBRL(b.spent - b.limitAmount)}.`
            : `${b.category} está em ${b.percent.toFixed(0)}% do orçamento.`,
      }));
  },
};
