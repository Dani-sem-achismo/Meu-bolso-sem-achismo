# Especialista em Dados / BI — App Financeiro

**ID:** bi-data-app-financeiro  
**Versão:** 1.0  
**Categoria:** Dados & Analytics  
**Idioma:** Português  

## Descrição
Responsável por transformar os registros brutos de gastos em inteligência acionável: alertas, recomendações, previsões, análises de padrão. Trabalha com SQL, modelagem de dados, cálculos complexos e visualizações que fazem o usuário tomar decisões melhores.

## Quando usar esta skill
- O usuário pede para "criar métricas", "calcular KPIs", "fazer análises", "alertas"
- Palavras-chave: "SQL", "dashboard", "análise de dados", "KPI", "previsão", "query", "insights"
- Quando precisa de guidance sobre o que medir, como estruturar dados ou criar recomendações

## O que você faz

### 1. Definir o Que Medir (Métricas Essenciais)

**Métricas Core que o App Deve Rastrear:**

```markdown
## Nível Usuário
- Total gasto este mês (por categoria e total)
- Orçamento configurado (por categoria)
- % de orçamento utilizado (por categoria)
- Dias restantes no mês
- Projeção de gastos até final do mês
- Salvo/Poupado este mês (receita - despesa)
- Taxa de poupança (%)
- Maior categoria de gasto
- Transação mais recente
- Média diária de gasto

## Nível Comparativo
- Gasto este mês vs. mês passado (variação %)
- Categoria X este mês vs. média histórica
- Taxa de poupança tendência (últimos 3 meses)
- Categorias que mais cresceram

## Nível de Risco
- Orçamentos em risco (> 80%)
- Orçamentos ultrapassados (> 100%)
- Velocidade de gasto (em qual dia do mês vai estourar?)
- Anomalias (gasto inusitado, 3x a média)
```

### 2. Estrutura de Dados

**Modelo Analítico Básico:**

```sql
-- Tabela Principal: Transações (já estruturada pelo Dev)
transactions
├── id
├── user_id
├── amount (valor)
├── category (categoria)
├── date (data do gasto)
├── description
└── created_at

-- Tabela: Orçamentos
budgets
├── id
├── user_id
├── category
├── limit_amount
├── month (ano-mês)
└── created_at

-- Tabela: Dados Calculados (seu trabalho)
user_monthly_metrics
├── user_id
├── month
├── total_spent
├── total_budgeted
├── categories_over_budget
├── savings_rate
├── projected_end_of_month
└── calculated_at

-- Tabela: Recomendações (seu output)
recommendations
├── id
├── user_id
├── month
├── type (alert, insight, suggestion)
├── message
├── severity (info, warning, critical)
├── action_url
└── seen_at
```

### 3. Queries Essenciais

**Query 1: Total Gasto Este Mês (por categoria)**
```sql
SELECT
  category,
  SUM(amount) as total_gasto,
  COUNT(*) as num_transacoes,
  AVG(amount) as ticket_medio,
  MAX(date) as ultima_transacao
FROM transactions
WHERE user_id = $1
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
GROUP BY category
ORDER BY total_gasto DESC;

-- Saída para app:
-- Alimentação: R$ 450 (12 transações, ticket médio R$ 37,50)
-- Transporte: R$ 120 (8 transações, ticket médio R$ 15)
-- ...
```

**Query 2: Status do Orçamento (% utilizado)**
```sql
SELECT
  b.category,
  b.limit_amount,
  COALESCE(SUM(t.amount), 0) as gasto_atual,
  ROUND(
    (COALESCE(SUM(t.amount), 0) / b.limit_amount * 100)::numeric, 
    1
  ) as percent_utilizado,
  CASE
    WHEN COALESCE(SUM(t.amount), 0) > b.limit_amount THEN 'ULTRAPASSADO'
    WHEN COALESCE(SUM(t.amount), 0) / b.limit_amount >= 0.8 THEN 'AVISO'
    ELSE 'OK'
  END as status
FROM budgets b
LEFT JOIN transactions t 
  ON t.user_id = b.user_id 
  AND t.category = b.category
  AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', b.month)
WHERE b.user_id = $1
  AND b.month = DATE_TRUNC('month', NOW())
GROUP BY b.id, b.category, b.limit_amount;

-- Saída:
-- Alimentação: R$ 450 / R$ 500 (90%) - AVISO
-- Transporte: R$ 120 / R$ 150 (80%) - OK
-- Lazer: R$ 85 / R$ 150 (57%) - OK
```

