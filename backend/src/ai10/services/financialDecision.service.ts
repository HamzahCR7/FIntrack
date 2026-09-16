export interface PurchaseRequest {
  amount?: number;
  category?: string;
  description?: string;
  targetMonths?: number;
}

export interface SavingsGoalRequest {
  targetAmount?: number;
  targetMonths?: number;
  itemName?: string;
}

export class FinancialDecisionService {
  evaluateAffordability(purchase: PurchaseRequest, context: Record<string, any>) {
    const overview = context.overview || {};
    const cashFlow = context.cashFlow || {};
    const income = Number(cashFlow.inflow || overview.totalIncome || 0);
    const expenses = Number(cashFlow.outflow || overview.totalExpenses || 0);
    const surplus = Number((income - expenses).toFixed(2));
    const balance = Number(overview.totalBalance || 0);
    const amount = purchase.amount;
    const safeSingleSpend = Math.max(0, Math.round(Math.max(surplus, 0) * 0.1));

    return {
      ...purchase,
      income,
      expenses,
      monthlySurplus: surplus,
      currentBalance: balance,
      safeSingleSpend,
      affordable: amount === undefined ? undefined : amount <= safeSingleSpend && amount <= balance,
      remainingBalance: amount === undefined ? undefined : Number((balance - amount).toFixed(2)),
    };
  }


  evaluateSavingsGoal(goal: SavingsGoalRequest, context: Record<string, any>) {
    const overview = context.overview || {};
    const cashFlow = context.cashFlow || {};

    const income = Number(cashFlow.inflow || overview.totalIncome || 0);
    const expenses = Number(cashFlow.outflow || overview.totalExpenses || 0);
    const currentMonthlySavings = Number((income - expenses).toFixed(2));

    const targetAmount = goal.targetAmount;
    const targetMonths = goal.targetMonths;

    if (!targetAmount || targetAmount <= 0 || !targetMonths || targetMonths <= 0) {
      return {
        ...goal,
        income,
        expenses,
        currentMonthlySavings,
        requiredMonthlySavings: undefined,
        monthlyGap: undefined,
        achievableWithCurrentSurplus: undefined,
      };
    }

    const requiredMonthlySavings = Number((targetAmount / targetMonths).toFixed(2));
    const monthlyGap = Number((requiredMonthlySavings - currentMonthlySavings).toFixed(2));

    return {
      ...goal,
      income,
      expenses,
      currentMonthlySavings,
      requiredMonthlySavings,
      monthlyGap,
      achievableWithCurrentSurplus: monthlyGap <= 0,
      projectedSavingsAtCurrentPace: Number((currentMonthlySavings * targetMonths).toFixed(2)),
    };
  }

  evaluateSavingsRatePlan(targetSavingsRate: number | undefined, context: Record<string, any>) {
    const overview = context.overview || {};
    const cashFlow = context.cashFlow || {};
    const income = Number(cashFlow.inflow || overview.totalIncome || 0);
    const expenses = Number(cashFlow.outflow || overview.totalExpenses || 0);
    const currentMonthlySavings = Number((income - expenses).toFixed(2));
    const rate = Number(targetSavingsRate || 0);

    if (income <= 0 || rate <= 0 || rate > 100) {
      return {
        targetSavingsRate: rate,
        income,
        expenses,
        currentMonthlySavings,
        currentSavingsRate: income > 0 ? Number(((currentMonthlySavings / income) * 100).toFixed(1)) : 0,
        targetMonthlySavings: undefined,
        monthlyGap: undefined,
        largestCategories: [],
        monthlySubscriptionCost: 0,
        upcomingAmount: 0,
      };
    }

    const targetMonthlySavings = Number((income * rate / 100).toFixed(2));
    const monthlyGap = Number(Math.max(0, targetMonthlySavings - currentMonthlySavings).toFixed(2));

    const rawCategories = context.categorySpending?.spendingByCategory || context.categorySpending || [];
    const categories = Array.isArray(rawCategories)
      ? rawCategories.map((item: any) => ({
          name: item.categoryName || item.name || item.category || 'Unknown',
          amount: Number(item.amount ?? item.totalSpent ?? item.value ?? 0),
          percentage: Number(item.percentage ?? 0),
        })).filter((item: any) => item.amount > 0)
      : [];

    const recurring = context.recurringExpenses || {};
    const monthlySubscriptionCost = Number(recurring.monthlySubscriptionCost || 0);
    const activeSubscriptions = Array.isArray(recurring.activeSubscriptions) ? recurring.activeSubscriptions : [];

    const obligations = context.upcomingObligations || {};
    const upcomingAmount = Number(
      obligations.totalUpcomingAmount || obligations.totalAmount || obligations.amount || 0
    );

    return {
      targetSavingsRate: rate,
      income,
      expenses,
      currentMonthlySavings,
      currentSavingsRate: Number(((currentMonthlySavings / income) * 100).toFixed(1)),
      targetMonthlySavings,
      monthlyGap,
      alreadyMeetingTarget: currentMonthlySavings >= targetMonthlySavings,
      largestCategories: categories.sort((a: any, b: any) => b.amount - a.amount).slice(0, 8),
      monthlySubscriptionCost,
      activeSubscriptionsCount: activeSubscriptions.length,
      activeSubscriptions,
      upcomingAmount,
    };
  }

