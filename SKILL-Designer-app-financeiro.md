# UX/UI Designer — App Financeiro

**ID:** designer-app-financeiro  
**Versão:** 1.0  
**Categoria:** Design  
**Idioma:** Português  

## Descrição
Responsável por criar a experiência visual e funcional do app: pesquisa de usuário, wireframes, design system, prototipagem interativa, testes de usabilidade. Garante que o app seja intuitivo, bonito e eficiente o suficiente para que o usuário realmente o use todo dia.

## Quando usar esta skill
- O usuário pede para "desenhar as telas", "criar design system", "fazer testes de usabilidade"
- Palavras-chave: "wireframe", "prototipo", "design system", "usabilidade", "cores", "tipografia", "telas"
- Quando precisa de guidance sobre navegação, hierarquia visual, ou padrões de design

## O que você faz

### 1. Pesquisa & Empathia

**Entender o Usuário:**
- Quem usa? (financeiro conservador, gastador impulsivo, poupador agressivo)
- Como hoje registra gastos? (anotação, app concorrente, não registra)
- Qual é o principal problema? (esquece de registrar, não sabe onde está gastando, sem controle)
- Quanto tempo dedica? (5 min/dia? 30 min/mês?)

**Métodos:**
```markdown
## Pesquisa Qualitativa
- Entrevistas 1:1 (5-8 usuários potenciais)
- Observação (como eles tentam hoje?)
- Diários de uso (anotar gastos por 1 semana)

## Insights Típicos
- "Quero registrar em <30 segundos, senão não faço"
- "Preciso ver logo se extrapolei o orçamento"
- "Não quero ver gráficos complexos, só o essencial"
- "Mobile é ok, mas preciso de web/desktop também"
```

### 2. Design System

Criar um sistema visual consistente que guia o dev e garante coerência.

**Componentes Base:**

```markdown
## Tipografia
- **Heading 1** (24px, Bold): Títulos de seção (Dashboard, Adicionar Gasto)
- **Heading 2** (18px, SemiBold): Subtítulos
- **Body** (14px, Regular): Texto principal
- **Caption** (12px, Regular): Labels, valores pequenos
- **Mono** (12px, Regular): Valores monetários (R$ 123,45)

Font: Inter ou Roboto (Google Fonts, gratuita)
```

**Paleta de Cores:**
```
Primary: #6366F1 (índigo, botões, ações)
Success: #10B981 (verde, economia, poupança)
Warning: #F59E0B (âmbar, orçamento em risco)
Danger: #EF4444 (vermelho, ultrapassou orçamento)
Neutral: #F3F4F6, #E5E7EB, #D1D5DB, #6B7280, #1F2937
Surface: #FFFFFF (cards, fundo)
Background: #F9FAFB (fundo principal)
```

**Espaçamento (8px base grid):**
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
```

**Sombra & Elevação:**
```
Elevation 1: shadow: 0 1px 3px rgba(0,0,0,0.12)
Elevation 2: shadow: 0 4px 6px rgba(0,0,0,0.1)
Elevation 3: shadow: 0 10px 15px rgba(0,0,0,0.1)
```

**Componentes Reutilizáveis:**
```
- Button (primary, secondary, tertiary, danger)
- Card (com sombra, padding padrão)
- Input (text, number, email com validação visual)
- Dropdown / Picker
- BottomSheet (adicionar gasto)
- Dialog (confirmações)
- Badge (categoria, status)
- ProgressBar (progresso orçamento)
- Chart (barra simples)
```

### 3. Estrutura de Navegação

**Arquitetura Recomendada: Bottom Tab Navigation**
```
┌─────────────────────────────────────┐
│         Dashboard / Home            │
│                                     │
│  Total: R$ 1.234,56                │
│  Orçamento: R$ 2.000,00            │
│                                     │
│  ┌─ Alimentação: R$ 450 (90%)      │
│  ├─ Transporte: R$ 120 (80%)       │
│  └─ Lazer: R$ 85 (60%)             │
│                                     │
│  Últimas transações:                │
│  Supermercado - R$ 120 - 15 jan    │
│  Táxi - R$ 35 - 14 jan             │
│                                     │
├─ Home ─ Add ─ Budgets ─ Profile ─┤
└─────────────────────────────────────┘
```

**Abas Principais:**
1. **Home/Dashboard** (central, onde passa mais tempo)
2. **Adicionar Gasto** (flutuante ou aba, deve ser muito rápido)
3. **Orçamentos/Metas** (configurar limites por categoria)
4. **Análises/Histórico** (ver padrões, comparações)
5. **Perfil/Configurações** (dados pessoais, moeda, exportar)

### 4. Wireframes & User Flows

**Exemplo: Fluxo "Adicionar Gasto"**

```
HomeScreen
    ↓ [clica FAB + ou aba Adicionar]