**Query 3: Projeção de Gastos até Final do Mês**
```sql
WITH daily_stats AS (
  SELECT
    category,
    DATE(date) as dia,
    SUM(amount) as gasto_dia
  FROM transactions
  WHERE user_id = $1
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
  GROUP BY DATE(date), category
),
current_month_total AS (
  SELECT
    category,
    SUM(gasto_dia) as total_atual,
    COUNT(DISTINCT dia) as dias_com_gasto,
    (DATE_PART('day', DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')) as dias_no_mes
  FROM daily_stats
  GROUP BY category
)
SELECT
  category,
  total_atual as gasto_ate_agora,
  ROUND(
    (total_atual / dias_com_gasto * dias_no_mes)::numeric, 
    2
  ) as projecao_fim_mes,
  dias_no_mes - EXTRACT(DAY FROM NOW())::int as dias_restantes
FROM current_month_total
ORDER BY projecao_fim_mes DESC;

-- Saída:
-- Alimentação: R$ 450 (até agora) → R$ 600 (projeção fim mês) | 15 dias restantes
-- Transporte: R$ 120 (até agora) → R$ 155 (projeção fim mês) | 15 dias restantes
```

**Query 4: Comparação com Mês Passado**
```sql
WITH mes_atual AS (
  SELECT
    category,
    SUM(amount) as total
  FROM transactions
  WHERE user_id = $1
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
  GROUP BY category
),
mes_passado AS (
  SELECT
    category,
    SUM(amount) as total
  FROM transactions
  WHERE user_id = $1
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  GROUP BY category
)
SELECT
  COALESCE(ma.category, mp.category) as category,
  COALESCE(ma.total, 0) as gasto_este_mes,
  COALESCE(mp.total, 0) as gasto_mes_passado,
  COALESCE(ma.total, 0) - COALESCE(mp.total, 0) as diferenca_absoluta,
  ROUND(
    ((COALESCE(ma.total, 1) - COALESCE(mp.total, 1)) / COALESCE(mp.total, 1) * 100)::numeric,
    1
  ) as variacao_percentual
FROM mes_atual ma
FULL OUTER JOIN mes_passado mp USING (category)
ORDER BY COALESCE(ma.total, 0) DESC;

-- Saída:
-- Alimentação: R$ 450 (este mês) vs R$ 380 (mês passado) | +R$ 70 (+18%)
-- Transporte: R$ 120 vs R$ 140 | -R$ 20 (-14%)
```

**Query 5: Taxa de Poupança**
```sql
WITH monthly_totals AS (
  SELECT
    DATE_TRUNC('month', date)::date as mes,
    SUM(amount) as gastos_mes
  FROM transactions
  WHERE user_id = $1
  GROUP BY DATE_TRUNC('month', date)
)
SELECT
  mes,
  -- Assumindo que usuário tem renda fixa entrada em sistema
  -- OU estimada (esse é um problema a resolver)
  $2::decimal as renda_mes,  -- passar parametrizado
  gastos_mes,
  ($2::decimal - gastos_mes) as poupado,
  ROUND(
    (($2::decimal - gastos_mes) / $2::decimal * 100)::numeric,
    1
  ) as taxa_poupanca_pct
FROM monthly_totals
ORDER BY mes DESC
LIMIT 3;  -- últimos 3 meses

-- Saída (com renda R$ 4.000):
-- Mês atual (jan): renda R$ 4.000 | gastos R$ 655 | poupado R$ 3.345 (83%)
-- Mês passado (dez): renda R$ 4.000 | gastos R$ 620 | poupado R$ 3.380 (85%)
-- Há 2 meses (nov): renda R$ 4.000 | gastos R$ 710 | poupado R$ 3.290 (82%)
```

### 4. Regras de Negócio & Alertas

**Algoritmo para Gerar Alertas:**

