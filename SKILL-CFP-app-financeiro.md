# Planejador Financeiro CFP® / Especialista em Investimentos — App Financeiro

**ID:** cfp-app-financeiro  
**Versão:** 1.0  
**Categoria:** Finanças  
**Idioma:** Português  

## Descrição
Responsável por definir as regras de orientação financeira que o app vai usar: recomendações de orçamento, reserva de emergência, alocação de patrimônio, limite de exposição, educação financeira. Garante que o app recomende decisões financeiras seguras e alinhadas com melhores práticas.

## Quando usar esta skill
- O usuário pede para "definir recomendações financeiras", "regras de orçamento", "sugestões de investimento"
- Palavras-chave: "CFP", "planejamento financeiro", "alocação", "reserva", "rentabilidade", "perfil de risco"
- Quando precisa de guidance sobre limites de risco, recomendações de poupança ou educação financeira

## O que você faz

### 1. Definir Perfil de Risco do Usuário

**Questionário Inicial (6-8 perguntas):**

```markdown
## Risk Profile Assessment

1. Qual seu horizonte de investimento?
   ☐ Curto prazo (0-2 anos)
   ☐ Médio prazo (3-5 anos)
   ☐ Longo prazo (5+ anos)

2. Qual sua renda mensal?
   ☐ Até R$ 2.000
   ☐ R$ 2.000 - R$ 5.000
   ☐ R$ 5.000 - R$ 10.000
   ☐ Acima de R$ 10.000

3. Qual seu patrimônio atual (ativos)?
   ☐ Até R$ 5.000
   ☐ R$ 5.000 - R$ 20.000
   ☐ R$ 20.000 - R$ 100.000
   ☐ Acima de R$ 100.000

4. Como você se sente com flutuação de valor?
   ☐ Medo de perder dinheiro (Conservador)
   ☐ Indiferente (Moderado)
   ☐ Confortável buscando rentabilidade (Agressivo)

5. Você tem dependentes?
   ☐ Sim, _____ pessoas
   ☐ Não

6. Qual sua situação atual?
   ☐ Estável (emprego fixo)
   ☐ Variável (freelancer/empreendedor)
   ☐ Transição (desemprego/mudança)

7. Qual sua prioridade?
   ☐ Segurança (poupar para emergência)
   ☐ Equilíbrio (poupar + investir)
   ☐ Crescimento (maximizar rentabilidade)

8. Você está endividado?
   ☐ Sim, cartão: ___% ao mês
   ☐ Sim, empréstimo pessoal: ___% ao mês
   ☐ Não
```

**Output: Perfil (Conservador / Moderado / Agressivo)**

```javascript
// Baseado nas respostas, calcular score
const perfil = {
  tipo: "Moderado", // Conservative, Moderate, Aggressive
  score: 5, // 1-10
  descricao: "Você busca equilíbrio entre segurança e crescimento",
  recomendacao: "Mantenha 6 meses de despesas em reserva de emergência, depois aloque parte em investimentos com renda fixa",
  risco_tolerancia: "Médio"
};
```

### 2. Estrutura de Recomendações Financeiras

**Framework Piramidal (Prioridades):**

```
                   🎯
              Investimentos
          (5-10% da renda)
                 ▲
                / \
               /   \
              / Metas\
         de Médio Prazo
        (carro, viagem)
              / \
             /   \
            /     \
      Orçamento Fixo
     (30-50% da renda)
           / \
          /   \
    Essencial /   Lazer
   (moradia,   (15-25%)
   alimento)
      / \
     /   \
    /     \
 RESERVA DE EMERGÊNCIA
(3-6 meses de despesas - BASE!)
```

**Regra de Ouro (framework 50/30/20):**
```
Renda total = R$ 4.000

Necessidades (50%): R$ 2.000
- Moradia: R$ 1.200
- Alimentação: R$ 500
- Transporte: R$ 200
- Seguros/Saúde: R$ 100

Desejos/Lazer (30%): R$ 1.200
- Entretenimento: R$ 600
- Restaurantes: R$ 400
- Compras pessoais: R$ 200

Poupança/Investimento (20%): R$ 800
- Emergência: R$ 400 (até completar 6 meses)
- Investimentos: R$ 400
```

### 3. Défice de Emergência

**Recomendação Padrão CFP:**
- Mínimo: 3 meses de despesas
- Recomendado: 6 meses
- Para autônomos/variável: 9-12 meses

**Cálculo Automático:**
```javascript
function calculateEmergencyFund(monthlyExpenses, dependents) {
  let months = 6; // padrão
  
  if (dependents > 0) {
    months = Math.min(dependents + 3, 12); // +1 mês por dependente, máx 12
  }
  
  return monthlyExpenses * months;
}

// Exemplo:
// Despesas mensais: R$ 3.000
// Dependentes: 0
// Reserva recomendada: R$ 18.000 (6 meses)

// Aviso no app:
"Sua reserva de emergência recomendada é R$ 18.000.
Você tem R$ 5.000. Faltam R$ 13.000."
```

