import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { AccountType, TransactionType, PaymentMethod } from '../types/enums';

export class AnalyticsService {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async getDashboardData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Use UTC date boundaries to match ISO database timestamps
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    // 1. Accounts & Balances
    const accounts = await this.db.account.findMany({ where: { isActive: true } });

    let bankBalances = 0;
    let cashBalances = 0;
    let upiBalances = 0;
    let creditOutstanding = 0;
    let pocketAllowanceBalance = 0;
    const pocketAccountIds: string[] = [];

    const accountBreakdown: Record<string, any[]> = {
      BANK_ACCOUNT: [],
      CREDIT_CARD: [],
      CASH: [],
      UPI: [],
      AMAZON_PAY: [],
    };

    for (const acc of accounts) {
      if (acc.name === 'Pocket APP ICICI') {
        pocketAllowanceBalance += acc.currentBalance;
        pocketAccountIds.push(acc.id);
      }

      if (acc.type === AccountType.CREDIT_CARD) {
        creditOutstanding += acc.currentBalance;
        accountBreakdown.CREDIT_CARD.push({
          ...acc,
          currentOutstanding: acc.currentBalance,
          availableCredit: Math.max(0, (acc.creditLimit || 0) - acc.currentBalance),
        });
      } else {
        if (acc.includeInTotalBalance !== false) {
          if (acc.type === AccountType.BANK_ACCOUNT) bankBalances += acc.currentBalance;
          if (acc.type === AccountType.CASH) cashBalances += acc.currentBalance;
          if (acc.type === AccountType.UPI || acc.type === AccountType.AMAZON_PAY) upiBalances += acc.currentBalance;
        }

        if (accountBreakdown[acc.type]) {
          accountBreakdown[acc.type].push(acc);
        }
      }
    }

    const totalLiquidBalance = bankBalances + cashBalances + upiBalances;

