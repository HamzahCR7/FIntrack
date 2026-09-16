import { CreditCardService } from './creditCard.service';
import { AccountService } from './account.service';
import { CategoryService } from './category.service';
import { TransactionService } from './transaction.service';
import { AccountType, TransactionType, PaymentMethod } from '../types/enums';
import { prisma } from '../config/prisma';

describe('CreditCardService - Accounting & Analytics Rules', () => {
  let creditCardService: CreditCardService;
  let accountService: AccountService;
  let categoryService: CategoryService;
  let transactionService: TransactionService;

  beforeAll(async () => {
    creditCardService = new CreditCardService();
    accountService = new AccountService();
    categoryService = new CategoryService();
    transactionService = new TransactionService();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.category.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Credit Card purchase increases outstanding debt, decreases available credit, and categorizes expense', async () => {
    // 1. Create Credit Card (Limit ₹1,000,000, 0 initial debt)
    const card = await accountService.createAccount({
      name: 'HDFC Regalia',
      type: AccountType.CREDIT_CARD,
      creditLimit: 100000,
      initialBalance: 0,
    });

    const category = await categoryService.createCategory({ name: 'Restaurant & Dining' });

    // 2. Perform EXPENSE transaction of ₹1,000 at Restaurant
    await transactionService.createTransaction({
      type: TransactionType.EXPENSE,
      amount: 1000,
      sourceAccountId: card.id,
      categoryId: category.id,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      merchant: 'Zaitoon Restaurant',
      description: 'Dinner with team',
    });

    // 3. Verify Card Details
    const enhancedCard = await creditCardService.getCreditCardById(card.id);
    expect(enhancedCard.currentOutstanding).toBe(1000);
    expect(enhancedCard.availableCredit).toBe(99000);
    expect(enhancedCard.utilizationPercentage).toBe(1.0);

    // 4. Verify Credit Card Analytics
    const analytics = await creditCardService.getCreditCardAnalytics();
    expect(analytics.totalCreditCardSpending).toBe(1000);
    expect(analytics.totalOutstandingAmount).toBe(1000);
    expect(analytics.totalAvailableCredit).toBe(99000);
    expect(analytics.spendingByCategory.length).toBe(1);
    expect(analytics.spendingByCategory[0].categoryName).toBe('Restaurant & Dining');
    expect(analytics.spendingByCategory[0].totalSpent).toBe(1000);
  });

  test('Paying credit card bill from bank account decreases bank balance and credit debt WITHOUT creating an extra expense', async () => {
    // 1. Setup Bank Account (₹50,000 balance)
    const bank = await accountService.createAccount({
      name: 'HDFC Savings',
      type: AccountType.BANK_ACCOUNT,
      initialBalance: 50000,
    });

    // 2. Setup Credit Card (₹100,000 limit, ₹15,000 existing debt)
    const card = await accountService.createAccount({
      name: 'ICICI Sapphiro',
      type: AccountType.CREDIT_CARD,
      creditLimit: 100000,
      initialBalance: 15000,
      statementAmount: 15000,
      minimumPayment: 750,
    });

    const category = await categoryService.createCategory({ name: 'Shopping' });

    // Record initial purchase expense of ₹15,000
    await transactionService.createTransaction({
      type: TransactionType.EXPENSE,
      amount: 15000,
      sourceAccountId: card.id,
      categoryId: category.id,
      paymentMethod: PaymentMethod.CREDIT_CARD,
    });

    // At this point, total expense is ₹15,000
    let initialSummary = await transactionService.getFinancialSummary();
    expect(initialSummary.totalExpenses).toBe(15000);

    // 3. Pay Credit Card Bill of ₹10,000 from Bank Account
    const payResult = await creditCardService.payCreditCardBill({
      sourceAccountId: bank.id,
      creditCardId: card.id,
      amount: 10000,
      description: 'Monthly Credit Card Payment',
    });

    expect(payResult.transaction.type).toBe('TRANSFER');

    // 4. Verify Account Balances
    const updatedBank = await accountService.getAccountById(bank.id);
    const updatedCard = await creditCardService.getCreditCardById(card.id);

    expect(updatedBank.currentBalance).toBe(40000);       // 50000 - 10000
    expect(updatedCard.currentOutstanding).toBe(20000);   // 15000 + 15000 expense - 10000 payment = 20000
    expect(updatedCard.availableCredit).toBe(80000);      // 100000 - 20000
    expect(updatedCard.statementAmount).toBe(5000);       // 15000 - 10000

    // 5. CRITICAL VERIFICATION: Total Expenses MUST STILL BE ₹15,000 (NOT ₹25,000)
    let finalSummary = await transactionService.getFinancialSummary();
    expect(finalSummary.totalExpenses).toBe(15000);
  });

  test('Updating credit card statement details', async () => {
    const card = await accountService.createAccount({
      name: 'Axis Bank Credit Card',
      type: AccountType.CREDIT_CARD,
      creditLimit: 50000,
      initialBalance: 0,
    });

    const updated = await creditCardService.updateStatementDetails(card.id, {
      statementAmount: 12000,
      statementCycleDay: 15,
      paymentDueDay: 5,
    });

    expect(updated.statementAmount).toBe(12000);
    expect(updated.minimumPayment).toBe(600); // Default 5% of 12000
    expect(updated.statementCycleDay).toBe(15);
    expect(updated.paymentDueDay).toBe(5);
  });
});
