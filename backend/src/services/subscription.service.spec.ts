import { SubscriptionService } from './subscription.service';
import { AccountService } from './account.service';
import { CategoryService } from './category.service';
import { TransactionService } from './transaction.service';
import { AccountType, BillingCycle, SubscriptionStatus } from '../types/enums';
import { prisma } from '../config/prisma';

describe('SubscriptionService - Core Subscription Module Rules', () => {
  let subscriptionService: SubscriptionService;
  let accountService: AccountService;
  let categoryService: CategoryService;
  let transactionService: TransactionService;

  beforeAll(async () => {
    subscriptionService = new SubscriptionService();
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

  test('Calculates normalized monthly and annual costs correctly for all cycles', () => {
    // 1. YEARLY: ₹1,200 -> monthly = ₹100, annual = ₹1,200
    const yearly = subscriptionService.calculateNormalizedCosts(1200, BillingCycle.YEARLY);
    expect(yearly.monthlyCost).toBe(100);
    expect(yearly.annualCost).toBe(1200);

    // 2. MONTHLY: ₹500 -> monthly = ₹500, annual = ₹6,000
    const monthly = subscriptionService.calculateNormalizedCosts(500, BillingCycle.MONTHLY);
    expect(monthly.monthlyCost).toBe(500);
    expect(monthly.annualCost).toBe(6000);

    // 3. QUARTERLY: ₹300 -> monthly = ₹100, annual = ₹1,200
    const quarterly = subscriptionService.calculateNormalizedCosts(300, BillingCycle.QUARTERLY);
    expect(quarterly.monthlyCost).toBe(100);
    expect(quarterly.annualCost).toBe(1200);

    // 4. WEEKLY: ₹100 -> annual = ₹5,200, monthly = ₹433.33
    const weekly = subscriptionService.calculateNormalizedCosts(100, BillingCycle.WEEKLY);
    expect(weekly.annualCost).toBe(5200);
    expect(weekly.monthlyCost).toBe(433.33);

    // 5. EVERY_28_DAYS: ₹100 -> 13 charges annually, monthly = ₹108.33
    const every28Days = subscriptionService.calculateNormalizedCosts(100, BillingCycle.EVERY_28_DAYS);
    expect(every28Days.annualCost).toBe(1300);
    expect(every28Days.monthlyCost).toBe(108.33);
  });

  test('Advances a 28-day billing cycle by exactly 28 days', () => {
    const nextDate = subscriptionService.advanceBillingDate(
      new Date('2026-08-30T00:00:00.000Z'),
      BillingCycle.EVERY_28_DAYS
    );

    expect(nextDate.toISOString()).toBe('2026-09-27T00:00:00.000Z');
  });

  test('Create subscription, process payment, advance billing date, and verify no double-counting', async () => {
    // 1. Setup account and category
    const bank = await accountService.createAccount({
      name: 'Primary HDFC',
      type: AccountType.BANK_ACCOUNT,
      initialBalance: 10000,
    });

    const category = await categoryService.createCategory({ name: 'Entertainment' });

    // 2. Create Netflix Subscription (₹500/month)
    const nextDate = new Date('2026-09-01');
    const sub = await subscriptionService.createSubscription({
      name: 'Netflix Premium',
      amount: 500,
      billingCycle: BillingCycle.MONTHLY,
      sourceAccountId: bank.id,
      categoryId: category.id,
      nextBillingDate: nextDate,
    });

    expect(sub.id).toBeDefined();
    expect(sub.monthlyCost).toBe(500);
    expect(sub.annualCost).toBe(6000);
    expect(sub.status).toBe(SubscriptionStatus.ACTIVE);

    // 3. Process Subscription Payment
    const paymentResult = await subscriptionService.processPayment(sub.id);
    expect(paymentResult.transaction).toBeDefined();
    expect(paymentResult.transaction.isSubscription).toBe(true);
    expect(paymentResult.transaction.subscriptionId).toBe(sub.id);
    expect(paymentResult.transaction.amount).toBe(500);

    // Verify account balance updated (10000 - 500 = 9500)
    const updatedBank = await accountService.getAccountById(bank.id);
    expect(updatedBank.currentBalance).toBe(9500);

    // Verify next billing date advanced by 1 month (2026-10-01)
    const updatedSub = await subscriptionService.getSubscriptionById(sub.id);
    expect(new Date(updatedSub.nextBillingDate).getMonth()).toBe((nextDate.getMonth() + 1) % 12);

    // 4. Verify Financial Summary (Total Expenses is ₹500, no double counting!)
    const summary = await transactionService.getFinancialSummary();
    expect(summary.totalExpenses).toBe(500);
  });

  test('Cancel and toggle subscription status', async () => {
    const bank = await accountService.createAccount({
      name: 'SBI Bank',
      type: AccountType.BANK_ACCOUNT,
      initialBalance: 5000,
    });
    const category = await categoryService.createCategory({ name: 'Software' });

    const sub = await subscriptionService.createSubscription({
      name: 'ChatGPT Plus',
      amount: 1600,
      billingCycle: BillingCycle.MONTHLY,
      sourceAccountId: bank.id,
      categoryId: category.id,
    });

    // Pause subscription
    const paused = await subscriptionService.toggleStatus(sub.id, SubscriptionStatus.PAUSED);
    expect(paused.status).toBe(SubscriptionStatus.PAUSED);

    // Cancel subscription
    const cancelled = await subscriptionService.cancelSubscription(sub.id);
    expect(cancelled.status).toBe(SubscriptionStatus.CANCELLED);
    expect(cancelled.endDate).toBeDefined();
  });
});