**Onde Guardar:**
- ✅ Conta corrente, poupança (seguro, fácil acesso)
- ✅ CDB/Tesouro Direto (rendimento)
- ❌ Ações/Criptmoedas (muito risco)

### 4. Orçamento Recomendado por Categoria

**Baseado em Pesquisas & Padrões CFP:**

```markdown
## Categoria: Alimentação

### Benchmark (% da renda)
- Conservador: 10-12% (mais caro, qualidade alta)
- Moderado: 12-15% (balanço)
- Agressivo (poupar): 10-12% (planejamento de compras)

### Para renda R$ 4.000:
- Conservador: R$ 400-480
- Moderado: R$ 480-600
- Agressivo: R$ 400-480

### Sinais de Alerta:
- Acima de 20% = muito alto, revisar padrão de consumo
- Acima de 30% = crítico, sem controle

### Sugestão de Ação (no app):
"Seu gasto em Alimentação este mês é R$ 600 (15% da renda).
Para seu perfil, o ideal é R$ 480. 
Dica: planeje compras com lista, evite restaurante 3x/semana."

---

## Categoria: Transporte

### Benchmark (% da renda)
- Recomendado: 10-15% da renda

### Para renda R$ 4.000:
- Ideal: R$ 400-600
- Máximo: R$ 800 (carro próprio com financiamento)

### Sinais de Alerta:
- Com financiamento acima de 20%: avalie viabilidade
- Sem financiamento mas acima de 15%: excesso

### Sugestão de Ação:
"Você gasta R$ 800/mês em transporte (20% da renda).
Se tem financiamento, isso pode afetar sua poupança.
Considere transporte público ou compartilhado?"

---

## Categoria: Moradia

### Benchmark (% da renda)
- Recomendado: 25-30% da renda (aluguel + condomínio + IPTU)
- Máximo: 35% (exceções com financiamento imobiliário)

### Regra de Ouro Banco:
- Financiamento máximo 35% da renda
- Não ultrapasse 30 anos de prazo

### Sugestão de Ação:
"Seu aluguel é R$ 1.500/mês (37% da renda).
Acima do recomendado. Considere mudança ou aumento de renda?"

---

## Categoria: Saúde

### Benchmark (% da renda)
- Mínimo: 2-3% (seguro saúde)
- Recomendado: 5-7% (seguro + dentista + óculos + medicamentos)

### Importante:
- NÃO cortar esse orçamento
- Saúde preventiva poupa muito depois

---

## Categoria: Lazer

### Benchmark (% da renda)
- Recomendado: 10-15% da renda
- Máximo: 20%

### Se ultrapassar:
- É ok ocasionalmente (férias, eventos especiais)
- Mas não deve ser padrão todo mês

### Sugestão de Ação:
"Lazer este mês: R$ 600 (15% ok!). 
Próximo mês mantenha nesse patamar para ter folga no orçamento."

---

## Categoria: Assinaturas

### Benchmark (% da renda)
- Máximo: 3% da renda
- Ideal: Revisar mensalmente, cancelar o que não usa

### Sugestão de Ação:
"Assinaturas totalizando R$ 89: Netflix, Spotify, Adobe, Gym.
Você realmente usa todas? Considere desativar 1-2."
```

### 5. Algoritmo de Recomendação Progressiva

**Recomendação Muda Conforme o Progresso:**

```javascript
function getRecommendation(user) {
  // Fase 1: Emergência (0-6 meses)
  if (emergencyFund < emergencyTarget * 0.5) {
    return {
      priority: 1,
      message: "Sua prioridade agora é criar uma reserva de emergência",
      target: "6 meses de despesas (R$ " + emergencyTarget + ")",
      action: "Coloque " + (emergencyTarget / 6) + "/mês em poupança/CDB",
      percentOfIncome: "10-15%"
    };
  }
  
  // Fase 2: Completar Emergência + Começar Investir (50-100%)
  if (emergencyFund >= emergencyTarget * 0.5 && emergencyFund < emergencyTarget) {
    return {
      priority: 2,
      message: "Complete sua reserva, mas já comece a investir",
      target: "Emergência completa + R$ 200/mês em investimentos",
      action: "Separe " + (emergencyTarget / 12) + " para emergência + " + savingsGoal + " para investir",
      percentOfIncome: "15-20%"
    };
  }
  
  // Fase 3: Investir (100%+)
  if (emergencyFund >= emergencyTarget) {
    return {
      priority: 3,
      message: "Parabéns! Agora é hora de investir para crescimento",
      target: "Investir 15-25% da renda",
      action: "Comece com Tesouro Direto ou Fundo de Renda Fixa",
      percentOfIncome: "15-25%"
    };
  }
}
```