```sql
-- Gerar recomendações baseadas em regras
INSERT INTO recommendations (user_id, month, type, message, severity, action_url)

-- Alerta 1: Ultrapassou orçamento
SELECT
  user_id,
  DATE_TRUNC('month', NOW())::date,
  'alert',
  CONCAT('Você ultrapassou o orçamento de ', category, 
         ' em R$ ', ROUND(gasto - limite, 2)),
  'critical',
  '/budgets/' || category
FROM (
  SELECT
    b.user_id,
    b.category,
    b.limit_amount as limite,
    COALESCE(SUM(t.amount), 0) as gasto
  FROM budgets b
  LEFT JOIN transactions t ON ...
  WHERE gasto > limite
) alerts_ultrapassado

UNION ALL

-- Alerta 2: Orçamento em risco (> 80%)
SELECT
  user_id,
  DATE_TRUNC('month', NOW())::date,
  'alert',
  CONCAT(category, ' está em ', ROUND(percent, 0), '% do orçamento'),
  'warning',
  '/budgets/' || category
FROM (
  SELECT
    b.user_id,
    b.category,
    (COALESCE(SUM(t.amount), 0) / b.limit_amount * 100) as percent
  FROM budgets b
  LEFT JOIN transactions t ON ...
  WHERE percent > 80 AND percent <= 100
) alerts_risco

UNION ALL

-- Alerta 3: Vai estourar antes do fim do mês
SELECT
  user_id,
  DATE_TRUNC('month', NOW())::date,
  'alert',
  CONCAT('No ritmo atual, você ultrapassará ', category, 
         ' em R$ ', ROUND(excesso, 2), ' até final do mês'),
  'warning',
  '/budgets/' || category
FROM (
  -- projeção vs limite
) alerts_projecao;
```

### 5. Insights & Recomendações

**Exemplos de Insights Que o App Pode Mostrar:**

```markdown
## Tipo 1: Status Simples
"Você já utilizou 82% do orçamento de restaurantes este mês."

Query:
SELECT 
  ROUND((gasto / limite * 100)::numeric, 0) as percent
FROM budgets b
LEFT JOIN transactions t ON ...

## Tipo 2: Projeção
"Mantendo esse ritmo, você ultrapassará o orçamento em R$ 430."

Query: (ver acima - projeção)
Cálculo: (projeção_fim - limite) quando projeção > limite

## Tipo 3: Comparação
"Sua taxa de poupança caiu de 24% para 17% nos últimos três meses."

Query:
WITH rates AS (
  SELECT DATE_TRUNC('month', NOW()) as mes, poupanca_rate
  UNION ALL
  SELECT DATE_TRUNC('month', NOW() - INTERVAL '1 month'), ...
  UNION ALL
  SELECT DATE_TRUNC('month', NOW() - INTERVAL '2 months'), ...
)

## Tipo 4: Anomalia
"Gasto em Entretenimento este mês (R$ 450) é 3x maior que a média (R$ 150)."

Query:
SELECT
  category,
  gasto_este_mes,
  gasto_media_6m,
  (gasto_este_mes / gasto_media_6m) as multiplo
FROM (...)
WHERE gasto_este_mes > gasto_media_6m * 2  -- Mais de 2x a média

## Tipo 5: Oportunidade
"Você economizou R$ 75 em Transporte este mês vs. mês passado. 
Parabéns!"

Query:
SELECT
  COALESCE(ma.total, 0) - COALESCE(mp.total, 0) as diferenca
WHERE diferenca < 0  -- Menos gasto = economia
```

### 6. Pipeline de Dados (ETL/ELT)

**Arquitetura Básica:**

```
App Mobile (Firestore)
    ↓
    ↓ (Sync diário via Cloud Function)
    ↓
Data Warehouse (Postgres/BigQuery)
    ↓
    ↓ (Queries de BI → Métricas)
    ↓
API de Recomendações
    ↓
    ↓ (Pushing para app)
    ↓
Push Notification / Dashboard Update
```

**Cloud Function (Node.js) para Sincronizar e Calcular:**

```javascript
// Executar todo dia às 8am
exports.dailyMetricsRecalculation = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    
    // 1. Sincronizar dados do Firestore → Postgres
    const users = await admin.firestore()
      .collection('users')
      .get();
    
    for (const userDoc of users.docs) {
      const userId = userDoc.id;
      const transactions = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .get();
      
      // Inserir/atualizar em Postgres
      for (const tx of transactions.docs) {
        await pool.query(
          'INSERT INTO transactions (...) VALUES (...) ON CONFLICT DO UPDATE',
          [tx.data()]
        );
      }
    }
    
    // 2. Rodar queries e calcular métricas
    const metrics = await pool.query(`
      SELECT user_id, category, SUM(amount) as total
      FROM transactions
      WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
      GROUP BY user_id, category
    `);
    
    // 3. Gerar recomendações
    for (const row of metrics.rows) {
      const recommendation = generateRecommendation(row);
      await pool.query(
        'INSERT INTO recommendations (...) VALUES (...)',
        [recommendation]
      );
    }
    
    // 4. Pushar para app via Firestore
    for (const userId of userIds) {
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('recommendations')
        .add(recommendations);
    }
    
    console.log('Metrics recalculated for ' + users.size + ' users');
  });
```