  evaluateMonthlySavingsPlan(targetMonthlySavings: number | undefined, context: Record<string, any>) {
    const overview = context.overview || {};
    const cashFlow = context.cashFlow || {};
    const income = Number(cashFlow.inflow || overview.totalIncome || 0);
    const expenses = Number(cashFlow.outflow || overview.totalExpenses || 0);
    const currentMonthlySavings = Number((income - expenses).toFixed(2));
    const target = Number(targetMonthlySavings || 0);
    const gap = Number(Math.max(0, target - currentMonthlySavings).toFixed(2));

    const rawCategories = context.categorySpending?.spendingByCategory || context.categorySpending || [];
    const categories = Array.isArray(rawCategories)
      ? rawCategories.map((item: any) => ({
          name: item.categoryName || item.name || item.category || 'Unknown',
          amount: Number(item.amount ?? item.totalSpent ?? item.value ?? 0),
          percentage: Number(item.percentage ?? 0),
        })).filter((item: any) => item.amount > 0)
      : [];

    const recurring = context.recurringExpenses || {};
    const monthlySubscriptionCost = Number(recurring.monthlySubscriptionCost || 0);
    const activeSubscriptions = Array.isArray(recurring.activeSubscriptions) ? recurring.activeSubscriptions : [];

    const obligations = context.upcomingObligations || {};
    const upcomingAmount = Number(
      obligations.totalUpcomingAmount || obligations.totalAmount || obligations.amount || 0
    );

    // Rank actual categories by spend. These are opportunities, not automatic recommendations.
    const largestCategories = categories
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 8);

    return {
      targetMonthlySavings: target,
      income,
      expenses,
      currentMonthlySavings,
      monthlyGap: gap,
      alreadyMeetingTarget: currentMonthlySavings >= target,
      extraSavingsNeeded: gap,
      savingsRate: income > 0 ? Number(((currentMonthlySavings / income) * 100).toFixed(1)) : 0,
      targetSavingsRate: income > 0 ? Number(((target / income) * 100).toFixed(1)) : 0,
      largestCategories,
      monthlySubscriptionCost,
      activeSubscriptionsCount: activeSubscriptions.length,
      activeSubscriptions,
      upcomingAmount,
      categoryCutNeededToCloseGap: gap,
    };
  }


  evaluateInvestmentContribution(
    input: { amount?: number; frequency?: string; instrument?: string },
    context: Record<string, any>
  ) {
    const overview = context.overview || {};
    const cashFlow = context.cashFlow || {};
    const income = Number(cashFlow.inflow || overview.totalIncome || 0);
    const expenses = Number(cashFlow.outflow || overview.totalExpenses || 0);
    const currentMonthlySurplus = Number((income - expenses).toFixed(2));
    const amount = Number(input.amount || 0);
    const frequency = (input.frequency || 'monthly').toLowerCase();
    const monthlyContribution = frequency === 'weekly'
      ? Number((amount * 52 / 12).toFixed(2))
      : frequency === 'yearly' || frequency === 'annual'
        ? Number((amount / 12).toFixed(2))
        : amount;

    const remainingMonthlySurplus = Number((currentMonthlySurplus - monthlyContribution).toFixed(2));
    const contributionOfIncome = income > 0
      ? Number(((monthlyContribution / income) * 100).toFixed(1))
      : 0;
    const contributionOfSurplus = currentMonthlySurplus > 0
      ? Number(((monthlyContribution / currentMonthlySurplus) * 100).toFixed(1))
      : 0;

    const profile = context.investmentContext?.financialProfile || {};
    const balance = Number(
      context.investmentContext?.currentBalance?.totalBalance ?? overview.totalBalance ?? 0
    );
    const savings = context.investmentContext?.savingsAnalysis || {};
    const existingInvestments = Number(
      savings.investments || savings.totalInvestments || profile.investments || 0
    );

    const debtSummary = context.debts || {};
    const debtOutstanding = Number(
      debtSummary.totalIOwe ?? debtSummary.totalDebt ?? debtSummary.outstanding ?? 0
    );

    return {
      ...input,
      amount,
      frequency,
      instrument: input.instrument || 'investment',
      income,
      expenses,
      currentMonthlySurplus,
      monthlyContribution,
      remainingMonthlySurplus,
      contributionOfIncome,
      contributionOfSurplus,
      currentBalance: balance,
      existingInvestments,
      debtOutstanding,
      cashFlowAfterContributionIsPositive: remainingMonthlySurplus >= 0,
      hasEnoughDataForRecommendation: income > 0,
    };
  }

  evaluateScenario(amount: number | undefined, context: Record<string, any>) {
    const cashFlow = context.cashFlow || {};
    const income = Number(cashFlow.inflow || context.overview?.totalIncome || 0);
    const expenses = Number(cashFlow.outflow || context.overview?.totalExpenses || 0);
    const spend = amount || 0;
    return {
      amount,
      currentMonthlySavings: Number((income - expenses).toFixed(2)),
      projectedMonthlySavings: Number((income - expenses - spend).toFixed(2)),
      balanceAfterSpend: context.overview?.totalBalance === undefined
        ? undefined
        : Number((context.overview.totalBalance - spend).toFixed(2)),
    };
  }
}