AddTransactionSheet (BottomSheet)
    ↓ [Insere valor: teclado numérico]
    ↓ [Escolhe categoria: Dropdown]
    ↓ [Seleciona data: DatePicker]
    ↓ [Descrição (opcional): TextField]
    ↓ [clica Salvar]
HomeScreen (atualizado com novo gasto)
```

**Wireframe Lo-Fi (pode ser papel, Figma ou até ASCII):**

```
HOME SCREEN
┌─────────────────────────────────┐
│ ← Dashboard    ⚙️                │ (AppBar)
├─────────────────────────────────┤
│                                 │
│  Total este mês: R$ 1.234,56   │ (Card destaque)
│  Limite: R$ 2.000              │
│  Faltam: R$ 765,44             │
│                                 │
├─────────────────────────────────┤
│  CATEGORIAS                      │ (Seção)
│  ┌─────────────────────────────┐│
│  │ 🍔 Alimentação              ││ (Card c/ progressbar)
│  │ R$ 450 / R$ 500 (90%)       ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ 🚕 Transporte               ││
│  │ R$ 120 / R$ 150 (80%)       ││
│  └─────────────────────────────┘│
│  ... mais categorias            │
├─────────────────────────────────┤
│  ÚLTIMAS TRANSAÇÕES             │
│  🍔 Supermercado      R$ 120    │ (ListItem simples)
│     15 de janeiro                │
│  🚕 Uber               R$ 35     │
│     14 de janeiro                │
│                                 │
├─ 🏠 Home ─ ➕ Add ─ 🎯 Metas ─┤ (Bottom Nav)
└─────────────────────────────────┘


ADD TRANSACTION SCREEN (BottomSheet)
┌─────────────────────────────────┐
│  Adicionar Gasto                │ (Header)
├─────────────────────────────────┤
│                                 │
│  Valor: [______] R$             │ (Foco aqui, teclado numérico)
│                                 │
│  Categoria: [Alimentação ▼]     │ (Dropdown)
│                                 │
│  Data: [15 de janeiro] ⏰        │ (DatePicker)
│                                 │
│  Descrição (opcional):          │ (TextField pequeno)
│  [Supermercado perto de casa]   │
│                                 │
│                    [Cancelar] [Salvar] │ (Botões)
│                                 │
└─────────────────────────────────┘
```

### 5. Design Detalhado (Hi-Fi)

**Em Figma:** Criar componentes pixel-perfeitos com:
- Cores exatas (uso de paleta)
- Tipografia aplicada
- Espaçamento preciso
- Estados de interação (hover, focus, disabled)
- Responsividade (se houver versão web)

**Checklist de Telas a Projetar:**
- [ ] Splash/Onboarding
- [ ] Login/Registro
- [ ] HomeScreen/Dashboard
- [ ] AddTransactionScreen
- [ ] BudgetConfigScreen
- [ ] AnalyticsScreen
- [ ] ProfileScreen
- [ ] Diálogos de confirmação
- [ ] Telas de erro/loading
- [ ] Variações dark mode (opcional v1)

### 6. Interações & Microinterações

**Animações Simples (não é jogo, mas deve responder bem):**

```markdown
## Feedback Visual Essencial
- Ripple effect ao tocar botão (Android feel)
- Opacity ao desabilitar
- Slide in/out ao navegar (natural, <200ms)
- Bounce sutil ao salvar com sucesso
- Shake (shake) ao validar campo inválido

## Loading States
- Spinner enquanto sync com servidor
- Skeleton ou placeholder enquanto carrega dados
- Badge "Sincronizando..." se offline

## Error States
- Toast (notificação brevinha) "Erro ao salvar"
- Cor vermelha em campos inválidos
- Mensagem de ajuda clara ("Email já cadastrado")
```

### 7. Prototipagem & Testes

**Protótipo Interativo (Figma Prototype ou Framer):**
- Conectar telas com transições realistas
- Testar flows básicos: login → home → adicionar gasto → salvar
- Validar se a navegação faz sentido

**Testes de Usabilidade (Semana 3-4):**
```markdown
## Teste Moderado (5 usuários, 30 min cada)

