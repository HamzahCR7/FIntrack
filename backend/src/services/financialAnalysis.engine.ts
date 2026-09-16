import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { AnalyticsService } from './analytics.service';
import { TransactionService } from './transaction.service';
import { CreditCardService } from './creditCard.service';
import { SubscriptionService } from './subscription.service';
import { DebtService } from './debt.service';
import { FinancialProfileService } from './financialProfile.service';
import { TransactionType } from '../types/enums';

type RunwaySimulationInput = {
  months: number;
  salaryChangePercent: number;
  rentChangePercent: number;
  cancelSubscriptionsCount: number;
  extraMonthlyEmi: number;
};

export class FinancialAnalysisEngine {
  constructor(
    private db: PrismaClient = defaultPrisma,
    private analyticsService = new AnalyticsService(db),
    private transactionService = new TransactionService(db),
    private creditCardService = new CreditCardService(db),
    private subscriptionService = new SubscriptionService(db),
    private debtService = new DebtService(db),
    private profileService = new FinancialProfileService(db)
  ) {}

  /**
   * 1. Financial Overview & Net Worth
   */
  async getOverview() {
    const dashboard = await this.analyticsService.getDashboardData();
    const profile = await this.profileService.getProfile();
    const debts = await this.debtService.getDebtSummary();

    const netWorth = Number((dashboard.summary.totalBalance - dashboard.summary.creditOutstanding - debts.totalIOwe + debts.totalOwedToMe).toFixed(2));

    return {
      totalBalance: dashboard.summary.totalBalance,
      totalIncome: dashboard.summary.totalIncome,
      totalExpenses: dashboard.summary.totalExpenses,
      netSavings: dashboard.summary.savings,
      creditCardOutstanding: dashboard.summary.creditOutstanding,
      debtsOwedToMe: debts.totalOwedToMe,
      debtsIOwe: debts.totalIOwe,
      netWorth,
      profile,
    };
  }

