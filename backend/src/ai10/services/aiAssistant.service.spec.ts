import { AIAssistantService } from '../services/aiAssistant.service';
import { FinancialToolRegistry } from '../tools/financialToolRegistry';
import { AccountType, TransactionType, PaymentMethod } from '../../types/enums';
import { prisma } from '../../config/prisma';

describe('AIAssistantService - Fact Grounded AI Engine', () => {
  let aiService: AIAssistantService;
  let toolRegistry: FinancialToolRegistry;

  beforeAll(async () => {
    aiService = new AIAssistantService();
    toolRegistry = new FinancialToolRegistry();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.debt.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Processes category expense queries with exact financial figures', async () => {
    // 1. Setup Food & Dining category and Credit Card account
    const card = await prisma.account.create({
      data: {
        name: 'Axis MY ZONE Credit Card',
        type: AccountType.CREDIT_CARD,
        currentBalance: 1392,
        creditLimit: 100000,
      },
    });

    const category = await prisma.category.create({
      data: { name: 'Food & Dining', icon: 'utensils', isSystem: true },
    });

    // 2. Record Expense
    await prisma.transaction.create({
      data: {
        type: TransactionType.EXPENSE,
        amount: 1392,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        merchant: 'Zepto',
        description: 'Zepto monthly items',
        categoryId: category.id,
        sourceAccountId: card.id,
      },
    });

    // 3. User Query: "How much did I spend on food this month?"
    const res = await aiService.processUserQuery({
      query: 'How much did I spend on food this month?',
    });

    expect(res.intent).toBe('EXPENSE_BY_CATEGORY');
    expect(res.toolUsed).toBe('getExpensesByCategory');
    expect(res.data.totalSpent).toBe(1392);
    expect(res.answer).toContain('₹1,392');
  });

  test('Processes credit card questions without counting bill payments as expenses', async () => {
    const card = await prisma.account.create({
      data: {
        name: 'HDFC Credit Card',
        type: AccountType.CREDIT_CARD,
        currentBalance: 5000,
        creditLimit: 50000,
      },
    });

    const res = await aiService.processUserQuery({
      query: 'What is my credit card balance?',
    });

    expect(res.intent).toBe('CREDIT_CARD_SUMMARY');
    expect(res.data.totalOutstandingAmount).toBe(5000);
    expect(res.answer).toContain('₹5,000');
  });

  test('Processes debt and loan queries correctly', async () => {
    await prisma.debt.create({
      data: {
        personName: 'Rahul',
        type: 'OWED_TO_ME',
        amount: 2500,
        settledAmount: 0,
        status: 'PENDING',
      },
    });

    const res = await aiService.processUserQuery({
      query: 'How much money do people owe me?',
    });

    expect(res.intent).toBe('DEBT_SUMMARY');
    expect(res.data.totalOwedToMe).toBe(2500);
    expect(res.answer).toContain('₹2,500');
  });

  test('Processes dynamic entity search queries for specific persons or merchants', async () => {
    await prisma.debt.create({
      data: {
        personName: 'Rahul',
        type: 'OWED_TO_ME',
        amount: 2500,
        settledAmount: 0,
        status: 'PENDING',
        notes: 'Lent for dinner bill',
      },
    });

    const res = await aiService.processUserQuery({
      query: 'money given to Rahul',
    });

    expect(res.intent).toBe('SEARCH_FINANCIAL_DATA');
    expect(res.toolUsed).toBe('searchFinancialData');
    expect(res.data.searchTerm).toBe('rahul');
    expect(res.data.matchingDebts.length).toBe(1);
    expect(res.answer).toContain('Rahul');
    expect(res.answer).toContain('₹2,500');
  });

  test('Processes category expense queries with misspelled category names (e.g. utilies -> Utilities)', async () => {
    const card = await prisma.account.create({
      data: {
        name: 'Primary Bank Account (Axis)',
        type: AccountType.BANK_ACCOUNT,
        currentBalance: 10000,
      },
    });

    const category = await prisma.category.create({
      data: { name: 'Utilities', icon: 'bolt', isSystem: true },
    });

    await prisma.transaction.create({
      data: {
        type: TransactionType.EXPENSE,
        amount: 2500,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        merchant: 'Electricity Board',
        description: 'Monthly electricity bill',
        categoryId: category.id,
        sourceAccountId: card.id,
      },
    });

    const res = await aiService.processUserQuery({
      query: 'How much I spent on utilies?',
    });

    expect(res.intent).toBe('EXPENSE_BY_CATEGORY');
    expect(res.toolUsed).toBe('getExpensesByCategory');
    expect(res.data.categoryName).toBe('Utilities');
    expect(res.data.totalSpent).toBe(2500);
    expect(res.answer).toContain('Utilities');
    expect(res.answer).toContain('₹2,500');
  });

  test('Processes dynamic queries matching keywords in transaction description/notes/merchant (e.g. shavings -> Shaving cream)', async () => {
    const card = await prisma.account.create({
      data: {
        name: 'Primary Bank Account (Axis)',
        type: AccountType.BANK_ACCOUNT,
        currentBalance: 10000,
      },
    });

    const category = await prisma.category.create({
      data: { name: 'Personal Care', icon: 'heart', isSystem: true },
    });

    await prisma.transaction.create({
      data: {
        type: TransactionType.EXPENSE,
        amount: 350,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        merchant: 'Gillette Store',
        description: 'Shaving razor & cream kit',
        categoryId: category.id,
        sourceAccountId: card.id,
      },
    });

    const res = await aiService.processUserQuery({
      query: 'how much spent on shavings?',
    });

    expect(res.intent).toBe('MERCHANT_SPENDING');
    expect(res.data.totalSpent).toBe(350);
    expect(res.answer).toContain('₹350');
    expect(res.answer).toContain('Shaving razor & cream kit');
  });

  test('Processes target spending query "how much money spent with friends?" without falling back to total monthly expenses', async () => {
    const card = await prisma.account.create({
      data: {
        name: 'Primary Bank Account (Axis)',
        type: AccountType.BANK_ACCOUNT,
        currentBalance: 10000,
      },
    });

    const category = await prisma.category.create({
      data: { name: 'Food & Dining', icon: 'utensils', isSystem: true },
    });

    await prisma.transaction.create({
      data: {
        type: TransactionType.EXPENSE,
        amount: 1500,
        paymentMethod: PaymentMethod.UPI,
        merchant: 'Cafe Coffee Day',
        description: 'Outing with friends',
        categoryId: category.id,
        sourceAccountId: card.id,
      },
    });

    // 1. When matching transaction exists
    const res = await aiService.processUserQuery({
      query: 'how much money spent with friends?',
    });

    expect(res.intent).toBe('MERCHANT_SPENDING');
    expect(res.toolUsed).toBe('getMerchantSpending');
    expect(res.data.totalSpent).toBe(1500);
    expect(res.answer).toContain('₹1,500');
    expect(res.answer).toContain('Outing with friends');

    // 2. When no matching transaction exists for a term
    const noMatchRes = await aiService.processUserQuery({
      query: 'how much money spent with colleagues?',
    });

    expect(noMatchRes.intent).toBe('MERCHANT_SPENDING');
    expect(noMatchRes.toolUsed).toBe('getMerchantSpending');
    expect(noMatchRes.data.count).toBe(0);
    expect(noMatchRes.answer).toContain("no recorded expenses matching 'colleagues'");
  });

  test('Processes discretionary decision queries (e.g. is it good idea to go to restaurant today?)', async () => {
    const res = await aiService.processUserQuery({
      query: 'is it good idea to go to restaurant today?',
    });

    expect(res.intent).toBe('DISCRETIONARY_DECISION');
    expect(res.answer).toContain('IT\'S A GOOD IDEA');
    expect(res.answer).toContain('restaurant');
    expect(res.answer).toContain('Net Monthly Savings Surplus');
  });

  test('Processes target savings trend query for timed purchases (e.g. laptop worth 100k in 6 months)', async () => {
    const res = await aiService.processUserQuery({
      query: 'if I want to buy a laptop worth 100000 in 6 months, what should be my savings trends should be?',
    });

    expect(res.intent).toBe('AFFORDABILITY_ANALYSIS');
    expect(res.toolParameters.targetAmount).toBe(100000);
    expect(res.toolParameters.itemName).toBe('laptop');
    expect(res.toolParameters.targetMonths).toBe(6);
    expect(res.answer).toContain('REQUIRED SAVINGS TREND (6 MONTHS)');
    expect(res.answer).toContain('₹16,667');
  });

  test('Processes financial advice queries and generates data-driven savings recommendations', async () => {
    const res = await aiService.processUserQuery({
      query: 'How can I save more?',
    });

    expect(res.intent).toBe('FINANCIAL_ADVICE');
    expect(res.toolUsed).toBe('getFinancialOverview');
    expect(res.answer).toContain('Personal Financial Health & Savings Optimization Analysis');
    expect(res.suggestedFollowUps).toBeDefined();
  });
});
