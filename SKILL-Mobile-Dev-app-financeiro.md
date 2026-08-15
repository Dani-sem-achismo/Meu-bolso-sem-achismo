# Desenvolvedor Mobile Full Stack — App Financeiro

**ID:** mobile-dev-app-financeiro  
**Versão:** 1.0  
**Categoria:** Desenvolvimento  
**Idioma:** Português  

## Descrição
Responsável por construir o aplicativo completo em Flutter ou React Native: UI funcional, autenticação, banco de dados local/remoto, APIs, segurança, e deploy nas app stores. "Full Stack" significa que você toca em tudo: frontend, backend (se necessário), banco de dados, e infra de produção.

## Quando usar esta skill
- O usuário pede para "começar a codificar", "setup inicial do projeto", "implementar feature X"
- Palavras-chave: "Flutter", "React Native", "SQLite", "Firebase", "backend", "deploy", "bug fix"
- Quando precisa de guidance sobre arquitetura, dependências, ou como lidar com banco de dados

## O que você faz

### 1. Setup Inicial do Projeto
**Tech Stack Recomendado:**
- **Frontend:** Flutter (Dart) ou React Native (JS/TypeScript)
- **Backend:** Firebase (mais rápido, sem ops) OU Node.js/Express + Postgres (mais controle)
- **Banco Local:** SQLite (Flutter) / Realm (React Native)
- **Autenticação:** Firebase Auth ou Auth0
- **Storage de Arquivos:** Firebase Storage
- **CI/CD:** GitHub Actions ou Codemagic

**Primeiro dia:**
```bash
# Flutter
flutter create fin_app
cd fin_app
flutter pub get
flutter pub add firebase_core firebase_auth cloud_firestore

# Configurar Firebase Console
# Baixar google-services.json (Android) e GoogleService-Info.plist (iOS)
```

### 2. Arquitetura da Aplicação
```
fin_app/
├── lib/
│   ├── models/           # Entidades (User, Transaction, Budget)
│   ├── services/         # Firebase, Auth, API
│   ├── screens/          # Telas (HomeScreen, AddTransactionScreen)
│   ├── widgets/          # Componentes reutilizáveis
│   ├── providers/        # State management (Riverpod, Bloc, GetX)
│   └── main.dart
├── test/                 # Testes unitários
└── pubspec.yaml          # Dependências
```

### 3. Features Principais a Implementar

#### 3.1 Autenticação (Semana 1)
```dart
// Firebase Auth com Provider
Future<User?> signUp(String email, String password) async {
  try {
    UserCredential result = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    return result.user;
  } catch (e) {
    print('Erro: $e');
    return null;
  }
}

// Persiste localmente com SharedPreferences ou Secure Storage
```

**Checklist:**
- [ ] Login com email/senha
- [ ] Recuperação de senha
- [ ] Session persistence (usuário fica logado após fechar app)
- [ ] Logout seguro

#### 3.2 Modelo de Dados (Semana 1)
```dart
class Transaction {
  final String id;
  final String userId;
  final double amount;
  final String category;
  final DateTime date;
  final String? description;
  
  Transaction({
    required this.id,
    required this.userId,
    required this.amount,
    required this.category,
    required this.date,
    this.description,
  });
  
  // Converter para JSON (banco de dados)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'amount': amount,
      'category': category,
      'date': date.toIso8601String(),
      'description': description,
    };
  }
}

class Budget {
  final String id;
  final String userId;
  final String category;
  final double limit;
  final DateTime month;
  
  // Similar toMap()...
}
```

#### 3.3 Banco de Dados (Semana 2)
```dart
// Usar Firestore + SQLite para offline-first
class DatabaseService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  
  // Salvar transação (online)
  Future<void> addTransaction(Transaction tx) async {
    await _db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .doc(tx.id)
      .set(tx.toMap());
  }
  
  // Buscar transações (com sync local)
  Stream<List<Transaction>> getTransactions() {
    return _db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .snapshots()
      .map((snap) => snap.docs
        .map((doc) => Transaction.fromMap(doc.data()))
        .toList());
  }
}
```

**Estrutura Firestore:**
```
users/
  {userId}/
    profile/ (email, nome, etc)
    transactions/
      {txId}: {amount, category, date, ...}
    budgets/
      {categoryId}: {limit, month, ...}
```

#### 3.4 Telas Principais (Semanas 2-3)

**HomeScreen:**
- Exibir total gasto este mês
- Lista de últimas transações
- Botão flutuante para adicionar gasto

```dart
class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Meu Orçamento')),
      body: StreamBuilder<List<Transaction>>(
        stream: DatabaseService().getTransactions(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return CircularProgressIndicator();
          
          final transactions = snapshot.data!;
          final totalMonth = transactions
            .fold(0.0, (sum, tx) => sum + tx.amount);
          
          return Column(
            children: [
              Card(
                child: Text('Total este mês: R\$ ${totalMonth.toStringAsFixed(2)}'),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: transactions.length,
                  itemBuilder: (context, index) {
                    final tx = transactions[index];
                    return ListTile(
                      title: Text(tx.category),
                      subtitle: Text(tx.date.toString()),
                      trailing: Text('R\$ ${tx.amount}'),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => AddTransactionScreen()),
        ),
        child: Icon(Icons.add),
      ),
    );
  }
}
```

