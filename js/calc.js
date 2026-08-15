// Métricas (estilo BI) + regras de orientação financeira (estilo CFP), tudo calculado no cliente.

function monthKey(date) {
  const d = new Date(date);
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

function fmtBRL(value) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const Calc = {
  monthKey,
  currentMonthKey,
  fmtBRL,

  transactionsForMonth(transactions, month) {
    return transactions.filter((t) => monthKey(t.date) === month);
  },

  totalByType(transactions, month, type) {
    return Calc.transactionsForMonth(transactions, month)
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  },

  totalsByCategory(transactions, month) {
    const expenses = Calc.transactionsForMonth(transactions, month).filter((t) => t.type === 'expense');
    const map = {};
    for (const t of expenses) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
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
  investmentSummary(investments) {
    const byClass = {};
    let total = 0;
    for (const inv of investments) {
      const signal = inv.movement === 'resgate' ? -1 : 1;
      const val = Number(inv.amount) * signal;
      byClass[inv.assetClass] = (byClass[inv.assetClass] || 0) + val;
      total += val;
    }
    return { byClass, total };
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