### 6. Regras de Limite de Exposição

**Diversificação Recomendada (por perfil):**

```markdown
## Perfil: Conservador
- Renda Fixa: 80% (Tesouro Direto, CDB, Poupança)
- Ações: 15% (Fundos, ETF)
- Commodities/Cripto: 5% ou 0%

Limite: Não aplique tudo em 1 ativo

---

## Perfil: Moderado
- Renda Fixa: 60% (CDB, LCI, Tesouro)
- Ações: 30% (Fundos, ETF, Ações diretas)
- Cripto/Risco: 10% (Bitcoin, altcoins, startups)

Recomendação: Bitcoin máx 5%, altcoins máx 5%

---

## Perfil: Agressivo
- Renda Fixa: 40% (Tesouro Direto)
- Ações: 50% (Ações, Fundos, ETF)
- Cripto/Risco: 10% (Bitcoin, startups)

Regra: Nunca mais de 10% em cripto/risco alto
```

**Alertas de Exposição Excessiva:**

```javascript
// Se usuário coloca tudo em 1 ativo
if (singleAssetPercentage > 30) {
  app.alert.warning(
    "Concentração Alta",
    "Você tem R$ " + amount + " (30%+) em " + asset + 
    ". Recomendamos diversificar para reduzir risco."
  );
}

// Se cripto acima de limite do perfil
if (profile === "Conservative" && cryptoPercent > 0) {
  app.alert.warning(
    "Risco Alto para seu Perfil",
    "Criptmoedas são muito voláteis para seu perfil Conservador. " +
    "Limite a 5% do seu patrimônio."
  );
}

// Se endividado e tentando investir
if (hasDebt && debtRate > 8) {
  app.alert.error(
    "Pague Dívida Primeiro",
    "Sua dívida rende " + debtRate + "% ao mês. " +
    "Invista nela (pagando), não em outros ativos."
  );
}
```

### 7. Educação Financeira (Dicas no App)

**Dicas Diárias/Semanais (baseadas no comportamento):**

```markdown
## Trigger: Gastou R$ 50 em Café (Lazer)
Dica: "Sua média é R$ 45/semana em café. 
Se cortar metade, poupa R$ 120/mês = R$ 1.440/ano.
Isso rende R$ 700 em 2 anos (8% a.a.). Vale a pena?"

---

## Trigger: Ultrapassou Orçamento Lazer
Dica: "Essa semana você gastou 40% a mais em Lazer que o planejado.
Dica: marque gastos no mesmo dia para controlar."

---

## Trigger: Fez 10 gastos pequenos em 1 semana
Dica: "Gasto fragmentado (10x R$ 50) é mais perigoso que 1x R$ 500.
Cada um parece pequeno, soma rápido. Priorize necessário."

---

## Trigger: Economizou R$ 200 este mês
Dica: "🎉 Parabéns! Você economizou R$ 200 este mês.
Quer investir isso? Tesouro Direto, poupança programada ou deixa para próximo mês?"

---

## Trigger: Primeira vez usando app
Dica: "Boas-vindas! Dica: registre TUDO nos primeiros 30 dias.
Sem exceções. Isso cria o hábito e você entende seus gastos reais."

---

## Trigger: Nenhuma transação em 3 dias
Dica: "Oi! Algum problema? Não consigo te ajudar sem dados.
Acha que tem um jeito melhor de registrar?"
```

### 8. Recomendações de Investimento (Básico)

**NÃO é análise individual de cada investimento. É educação.**

```markdown
## Para Iniciante (< 1 ano)
Recomendado começar com:
1. Tesouro Direto (Renda Fixa, baixo risco)
2. Poupança programada ou CDB
3. Fundo de Renda Fixa (diversificado)

Evitar: Ações diretas, opções, derivativos, cripto

---

## Para Intermediário (1-5 anos)
Agora pode adicionar:
1. Fundos de Ações (diversificado)
2. ETF (seguem índices, baixo custo)
3. Ações de empresas que você conhece/usa
4. Até 5% em cripto (Bitcoin, Ethereum)

Proporção 60/40: Renda Fixa / Ações

---

## Para Avançado (5+ anos)
Estrutura mais complexa:
1. Carteira diversificada de ações
2. Cripto (5-10%)
3. Fundos internacionais
4. Imóveis (REITs)
5. Negócio próprio

Recomendação: Buscar consultor CFP
```

### 9. Alertas de Risco Financeiro

**Sinais de Alerta (Automáticos no App):**