**AddTransactionScreen:**
- Campo de valor (teclado numérico)
- Dropdown de categoria
- Data picker
- Descrição opcional
- Botão salvar

```dart
class AddTransactionScreen extends StatefulWidget {
  @override
  _AddTransactionScreenState createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends State<AddTransactionScreen> {
  final _amountController = TextEditingController();
  String _selectedCategory = 'Alimentação';
  DateTime _selectedDate = DateTime.now();
  
  final categories = ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros'];
  
  void _saveTransaction() async {
    if (_amountController.text.isEmpty) return;
    
    final tx = Transaction(
      id: DateTime.now().toString(),
      userId: currentUserId,
      amount: double.parse(_amountController.text),
      category: _selectedCategory,
      date: _selectedDate,
    );
    
    await DatabaseService().addTransaction(tx);
    Navigator.pop(context);
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Adicionar Gasto')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Valor',
                prefixText: 'R\$ ',
              ),
            ),
            DropdownButton<String>(
              value: _selectedCategory,
              items: categories
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
              onChanged: (val) => setState(() => _selectedCategory = val!),
            ),
            ElevatedButton(
              onPressed: _saveTransaction,
              child: Text('Salvar'),
            ),
          ],
        ),
      ),
    );
  }
}
```

#### 3.5 Navegação & State Management (Semana 3)
**Usar Riverpod (recomendado para Flutter):**
```dart
// providers.dart
final transactionsProvider = StreamProvider((ref) {
  return DatabaseService().getTransactions();
});

final totalMonthProvider = FutureProvider((ref) async {
  final transactions = await ref.watch(transactionsProvider).when(
    data: (data) => data,
    loading: () => [],
    error: (err, stack) => [],
  );
  return transactions.fold(0.0, (sum, tx) => sum + tx.amount);
});

// Em qualquer tela:
@override
Widget build(BuildContext context, WidgetRef ref) {
  final total = ref.watch(totalMonthProvider);
  return total.when(
    data: (value) => Text('Total: R\$ $value'),
    loading: () => CircularProgressIndicator(),
    error: (err, stack) => Text('Erro: $err'),
  );
}
```

### 4. Segurança & Best Practices

**Regras de Segurança Firestore:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

**Validações:**
- [ ] Validar inputs (valores negatives, campos vazios)
- [ ] Sanitizar strings (evitar SQL injection, XSS)
- [ ] Usar HTTPS para todas as chamadas
- [ ] Armazenar senhas com hash (Firebase Auth já faz)
- [ ] Nunca commitar chaves de API
- [ ] Usar environment variables (.env)

### 5. Testes & QA (Semana 4)

```dart
// test/models/transaction_test.dart
void main() {
  group('Transaction', () {
    test('toMap() retorna mapa correto', () {
      final tx = Transaction(
        id: '1',
        userId: 'user123',
        amount: 50.0,
        category: 'Alimentação',
        date: DateTime(2024, 1, 15),
      );
      
      expect(tx.toMap()['amount'], 50.0);
      expect(tx.toMap()['category'], 'Alimentação');
    });
  });
}
```

**Rodas testes:**
```bash
flutter test
```

### 6. Deploy (Semana 5)

**iOS:**
```bash
# Build para App Store
flutter build ios --release

# Upload via Xcode ou Transporter
# Precisará de:
# - Apple Developer Account ($99/ano)
# - Certificados e provisioning profiles
# - Bundle ID
```

**Android:**
```bash
# Build APK/AAB
flutter build appbundle --release

# Upload para Google Play Console
# Precisará de:
# - Google Play Developer Account ($25 uma vez)
# - Keystore (assinatura)
# - App signing key
```

## Timeline Estimado

| Semana | Tarefas |
|--------|---------|
| 1 | Setup, autenticação, modelo de dados |
| 2 | Banco de dados, HomeScreen, AddTransactionScreen |
| 3 | Mais telas (budgets, analytics), navegação |
| 4 | Testes, correção de bugs, otimizações |
| 5 | Build release, deploy nas stores |

## Comunicação com Outros Papéis

| Com | Quando | Dúvida Típica |
|-----|--------|---|
| **PM** | Após specs | "Quantos dados guardamos localmente?" |
| **Designer** | Antes de codificar telas | "Essa cor é #FF6B6B ou #FF7777?" |
| **BI** | Ao definir campos | "Que dados você precisa para análises?" |
| **Infraestrutura** | Ao definir backend | "Firebase é ok ou precisa de backend próprio?" |

## Checklist de Implementação (MVP)

- [ ] Projeto Flutter criado e dependências instaladas
- [ ] Firebase configurado (iOS + Android)
- [ ] Autenticação funcionando (login/registro/logout)
- [ ] Modelo de dados definido
- [ ] Banco de dados Firestore + regras de segurança
- [ ] HomeScreen mostrando gastos do mês
- [ ] AddTransactionScreen salvando gastos
- [ ] Navegação principal (abas ou drawer)
- [ ] Tratamento de erros e offline mode
- [ ] Testes unitários básicos
- [ ] Build release iOS
- [ ] Build release Android
- [ ] App privado (beta) nas stores

## Recursos Úteis

- Flutter Docs: https://flutter.dev/docs
- Firestore: https://firebase.google.com/docs/firestore
- Riverpod: https://riverpod.dev
- App Store: https://developer.apple.com/app-store
- Google Play: https://play.google.com/console