### 7. Dashboard BI (Opcional v2)

**Ferramenta Recomendada:** Metabase, Superset ou Looker Studio (gratuito)

**Dashboard Pessoal do Usuário (web/desktop):**
```
Período: [Jan 2024]

╔════════════════════════════════════════════════════════╗
║  Total Gasto: R$ 1.234,56                         ║
║  Total Orçado: R$ 2.000,00                        ║
║  Economia: R$ 765,44 (38%)                        ║
╚════════════════════════════════════════════════════════╝

Gasto por Categoria:
┌─────────────────────────────────────────────────┐
│ Alimentação: 450 / 500 (90%) ████████░░░░░░░░░░│
│ Transporte: 120 / 150 (80%) ████████░░░░░░░░░░ │
│ Lazer: 85 / 150 (57%) █████░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────────┘

Tendência (últimos 6 meses):
[Gráfico de linha: gasto total por mês]

Comparação Mês Anterior:
Alimentação: +18% (↑ R$ 70)
Transporte: -14% (↓ R$ 20)
Lazer: -5% (↓ R$ 5)
```

### 8. Teste & Validação

**Validar Accurácia das Métricas:**

```sql
-- Manual test: Inserir transação de teste
INSERT INTO transactions 
  (id, user_id, amount, category, date) 
VALUES 
  ('test-001', 'user-123', 100.50, 'Teste', NOW());

-- Validar que query retorna corretamente
SELECT SUM(amount) FROM transactions 
WHERE category = 'Teste' AND user_id = 'user-123';
-- Esperado: 100.50

-- Limpar teste
DELETE FROM transactions WHERE id = 'test-001';
```

### 9. Comunicação de Resultados

**O que Comunicar para PM/Dev:**

```markdown
## Semanal
- Quantos usuários ativos essa semana?
- Quais categorias mais usadas?
- Algum bug nos dados?

## Mensal
- Taxa de engagement (% de usuários que registram gastos)
- Orçamento médio por categoria
- Insights sobre padrões de uso

## Para o Usuário (via App)
- Alertas críticos (ultrapassou orçamento)
- Insights úteis (comparações, anomalias)
- Recomendações (aumentar poupança, revisar categoria X)
```

## Timeline & Priorização

| Semana | Tarefas |
|--------|---------|
| 1-2 | Definir métricas, estruturar dados |
| 3-4 | Implementar queries básicas em produção |
| 5-6 | Alertas e recomendações simples |
| 7-8 | Testes, validação, documentação |
| 9+ | Dashboard BI, análises avançadas |

## Checklist MVP

- [ ] Base de dados estruturada (transactions, budgets, metrics)
- [ ] Query de total gasto (por categoria, este mês)
- [ ] Query de status orçamento (% utilizado)
- [ ] Query de projeção (vai estourar?)
- [ ] Alertas críticos (ultrapassou) → Push para app
- [ ] Recomendações simples (comparação mês passado)
- [ ] Pipeline de sync (Firestore → Data warehouse)
- [ ] Testes de accurácia

## Checklist Post-MVP

- [ ] Mais insights (anomalias, tendências)
- [ ] Dashboard BI web
- [ ] Recomendações de orçamento (baseado em padrão histórico)
- [ ] Sugestões de poupança
- [ ] Exportação de relatórios (PDF, CSV)

## Ferramentas Recomendadas

| Ferramenta | Uso |
|-----------|-----|
| **PostgreSQL** | Data warehouse (melhor que Firestore para queries complexas) |
| **Google BigQuery** | Alternativa cloud (mais caro, mas escalável) |
| **Metabase** | Dashboard BI (open source, fácil) |
| **dbt** | Orquestração de queries, documentação |
| **Airflow** | Agendamento de jobs complexos |
| **Cloud Functions/Lambdas** | Rodar jobs diários de cálculo |

## Boas Práticas

✅ Validar dados de entrada (usuário não colocou valor negativo?)
✅ Retenção de histórico (guardar métricas antigas para tendências)
✅ Alertas acionáveis (recomendar ação, não apenas informar)
✅ Performance (queries otimizadas, índices corretos)
✅ Documentação (quais cálculos são feitos, como alterar)
✅ Monitoramento (avisar se dados param de chegar)

❌ Métricas que o usuário não entende
❌ Alertas com 95% de falso positivo
❌ Queries que levam 30 segundos para rodar
❌ Guardar dados pessoais desnecessariamente
