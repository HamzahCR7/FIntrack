import { TransactionService } from './transaction.service';
import { AccountService } from './account.service';
import { CategoryService } from './category.service';
import { AccountType, TransactionType, PaymentMethod } from '../types/enums';
import { prisma } from '../config/prisma';

describe('TransactionService - Core Financial Rules', () => {
  let transactionService: TransactionService;
  let accountService: AccountService;
  let categoryService: CategoryService;

  beforeAll(async () => {
    transactionService = new TransactionService();
    accountService = new AccountService();
    categoryService = new CategoryService();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.transaction.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.category.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Transfer between accounts updates both account balances but DOES NOT increase total expenses', async () => {
    // 1. Create HDFC Bank Account (Initial balance ₹50,000)
    const hdfc = await accountService.createAccount({
      name: 'HDFC Bank',
      type: AccountType.BANK_ACCOUNT,
      initialBalance: 50000,
    });

    // 2. Create SBI Bank Account (Initial balance ₹10,000)
    const sbi = await accountService.createAccount({
      name: 'SBI Bank',
      type: AccountType.BANK_ACCOUNT,
      initialBalance: 10000,
    });

    // 3. Create Transfer of ₹10,000 from HDFC to SBI
    const transfer = await transactionService.createTransaction({
      type: TransactionType.TRANSFER,
      amount: 10000,
      sourceAccountId: hdfc.id,
      destinationAccountId: sbi.id,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      description: 'HDFC to SBI Transfer',
    });

    expect(transfer.id).toBeDefined();

    // 4. Verify Account Balances
    const updatedHdfc = await accountService.getAccountById(hdfc.id);
    const updatedSbi = await accountService.getAccountById(sbi.id);

    expect(updatedHdfc.currentBalance).toBe(40000); // 50000 - 10000
    expect(updatedSbi.currentBalance).toBe(20000);  // 10000 + 10000

    // 5. Verify Financial Summary (Total Expenses MUST BE 0)
    const summary = await transactionService.getFinancialSummary();
    expect(summary.totalExpenses).toBe(0);
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalTransfersVolume).toBe(10000);
  });

  test('Income increases destination balance and total income', async () => {
    const bank = await accountService.createAccount({
      name: 'Salary Account',
      type: AccountType.BANK_ACCOUNT,
      initialBalance: 0,
    });

    await transactionService.createTransaction({
      type: TransactionType.INCOME,
      amount: 75000,
      destinationAccountId: bank.id,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      description: 'Monthly Salary',
    });

    const updatedBank = await accountService.getAccountById(bank.id);
    expect(updatedBank.currentBalance).toBe(75000);

    const summary = await transactionService.getFinancialSummary();
    expect(summary.totalIncome).toBe(75000);
    expect(summary.totalExpenses).toBe(0);
  });

  test('Credit Card purchase increases outstanding debt, bill payment reduces debt without double counting expense', async () => {
    // Bank Account
    const hdfc = await accountService.createAccount({
      name: 'HDFC Savings',
      type: AccountType.BANK_ACCOUNT,
      initialBalance: 30000,
    });

    // Credit Card (0 initial debt)
    const creditCard = await accountService.createAccount({
      name: 'ICICI Credit Card',
      type: AccountType.CREDIT_CARD,
      initialBalance: 0,
      creditLimit: 100000,
    });

    // Category
    const category = await categoryService.createCategory({ name: 'Electronics' });

    // Step 1: Expense on Credit Card (e.g. ₹5,000 for headphones)
    await transactionService.createTransaction({
      type: TransactionType.EXPENSE,
      amount: 5000,
      sourceAccountId: creditCard.id,
      categoryId: category.id,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      description: 'Headphones',
    });

    let updatedCard = await accountService.getAccountById(creditCard.id);
    expect(updatedCard.currentBalance).toBe(5000); // Debt increases to 5000

    let summary = await transactionService.getFinancialSummary();
    expect(summary.totalExpenses).toBe(5000);

    // Step 2: Pay Credit Card Bill from HDFC (Transfer of ₹5,000)
    await transactionService.createTransaction({
      type: TransactionType.TRANSFER,
      amount: 5000,
      sourceAccountId: hdfc.id,
      destinationAccountId: creditCard.id,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      description: 'Credit Card Bill Payment',
    });

    const updatedHdfc = await accountService.getAccountById(hdfc.id);
    updatedCard = await accountService.getAccountById(creditCard.id);

    expect(updatedHdfc.currentBalance).toBe(25000); // 30000 - 5000
    expect(updatedCard.currentBalance).toBe(0);     // Debt paid back to 0

    // Total expense MUST STILL be ₹5,000 (NOT ₹10,000)
    summary = await transactionService.getFinancialSummary();
    expect(summary.totalExpenses).toBe(5000);
  });
});