Tarefas:
1. "Crie uma conta e faça login"
2. "Adicione um gasto de R$ 50 em Alimentação"
3. "Veja se você ultrapassou o orçamento de Transporte"
4. "Configure um novo orçamento de R$ 300 para Lazer"

Métrica: Quantos conseguem sem dúvida? (Meta: 4 de 5)
Feedback: O que achou confuso?
```

### 8. Documentação de Design

**Design Specs para Desenvolvedores:**
```markdown
# Spec: Home Screen

## Componentes
- AppBar: altura 56dp, cor #1F2937, texto "Dashboard"
- Card de Total: padding 16, radius 8, sombra elevation 2
- ProgressBar: altura 4dp, cor primary #6366F1
- BottomNavigation: altura 56dp, 5 itens

## Tipografia
- Título "Total": Heading 2 (18px SemiBold)
- Valor "R$ 1.234": Mono (16px Regular)

## Espaçamento
- Entre cards: 16px
- Padding interno: 16px
- SafeArea top: respeitar notch

## Cores
- Fundo: #F9FAFB
- Card background: #FFFFFF
- Texto principal: #1F2937
- Texto secundário: #6B7280

## Estados Especiais
- Orçamento normal (< 80%): cor success #10B981
- Orçamento em risco (80-100%): cor warning #F59E0B
- Ultrapassado (> 100%): cor danger #EF4444
```

### 9. Acessibilidade & Inclusão

**Checklist Básico:**
- [ ] Contraste mínimo 4.5:1 (WCAG AA)
- [ ] Tamanho de toque mínimo 48x48dp
- [ ] Suporte a TalkBack (Android) e VoiceOver (iOS)
- [ ] Labels descritivos em ícones
- [ ] Suportar zoom até 200%
- [ ] Não confiar APENAS em cor (usar ícones + cores)
- [ ] Modo escuro acessível (contraste mantido)

### 10. Feedback & Iteração

**Comunicação com Dev:**
- "Essa sombra precisa ser exata? Posso usar um 10%?"
- "Essa fonte pesa muito no app? Podemos usar algo mais simples?"
- "Essa animação é importante ou podemos cortar para ganhar performance?"

**Comunicação com PM:**
- "Essa feature é criticamente importante na v1 ou pode esperar?"
- "Usuários realmente vão usar o modo escuro?"
- "Essa análise é importante visualmente ou só dados?"

## Timeline Estimado (8 semanas)

| Semana | Tarefas |
|--------|---------|
| 1 | Pesquisa, personas, design system |
| 2 | Wireframes principais (4 telas core) |
| 3 | Design hi-fi, prototipo interativo |
| 4 | Testes de usabilidade, iteração |
| 5 | Design completo (v1: 6-8 telas) |
| 6 | Handoff para dev (specs, componentes) |
| 7 | Suporte durante dev (review de builds) |
| 8 | Testes de usabilidade final, ajustes |

## Ferramentas Recomendadas

| Ferramenta | Uso |
|-----------|-----|
| **Figma** | Design, componentes, protótipo (padrão ouro) |
| **Miro** | Workshops, research synthesis |
| **Maze** | Testes de usabilidade (protótipo → respostas) |
| **Adobe XD** | Alternativa a Figma (menos colaborativo) |
| **Penpot** | Open source, self-hosted |

## Checklist de Handoff

Antes de passar para dev:
- [ ] Design system documentado (cores, tipografia, componentes)
- [ ] Todas as telas em hi-fi
- [ ] Specs claras por tela (espaçamento, cores, fontes)
- [ ] Prototipo interativo funcionando
- [ ] Ícones/assets exportados (SVG ou PNG @1x, @2x, @3x)
- [ ] Testes de usabilidade feitos e insights documentados
- [ ] Variações (estados normal, hover, disabled, error, loading)
- [ ] Dark mode (se vai ser suportado)

## Boas Práticas

✅ Entender de verdade o usuário (não adivinhar)
✅ Simplicidade visual (um control financeiro não precisa ser bonito, precisa funcionar)
✅ Hierarchy clara (o que importa mais fica em maior destaque)
✅ Testável (perguntar a usuários antes de codificar)
✅ Acessível desde o início (não deixar para depois)
✅ Documentado (dev não deve adivinhar intenção)

❌ Sobrecomplexidade visual (muitos elementos, cores, animações)
❌ Ignorar constraints técnicas (dev avisa "isso pesa muito")
❌ Não testar com reais (criar sozinho no PC)
❌ Tentar ser inovador demais (padrões existem por razão)
❌ Dark mode como adição (pensar desde sempre)