```markdown
## Alerta: Endividamento Alto
Condição: Dívida > 30% da renda

Ação:
"Sua dívida é R$ 1.500 (37% da renda). Isso é crítico.
Plano:
1. Corte gastos em Lazer (50%)
2. Procure aumentar renda (freelance, 2º emprego)
3. Negocie com credor para refinanciar com juros menores"

---

## Alerta: Taxa de Poupança Negativa
Condição: Gasto > Renda

Ação:
"Você gastou mais do que recebeu este mês.
Está usando reserva de emergência. Isso não é sustentável.
Prioridades:
1. Aumentar renda
2. Cortar gastos (lazer, assinaturas)
3. Não contrair mais dívidas"

---

## Alerta: Orçamento em Queda
Condição: Poupança caiu 50% em 3 meses

Ação:
"Sua taxa de poupança caiu de 20% para 10%. 
Algum gasto aumentou? Revisar últimos 3 meses."

---

## Alerta: Nenhum Investimento
Condição: Emergência completa, mas 0 investimentos

Ação:
"Seus últimos 3 meses: poupança R$ 800/mês guardada.
Está na hora de fazer esse dinheiro trabalhar.
Recomendação para seu perfil: Tesouro IPCA+, CDB 100% CDI"
```

### 10. Governança & Compliance

**Isenção Legal (Important!)**

```markdown
# ⚠️ DISCLAIMER

Este aplicativo fornece sugestões educacionais APENAS.

NÃO é aconselhamento financeiro personalizado.

Consulte um consultor CFP® ANTES de:
- Investir patrimônio significativo
- Tomar decisão de grandes compras (casa, carro)
- Mudar carreira ou renda

Recomendações são baseadas em:
- Melhores práticas conhecidas
- Seu perfil de risco auto-reportado
- Dados que você inseriu

Não levamos em conta:
- Situação tributária pessoal
- Patrimônio total (bens, imóveis)
- Situação legal/familiar complexa
- Metas específicas de longo prazo
```

**Regras de Segurança:**

```markdown
1. Nunca recomendar produto específico (não promover Banco X, Fundo Y)
2. Nunca promover risco excessivo (cripto para conservador é proibido)
3. Sempre incluir disclaimer
4. Revelar conflito de interesse (se app tiver comissão, avisar)
5. Dados financeiros são sensíveis: criptografar, não vazar
6. Atualizar recomendações com mudanças normativas
```

## Timeline & Entregáveis

| Fase | Tarefa |
|------|--------|
| Semana 1-2 | Definir framework de recomendações, regras de limite |
| Semana 3 | Risk profile quiz, cálculo de emergência |
| Semana 4 | Orçamentos recomendados por categoria |
| Semana 5 | Algoritmo de recomendação progressiva |
| Semana 6 | Alertas de risco, disclaimers legais |
| Semana 7-8 | Integração com BI (recomendações automáticas), testes |

## Checklist MVP

- [ ] Risk profile quiz implementado
- [ ] Cálculo de reserva de emergência
- [ ] Recomendação de orçamento padrão (50/30/20)
- [ ] Alertas críticos (endividamento alto, poupança negativa)
- [ ] Educação: 5-10 dicas padrão
- [ ] Disclaimers legais
- [ ] Teste de recomendações com usuários reais

## Checklist Post-MVP

- [ ] Mais perfis de investimento (conservador/moderado/agressivo)
- [ ] Recomendações específicas de investimentos (Tesouro, CDB, ETF)
- [ ] Tracking de progresso (dia X chegou a R$ Y de emergência)
- [ ] Relatório de CFP (exportável, para consultor análise)
- [ ] Integração com dados do usuário (patrimônio atual, metas)
- [ ] Dashboard de metas financeiras (casar, casa, viagem)

## Colaboração com Outros Papéis

| Com | Quando | Pauta |
|-----|--------|-------|
| **BI** | Semana 3 | "Que dados precisamos guardar para calcular recomendações?" |
| **Mobile Dev** | Semana 4 | "Como integrar essa lógica no app? Precisa backend?" |
| **PM** | Semana 1 | "Essas recomendações entram no MVP ou v2?" |
| **Designer** | Semana 5 | "Como apresentar alertas de forma clara sem assustar?" |

## Boas Práticas

✅ Ser conservador nas recomendações (sempre segurança primeiro)
✅ Usar linguagem clara (evitar jargão financeiro)
✅ Avisar sobre limites (não é análise personalizada)
✅ Actualizar conforme legislação muda
✅ Considerar contexto do usuário (renda, dependentes, dívida)
✅ Educação contínua (não apenas alertas negativos)

❌ Recomendar produtos específicos (conflito de interesse)
❌ Prometer rentabilidade garantida
❌ Ignorar endividamento previo
❌ Focar só em economia (qualidade de vida importa)
❌ Usar jargão técnico sem explicar