    // 2. All-Time Aggregates
    const allIncome = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: { type: TransactionType.INCOME },
    });
    const allExpenses = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: { type: TransactionType.EXPENSE },
    });

    const totalIncome = allIncome._sum.amount || 0;
    const totalExpenses = allExpenses._sum.amount || 0;
    const totalSavings = totalIncome - totalExpenses;

    // 3. Current Month Aggregates
    const monthIncomeAgg = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: TransactionType.INCOME,
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    const monthExpensesAgg = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: TransactionType.EXPENSE,
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const spendingThisMonth = monthExpensesAgg._sum.amount || 0;
    const incomeThisMonth = monthIncomeAgg._sum.amount || 0;
    const savingsThisMonth = incomeThisMonth - spendingThisMonth;

    const pocketAllowanceAgg = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: TransactionType.INCOME,
        destinationAccountId: { in: pocketAccountIds },
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    const pocketAllowanceThisMonth = pocketAllowanceAgg._sum.amount || 0;

    // 3b. Previous Month Aggregates (Strict Previous Calendar Month)
    const startOfPrevMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfPrevMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const prevMonthIncomeAgg = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: TransactionType.INCOME,
        transactionDate: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
    });
    const prevMonthExpensesAgg = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: TransactionType.EXPENSE,
        transactionDate: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
    });

    const previousMonthIncome = prevMonthIncomeAgg._sum.amount || 0;
    const previousMonthExpenses = prevMonthExpensesAgg._sum.amount || 0;
    const previousMonthSavings = previousMonthIncome - previousMonthExpenses;

    // 4. Spending by Category (This Month & All Time)
    const categoryExpenses = await this.db.transaction.findMany({
      where: { type: TransactionType.EXPENSE },
      include: { category: true },
    });

    const categoryMap: Record<string, { id: string; name: string; icon?: string; color?: string; amount: number }> = {};
    for (const tx of categoryExpenses) {
      const catId = tx.categoryId || 'uncategorized';
      const catName = tx.category?.name || 'Uncategorized';
      const icon = tx.category?.icon || 'tag';
      const color = tx.category?.color || '#94A3B8';

      if (!categoryMap[catId]) {
        categoryMap[catId] = { id: catId, name: catName, icon, color, amount: 0 };
      }
      categoryMap[catId].amount += tx.amount;
    }

    const spendingByCategory = Object.values(categoryMap)
      .map((cat) => ({
        ...cat,
        amount: Number(cat.amount.toFixed(2)),
        percentage: totalExpenses > 0 ? Number(((cat.amount / totalExpenses) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 5. Spending by Payment Method
    const paymentMap: Record<string, number> = {
      BANK_TRANSFER: 0,
      CREDIT_CARD: 0,
      CASH: 0,
      UPI: 0,
    };

    for (const tx of categoryExpenses) {
      const method = tx.paymentMethod || 'BANK_TRANSFER';
      paymentMap[method] = (paymentMap[method] || 0) + tx.amount;
    }

    const spendingByPaymentMethod = Object.entries(paymentMap).map(([method, amount]) => ({
      paymentMethod: method,
      amount: Number(amount.toFixed(2)),
      percentage: totalExpenses > 0 ? Number(((amount / totalExpenses) * 100).toFixed(1)) : 0,
    }));

    // 6. Monthly Trends (Last 6 months)
    const monthlyTrends: { month: string; income: number; expenses: number; savings: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      const incAgg = await this.db.transaction.aggregate({
        _sum: { amount: true },
        where: { type: TransactionType.INCOME, transactionDate: { gte: mStart, lte: mEnd } },
      });

      const expAgg = await this.db.transaction.aggregate({
        _sum: { amount: true },
        where: { type: TransactionType.EXPENSE, transactionDate: { gte: mStart, lte: mEnd } },
      });

      const inc = incAgg._sum.amount || 0;
      const exp = expAgg._sum.amount || 0;

      monthlyTrends.push({
        month: monthName,
        income: Number(inc.toFixed(2)),
        expenses: Number(exp.toFixed(2)),
        savings: Number((inc - exp).toFixed(2)),
      });
    }

    // 7. Active Subscriptions Overview
    const activeSubs = await this.db.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { sourceAccount: true, category: true },
    });

    let monthlySubscriptionCost = 0;
    for (const sub of activeSubs) {
      if (sub.billingCycle === 'WEEKLY') monthlySubscriptionCost += (sub.amount * 52) / 12;
      else if (sub.billingCycle === 'EVERY_28_DAYS') monthlySubscriptionCost += (sub.amount * 13) / 12;
      else if (sub.billingCycle === 'MONTHLY') monthlySubscriptionCost += sub.amount;
      else if (sub.billingCycle === 'QUARTERLY') monthlySubscriptionCost += sub.amount / 3;
      else if (sub.billingCycle === 'YEARLY') monthlySubscriptionCost += sub.amount / 12;
    }

    const upcomingSubscriptions = await this.db.subscription.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { nextBillingDate: 'asc' },
      take: 5,
      include: { sourceAccount: true, category: true },
    });

    // 8. Money Owed / Borrowed (Debts)
    const allDebts = await this.db.debt.findMany({
      where: { status: { not: 'SETTLED' } },
      orderBy: { createdAt: 'desc' },
    });

    let totalOwedToMe = 0; // People owe me
    let totalIOwe = 0;     // I owe people

    for (const d of allDebts) {
      const remaining = Math.max(0, d.amount - d.settledAmount);
      if (d.type === 'OWED_TO_ME') {
        totalOwedToMe += remaining;
      } else if (d.type === 'I_OWE') {
        totalIOwe += remaining;
      }
    }

    return {
      summary: {
        totalBalance: Number(totalLiquidBalance.toFixed(2)),
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        savings: Number(totalSavings.toFixed(2)),
        creditOutstanding: Number(creditOutstanding.toFixed(2)),
        spendingThisMonth: Number(spendingThisMonth.toFixed(2)),
        incomeThisMonth: Number(incomeThisMonth.toFixed(2)),
        savingsThisMonth: Number(savingsThisMonth.toFixed(2)),
        previousMonthSavings: Number(previousMonthSavings.toFixed(2)),
        previousMonthIncome: Number(previousMonthIncome.toFixed(2)),
        previousMonthExpenses: Number(previousMonthExpenses.toFixed(2)),
        pocketAllowanceBalance: Number(pocketAllowanceBalance.toFixed(2)),
        pocketAllowanceThisMonth: Number(pocketAllowanceThisMonth.toFixed(2)),
      },
      spendingByCategory,
      spendingByPaymentMethod,
      monthlyTrends,
      accounts: {
        bankBalances: Number(bankBalances.toFixed(2)),
        cashBalances: Number(cashBalances.toFixed(2)),
        upiBalances: Number(upiBalances.toFixed(2)),
        creditOutstanding: Number(creditOutstanding.toFixed(2)),
        breakdown: accountBreakdown,
      },
      recurring: {
        monthlySubscriptionCost: Number(monthlySubscriptionCost.toFixed(2)),
        activeSubscriptionsCount: activeSubs.length,
        upcomingSubscriptions,
      },
      debts: {
        totalOwedToMe: Number(totalOwedToMe.toFixed(2)),
        totalIOwe: Number(totalIOwe.toFixed(2)),
        netOutstanding: Number((totalOwedToMe - totalIOwe).toFixed(2)),
        activeDebtsCount: allDebts.length,
        activeDebts: allDebts.map((d) => ({
          ...d,
          remainingAmount: Number(Math.max(0, d.amount - d.settledAmount).toFixed(2)),
        })),
      },
    };
  }
}