  /**
   * 2. Cash Flow Analysis
   */
  async getCashFlow(month?: number, year?: number) {
    const now = new Date();
    const qYear = year || now.getFullYear();
    const qMonth = month !== undefined ? month - 1 : now.getMonth();

    const start = new Date(Date.UTC(qYear, qMonth, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(qYear, qMonth + 1, 0, 23, 59, 59, 999));

    const incomeTxs = await this.transactionService.getTransactions({
      type: TransactionType.INCOME,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    const expenseTxs = await this.transactionService.getTransactions({
      type: TransactionType.EXPENSE,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    const inflow = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
    const outflow = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
    const netCashFlow = Number((inflow - outflow).toFixed(2));

    return {
      period: start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      inflow: Number(inflow.toFixed(2)),
      outflow: Number(outflow.toFixed(2)),
      netCashFlow,
      savingsRate: inflow > 0 ? Number(((netCashFlow / inflow) * 100).toFixed(1)) : 0,
    };
  }

  /**
   * 3. Category Baselines and Spending Drivers
   */
  async getCategoryAnalysis() {
    const dashboard = await this.analyticsService.getDashboardData();
    const allExpenses = await this.transactionService.getTransactions({ type: TransactionType.EXPENSE });

    // Group expenses by category and month
    const categoryMonthMap: Record<string, Record<string, number>> = {};
    for (const tx of allExpenses) {
      const catName = tx.category?.name || 'Uncategorized';
      const d = new Date(tx.transactionDate);
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

      if (!categoryMonthMap[catName]) categoryMonthMap[catName] = {};
      categoryMonthMap[catName][mKey] = (categoryMonthMap[catName][mKey] || 0) + tx.amount;
    }

    const currentMonthExpenses = dashboard.summary.spendingThisMonth;
    const categoryDrivers = dashboard.spendingByCategory.map((cat) => {
      const history = categoryMonthMap[cat.name] || {};
      const monthlyValues = Object.values(history);
      const avg = monthlyValues.length > 0
        ? monthlyValues.reduce((a, b) => a + b, 0) / Math.max(1, monthlyValues.length)
        : cat.amount;

      const delta = Number((cat.amount - avg).toFixed(2));
      const percentageChange = avg > 0 ? Number(((delta / avg) * 100).toFixed(1)) : 0;

      return {
        categoryName: cat.name,
        currentAmount: cat.amount,
        historicalAverage: Number(avg.toFixed(2)),
        deltaFromAverage: delta,
        percentageChange,
        isIncrease: delta > 0,
      };
    }).sort((a, b) => b.deltaFromAverage - a.deltaFromAverage);

    return {
      currentTotalExpenses: currentMonthExpenses,
      categories: categoryDrivers,
      topDriver: categoryDrivers.length > 0 ? categoryDrivers[0] : null,
    };
  }

  /**
   * 4. Anomaly Detection (Outlier Transactions)
   */
  async getSpendingAnomalies() {
    const allExpenses = await this.transactionService.getTransactions({ type: TransactionType.EXPENSE });

    if (allExpenses.length === 0) {
      return { anomalies: [] };
    }

    const amounts = allExpenses.map((t) => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Anomalies = transactions > mean + 1.5 * stdDev
    const threshold = mean + Math.max(stdDev * 1.5, mean * 0.5);

    const anomalies = allExpenses
      .filter((t) => t.amount >= threshold)
      .map((t) => ({
        id: t.id,
        amount: t.amount,
        merchant: t.merchant || 'Unknown',
        description: t.description || t.category?.name || 'Expense',
        category: t.category?.name,
        date: t.transactionDate,
        paymentMethod: t.paymentMethod,
        baselineMean: Number(mean.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      anomalyCount: anomalies.length,
      thresholdAmount: Number(threshold.toFixed(2)),
      anomalies,
    };
  }

  /**
   * 5. Large Transactions
   */
  async getLargeTransactions(limit: number = 5) {
    const allExpenses = await this.transactionService.getTransactions({ type: TransactionType.EXPENSE });
    const sorted = allExpenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
      .map((t) => ({
        amount: t.amount,
        merchant: t.merchant || t.description || 'Expense',
        category: t.category?.name,
        paymentMethod: t.paymentMethod,
        date: t.transactionDate,
      }));

    return {
      count: sorted.length,
      largeTransactions: sorted,
    };
  }

  /**
   * 6. Merchant Spending Analysis
   */
  async getMerchantAnalysis(merchantName?: string) {
    const allExpenses = await this.transactionService.getTransactions({ type: TransactionType.EXPENSE });

    const merchantMap: Record<string, { merchant: string; totalSpent: number; count: number }> = {};
    for (const tx of allExpenses) {
      const name = (tx.merchant || tx.description || 'Unspecified').trim();
      if (!merchantMap[name]) {
        merchantMap[name] = { merchant: name, totalSpent: 0, count: 0 };
      }
      merchantMap[name].totalSpent += tx.amount;
      merchantMap[name].count += 1;
    }

    const merchants = Object.values(merchantMap)
      .map((m) => ({ ...m, totalSpent: Number(m.totalSpent.toFixed(2)) }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    if (merchantName) {
      const queryLower = merchantName.toLowerCase();
      const filtered = merchants.filter((m) => m.merchant.toLowerCase().includes(queryLower));
      return {
        query: merchantName,
        foundCount: filtered.length,
        merchants: filtered,
      };
    }

    return {
      totalMerchants: merchants.length,
      topMerchants: merchants.slice(0, 5),
      merchants,
    };
  }

  /**
   * 7. Scenario Analysis (What-If Calculations)
   */
  async runScenario(type: string, params: Record<string, any>) {
    const dashboard = await this.analyticsService.getDashboardData();
    const currentMonthlyExpenses = dashboard.summary.spendingThisMonth || dashboard.summary.totalExpenses;
    const currentMonthlyIncome = dashboard.summary.incomeThisMonth || dashboard.summary.totalIncome;
    const currentMonthlySavings = dashboard.summary.savingsThisMonth;

    if (type === 'REDUCE_CATEGORY_SPEND') {
      const { categoryName, reductionAmount, reductionPercent } = params;
      const category = dashboard.spendingByCategory.find(
        (c) => c.name.toLowerCase().includes((categoryName || '').toLowerCase())
      );

      const currentSpend = category ? category.amount : 0;
      let calculatedReduction = 0;

      if (reductionPercent) {
        calculatedReduction = (currentSpend * reductionPercent) / 100;
      } else if (reductionAmount) {
        calculatedReduction = Math.min(currentSpend, reductionAmount);
      }

      const newCategorySpend = Math.max(0, currentSpend - calculatedReduction);
      const newMonthlyExpenses = Math.max(0, currentMonthlyExpenses - calculatedReduction);
      const newMonthlySavings = currentMonthlyIncome - newMonthlyExpenses;
      const annualSavingsIncrease = calculatedReduction * 12;

      return {
        scenarioType: 'REDUCE_CATEGORY_SPEND',
        categoryName: category ? category.name : categoryName,
        currentSpend,
        reductionAmount: Number(calculatedReduction.toFixed(2)),
        newCategorySpend: Number(newCategorySpend.toFixed(2)),
        currentMonthlySavings: Number(currentMonthlySavings.toFixed(2)),
        newMonthlySavings: Number(newMonthlySavings.toFixed(2)),
        annualSavingsIncrease: Number(annualSavingsIncrease.toFixed(2)),
      };
    }

    if (type === 'SAVINGS_GOAL_HORIZON') {
      const { targetAmount, monthlySavings } = params;
      const savingsPerMonth = monthlySavings || Math.max(1000, currentMonthlySavings);
      const monthsRequired = Math.ceil(targetAmount / savingsPerMonth);
      const yearsRequired = Number((monthsRequired / 12).toFixed(1));

      return {
        scenarioType: 'SAVINGS_GOAL_HORIZON',
        targetAmount,
        monthlySavings: savingsPerMonth,
        monthsRequired,
        yearsRequired,
      };
    }

    return {
      scenarioType: type,
      message: 'Scenario calculated based on verified financial ledger metrics.',
      currentMonthlyIncome,
      currentMonthlyExpenses,
      currentMonthlySavings,
    };
  }

  async getRunwaySimulation(input: RunwaySimulationInput) {
    const dashboard = await this.analyticsService.getDashboardData();
    const months = Math.max(3, Math.min(24, input.months));

    const recentMonths = dashboard.monthlyTrends.slice(-3);
    const averageIncomeFromTrend = recentMonths.length
      ? recentMonths.reduce((sum, item) => sum + item.income, 0) / recentMonths.length
      : 0;
    const averageExpenseFromTrend = recentMonths.length
      ? recentMonths.reduce((sum, item) => sum + item.expenses, 0) / recentMonths.length
      : 0;

    const baselineIncome = Number((averageIncomeFromTrend || dashboard.summary.incomeThisMonth || 0).toFixed(2));
    const baselineExpenses = Number((averageExpenseFromTrend || dashboard.summary.spendingThisMonth || 0).toFixed(2));
    const startingBalance = Number((dashboard.summary.totalBalance || 0).toFixed(2));

    const rentCategory = dashboard.spendingByCategory.find((item) => item.name.toLowerCase().includes('rent'));
    const estimatedRent = rentCategory?.amount || 0;
    const rentAdjustment = Number(((estimatedRent * input.rentChangePercent) / 100).toFixed(2));

    const activeSubscriptions = await this.db.subscription.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { amount: 'desc' },
      take: 30,
    });

    const toMonthlyCost = (amount: number, billingCycle: string): number => {
      if (billingCycle === 'WEEKLY') return (amount * 52) / 12;
      if (billingCycle === 'EVERY_28_DAYS') return (amount * 13) / 12;
      if (billingCycle === 'MONTHLY') return amount;
      if (billingCycle === 'QUARTERLY') return amount / 3;
      if (billingCycle === 'YEARLY') return amount / 12;
      return amount;
    };

    const sortedSubs = activeSubscriptions
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        monthlyCost: Number(toMonthlyCost(sub.amount, sub.billingCycle).toFixed(2)),
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost);

    const cancelledSubscriptions = sortedSubs.slice(0, Math.max(0, input.cancelSubscriptionsCount));
    const monthlySubscriptionSavings = Number(
      cancelledSubscriptions.reduce((sum, sub) => sum + sub.monthlyCost, 0).toFixed(2)
    );

    const scenarioIncome = Number((baselineIncome * (1 + input.salaryChangePercent / 100)).toFixed(2));
    const scenarioExpenses = Number(
      Math.max(0, baselineExpenses + rentAdjustment + input.extraMonthlyEmi - monthlySubscriptionSavings).toFixed(2)
    );

    const baselineNet = Number((baselineIncome - baselineExpenses).toFixed(2));
    const scenarioNet = Number((scenarioIncome - scenarioExpenses).toFixed(2));

    const timeline: Array<{
      monthIndex: number;
      monthLabel: string;
      baselineBalance: number;
      scenarioBalance: number;
    }> = [];

    let baselineBalance = startingBalance;
    let scenarioBalance = startingBalance;
    let firstNegativeMonth: number | null = null;

    for (let monthIndex = 1; monthIndex <= months; monthIndex += 1) {
      baselineBalance = Number((baselineBalance + baselineNet).toFixed(2));
      scenarioBalance = Number((scenarioBalance + scenarioNet).toFixed(2));

      if (firstNegativeMonth === null && scenarioBalance < 0) {
        firstNegativeMonth = monthIndex;
      }

      timeline.push({
        monthIndex,
        monthLabel: `M${monthIndex}`,
        baselineBalance,
        scenarioBalance,
      });
    }

    let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (firstNegativeMonth !== null && firstNegativeMonth <= 3) {
      level = 'HIGH';
    } else if (firstNegativeMonth !== null && firstNegativeMonth <= 6) {
      level = 'MEDIUM';
    }

    const monthlyIncomeDelta = Number((baselineIncome - scenarioIncome).toFixed(2));
    const monthlyRentPressure = Number(Math.max(0, rentAdjustment).toFixed(2));
    const monthlySubscriptionRelief = Number(monthlySubscriptionSavings.toFixed(2));
    const monthlyEmiPressure = Number(input.extraMonthlyEmi.toFixed(2));

    const dropDrivers = [
      { name: 'Income change', monthlyImpact: monthlyIncomeDelta },
      { name: 'Rent change', monthlyImpact: monthlyRentPressure },
      { name: 'Extra EMI', monthlyImpact: monthlyEmiPressure },
      { name: 'Subscription cuts', monthlyImpact: -monthlySubscriptionRelief },
    ].sort((a, b) => b.monthlyImpact - a.monthlyImpact);

    const biggestDropDriver = dropDrivers[0] || { name: 'No major pressure', monthlyImpact: 0 };

    const recommendations: string[] = [];
    if (scenarioNet < 0) {
      recommendations.push('Your scenario is net negative. Reduce monthly discretionary spend or increase income to avoid balance erosion.');
    }
    if (monthlySubscriptionSavings <= 0.01 && sortedSubs.length > 0) {
      recommendations.push('Try cancelling at least one high-cost subscription to improve monthly runway.');
    }
    if (monthlyRentPressure > 0) {
      recommendations.push('Rent increase is a major pressure. Offset it with matching cuts in flexible categories.');
    }
    if (recommendations.length < 3) {
      recommendations.push('Build a one-month cash buffer to reduce short-term risk from income or expense shocks.');
    }
    if (recommendations.length < 3) {
      recommendations.push('Review debt repayment timing to avoid adding extra EMI during cash-tight months.');
    }

    return {
      assumptions: {
        months,
        salaryChangePercent: input.salaryChangePercent,
        rentChangePercent: input.rentChangePercent,
        cancelSubscriptionsCount: input.cancelSubscriptionsCount,
        extraMonthlyEmi: input.extraMonthlyEmi,
      },
      baseline: {
        startingBalance,
        monthlyIncome: baselineIncome,
        monthlyExpenses: baselineExpenses,
        monthlyNet: baselineNet,
      },
      scenario: {
        monthlyIncome: scenarioIncome,
        monthlyExpenses: scenarioExpenses,
        monthlyNet: scenarioNet,
        monthlySubscriptionSavings,
      },
      risk: {
        level,
        monthsUntilNegative: firstNegativeMonth,
        firstNegativeMonthLabel: firstNegativeMonth ? `M${firstNegativeMonth}` : null,
        biggestDropDriver,
      },
      timeline,
      recommendations: recommendations.slice(0, 3),
      cancelledSubscriptions,
    };
  }

  /**
   * 8. Spend Forecasting (Month-End Projection & Budget Risk)
   */
  async getSpendForecast() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const daysElapsed = Math.max(1, now.getUTCDate());
    const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

    const dashboard = await this.analyticsService.getDashboardData();
    const profile = await this.profileService.getProfile();
    const spendingSoFar = dashboard.summary.spendingThisMonth;
    const incomeThisMonth = dashboard.summary.incomeThisMonth || dashboard.summary.totalIncome;
    const incomeTarget = profile.monthlyIncomeTarget || incomeThisMonth;
    const dailyBurnRate = Number((spendingSoFar / daysElapsed).toFixed(2));
    const projectedMonthEndSpend = Number((dailyBurnRate * daysInMonth).toFixed(2));
    const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const currentMonthExpenseTxs = await this.db.transaction.findMany({
      where: {
        type: TransactionType.EXPENSE,
        transactionDate: {
          gte: monthStart,
          lte: now,
        },
      },
      select: {
        amount: true,
        transactionDate: true,
      },
    });

    const weeklyBuckets: Record<number, { spent: number; daysCovered: number }> = {};
    for (let day = 1; day <= daysElapsed; day += 1) {
      const weekNumber = Math.floor((day - 1) / 7) + 1;
      if (!weeklyBuckets[weekNumber]) {
        weeklyBuckets[weekNumber] = { spent: 0, daysCovered: 0 };
      }
      weeklyBuckets[weekNumber].daysCovered += 1;
    }

    for (const tx of currentMonthExpenseTxs) {
      const txDate = new Date(tx.transactionDate);
      const dayOfMonth = txDate.getUTCDate();
      const weekNumber = Math.floor((dayOfMonth - 1) / 7) + 1;
      if (!weeklyBuckets[weekNumber]) {
        weeklyBuckets[weekNumber] = { spent: 0, daysCovered: 0 };
      }
      weeklyBuckets[weekNumber].spent += tx.amount;
    }

    const weekNumbers = Object.keys(weeklyBuckets)
      .map((n) => Number(n))
      .sort((a, b) => a - b);

    const weeklyTrendPoints = weekNumbers.map((weekNumber) => {
      const bucket = weeklyBuckets[weekNumber];
      const spent = Number(bucket.spent.toFixed(2));
      const daysCovered = Math.max(1, bucket.daysCovered);
      const burnRate = Number((spent / daysCovered).toFixed(2));
      return {
        weekNumber,
        weekLabel: `W${weekNumber}`,
        spent,
        daysCovered,
        burnRate,
      };
    });

    const latestWeekPoint = weeklyTrendPoints[weeklyTrendPoints.length - 1] || null;
    const previousWeekPoint = weeklyTrendPoints[weeklyTrendPoints.length - 2] || null;

    const weekOverWeekBurnRateChangeAmount = latestWeekPoint && previousWeekPoint
      ? Number((latestWeekPoint.burnRate - previousWeekPoint.burnRate).toFixed(2))
      : null;
    const weekOverWeekBurnRateChangePercent = latestWeekPoint && previousWeekPoint && previousWeekPoint.burnRate > 0
      ? Number(((weekOverWeekBurnRateChangeAmount! / previousWeekPoint.burnRate) * 100).toFixed(1))
      : null;

    let weekOverWeekDirection: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (weekOverWeekBurnRateChangeAmount !== null) {
      if (weekOverWeekBurnRateChangeAmount <= -0.01) {
        weekOverWeekDirection = 'IMPROVING';
      } else if (weekOverWeekBurnRateChangeAmount >= 0.01) {
        weekOverWeekDirection = 'DECLINING';
      } else {
        weekOverWeekDirection = 'STABLE';
      }
    }

    const projectedSavings = Number((incomeThisMonth - projectedMonthEndSpend).toFixed(2));
    const projectedOverspend = Number(Math.max(0, projectedMonthEndSpend - incomeTarget).toFixed(2));
    const onTrackForSavingsGoal = profile.monthlySavingsGoal
      ? projectedSavings >= profile.monthlySavingsGoal
      : projectedSavings >= 0;

    const activeBudgets = await this.db.budget.findMany({ where: { isActive: true } });
    const budgetForecasts = await Promise.all(
      activeBudgets.map(async (budget) => {
        const cycleStart = new Date(budget.billingCycleStartDate);
        const cycleEnd = new Date(budget.billingCycleEndDate);
        const totalCycleDays = Math.max(1, Math.round((cycleEnd.getTime() - cycleStart.getTime()) / 86400000) + 1);
        const cycleDaysElapsed = Math.min(
          totalCycleDays,
          Math.max(1, Math.round((now.getTime() - cycleStart.getTime()) / 86400000) + 1)
        );

        const categoryIds = (budget.categoryIds || budget.categoryId || '').split(',').filter(Boolean);
        const spentTxs = await this.db.transaction.findMany({
          where: {
            type: TransactionType.EXPENSE,
            transactionDate: { gte: cycleStart, lte: cycleEnd },
            ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
          },
        });

        const spentSoFar = spentTxs.reduce((sum, t) => sum + t.amount, 0);
        const budgetDailyRate = spentSoFar / cycleDaysElapsed;
        const projectedSpend = Number((budgetDailyRate * totalCycleDays).toFixed(2));
        const projectedOverBudget = Number(Math.max(0, projectedSpend - budget.amount).toFixed(2));

        return {
          budgetId: budget.id,
          budgetName: budget.name,
          budgetAmount: budget.amount,
          spentSoFar: Number(spentSoFar.toFixed(2)),
          projectedSpend,
          projectedOverBudget,
          willExceed: projectedSpend > budget.amount,
        };
      })
    );

    return {
      daysElapsed,
      daysRemaining,
      daysInMonth,
      spendingSoFar: Number(spendingSoFar.toFixed(2)),
      dailyBurnRate,
      projectedMonthEndSpend,
      incomeThisMonth: Number(incomeThisMonth.toFixed(2)),
      projectedSavings,
      projectedOverspend,
      willOverspend: projectedOverspend > 0,
      onTrackForSavingsGoal,
      currentMonthWeeklyTrend: {
        direction: weekOverWeekDirection,
        changeAmount: weekOverWeekBurnRateChangeAmount,
        changePercent: weekOverWeekBurnRateChangePercent,
        points: weeklyTrendPoints,
      },
      budgetForecasts: budgetForecasts.sort((a, b) => b.projectedOverBudget - a.projectedOverBudget),
    };
  }
}
