import { AnalyticsService } from '../../services/analytics.service';
import { TransactionService } from '../../services/transaction.service';
import { CreditCardService } from '../../services/creditCard.service';
import { SubscriptionService } from '../../services/subscription.service';
import { DebtService } from '../../services/debt.service';
import { FinancialProfileService } from '../../services/financialProfile.service';
import { FinancialAnalysisEngine } from '../../services/financialAnalysis.engine';
import { AccountRepository } from '../../repositories/account.repository';
import { CategoryRepository } from '../../repositories/category.repository';
import { TransactionType, PaymentMethod, AccountType } from '../../types/enums';

export function editDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex++) {
    const current = [firstIndex];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex++) {
      const substitutionCost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + substitutionCost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[second.length];
}

export function tokenizeAndNormalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

export function getStem(word: string): string {
  let w = word.toLowerCase();
  if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ies') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  return w;
}

export function isDynamicMatch(fieldValue: string | null | undefined, queryTerm: string): boolean {
  if (!fieldValue || !queryTerm) return false;
  const normField = fieldValue.toLowerCase().trim();
  const normQuery = queryTerm.toLowerCase().trim();
  if (!normField || !normQuery) return false;

  // 1. Exact or word-boundary match. Avoid matching "rent" inside "Parents".
  const escapedQuery = normQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const queryMatchesField = new RegExp(`\\b${escapedQuery}\\b`).test(normField);
  const fieldMatchesQuery = normField === normQuery;
  if (queryMatchesField || fieldMatchesQuery) {
    return true;
  }

  // 2. Tokenized & Stemmed / Fuzzy match
  const fieldTokens = tokenizeAndNormalize(normField);
  const queryTokens = tokenizeAndNormalize(normQuery);

  for (const qToken of queryTokens) {
    const qStem = getStem(qToken);
    for (const fToken of fieldTokens) {
      const fStem = getStem(fToken);

      if (fToken === qToken || fToken.startsWith(qToken) || qToken.startsWith(fToken)) {
        return true;
      }

      if (fStem.length >= 3 && qStem.length >= 3) {
        if (fStem === qStem || fStem.startsWith(qStem) || qStem.startsWith(fStem)) {
          return true;
        }
      }

      if (fToken.length >= 3 && qToken.length >= 3) {
        const minLen = Math.min(fToken.length, qToken.length);
        const maxAllowed = minLen > 7 ? 2 : 1;
        if (editDistance(fToken, qToken) <= maxAllowed || editDistance(fStem, qStem) <= maxAllowed) {
          return true;
        }
      }
    }
  }

  return false;
}

export class FinancialToolRegistry {
  constructor(
    private analyticsService = new AnalyticsService(),
    private transactionService = new TransactionService(),
    private creditCardService = new CreditCardService(),
    private subscriptionService = new SubscriptionService(),
    private debtService = new DebtService(),
    private profileService = new FinancialProfileService(),
    private analysisEngine = new FinancialAnalysisEngine(),
    private accountRepo = new AccountRepository(),
    private categoryRepo = new CategoryRepository()
  ) {}

  async getFinancialOverview() {
    return this.analysisEngine.getOverview();
  }

  async getNetWorth() {
    const overview = await this.analysisEngine.getOverview();
    return {
      netWorth: overview.netWorth,
      totalAssets: overview.totalBalance + overview.debtsOwedToMe,
      totalLiabilities: overview.creditCardOutstanding + overview.debtsIOwe,
    };
  }

  async getCurrentBalance() {
    const data = await this.analyticsService.getDashboardData();
    return {
      totalBalance: data.summary.totalBalance,
      bankBalances: data.accounts.bankBalances,
      cashBalances: data.accounts.cashBalances,
      upiBalances: data.accounts.upiBalances,
      previousMonthSavings: data.summary.previousMonthSavings,
      creditOutstanding: data.summary.creditOutstanding,
    };
  }

  async getMonthlyIncome(month?: number, year?: number) {
    const now = new Date();
    const queryYear = year || now.getFullYear();
    const queryMonth = month !== undefined ? month - 1 : now.getMonth();

    const start = new Date(Date.UTC(queryYear, queryMonth, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(queryYear, queryMonth + 1, 0, 23, 59, 59, 999));

    const txs = await this.transactionService.getTransactions({
      type: TransactionType.INCOME,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    const totalIncome = txs.reduce((sum, t) => sum + t.amount, 0);

    return {
      period: start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      totalIncome: Number(totalIncome.toFixed(2)),
      count: txs.length,
      transactions: txs.map((t) => ({
        amount: t.amount,
        merchant: t.merchant,
        description: t.description,
        date: t.transactionDate,
        category: t.category?.name,
      })),
    };
  }

  async getMonthlyExpenses(month?: number, year?: number) {
    const now = new Date();
    const queryYear = year || now.getFullYear();
    const queryMonth = month !== undefined ? month - 1 : now.getMonth();

    const start = new Date(Date.UTC(queryYear, queryMonth, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(queryYear, queryMonth + 1, 0, 23, 59, 59, 999));

    const txs = await this.transactionService.getTransactions({
      type: TransactionType.EXPENSE,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    const totalExpenses = txs.reduce((sum, t) => sum + t.amount, 0);

    return {
      period: start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      count: txs.length,
      transactions: txs.map((t) => ({
        amount: t.amount,
        merchant: t.merchant,
        description: t.description,
        date: t.transactionDate,
        category: t.category?.name,
        paymentMethod: t.paymentMethod,
      })),
    };
  }

  async getExpensesByCategory(categoryName?: string, month?: number, year?: number) {
    const dashboard = await this.analyticsService.getDashboardData();

    if (!categoryName) {
      return {
        spendingByCategory: dashboard.spendingByCategory,
        totalExpenses: dashboard.summary.totalExpenses,
      };
    }

    const categories = await this.categoryRepo.findAll();
    const normalizedCategoryName = categoryName.toLowerCase().trim();
    const matchingCategories = categories.filter((c) => isDynamicMatch(c.name, normalizedCategoryName));

    if (matchingCategories.length === 0) {
      return {
        found: false,
        message: `Category '${categoryName}' not found in financial records.`,
        availableCategories: categories.map((c) => c.name),
      };
    }

    const now = new Date();
    const queryYear = year || now.getFullYear();
    const queryMonth = month !== undefined ? month - 1 : now.getMonth();

    const start = new Date(Date.UTC(queryYear, queryMonth, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(queryYear, queryMonth + 1, 0, 23, 59, 59, 999));

    const allExpenses = await this.transactionService.getTransactions({
      type: TransactionType.EXPENSE,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    const matchingCategoryIds = new Set(matchingCategories.map((category) => category.id));
    const txs = allExpenses.filter((transaction) =>
      matchingCategoryIds.has(transaction.category?.id) || matchingCategoryIds.has(transaction.subcategory?.id)
    );

    const matchedCategory = matchingCategories
      .sort((first, second) => {
        const firstCount = txs.filter((transaction) =>
          transaction.category?.id === first.id || transaction.subcategory?.id === first.id
        ).length;
        const secondCount = txs.filter((transaction) =>
          transaction.category?.id === second.id || transaction.subcategory?.id === second.id
        ).length;
        return secondCount - firstCount;
      })[0];

    const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);

    return {
      found: true,
      categoryName: matchedCategory.name,
      period: start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      totalSpent: Number(totalSpent.toFixed(2)),
      count: txs.length,
      transactions: txs.map((t) => ({
        amount: t.amount,
        merchant: t.merchant,
        description: t.description,
        date: t.transactionDate,
        paymentMethod: t.paymentMethod,
        account: t.sourceAccount?.name || 'Unknown account',
      })),
    };
  }

  async getMerchantSpending(merchantName: string, month?: number, year?: number) {
    const now = new Date();
    const queryYear = year || now.getFullYear();
    const queryMonth = month !== undefined ? month - 1 : now.getMonth();
    const start = new Date(Date.UTC(queryYear, queryMonth, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(queryYear, queryMonth + 1, 0, 23, 59, 59, 999));
    const normalizedMerchant = merchantName.toLowerCase().trim();

    const expenses = await this.transactionService.getTransactions({
      type: TransactionType.EXPENSE,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    // A merchant-spending query must search the merchant identity, not every
    // transaction field. Searching categories/accounts/payment methods here can
    // pull unrelated transactions into a merchant result. Prefer exact/substring
    // merchant matches; only then allow a conservative fuzzy merchant match.
    const merchantScore = (field: string | null | undefined): number => {
      if (!field) return -1;
      const value = field.toLowerCase().trim();
      if (value === normalizedMerchant) return 10000;
      if (value.includes(normalizedMerchant)) return 9000;
      if (normalizedMerchant.includes(value) && value.length >= 4) return 8500;

      const fieldTokens = tokenizeAndNormalize(value);
      const queryTokens = tokenizeAndNormalize(normalizedMerchant);
      let best = -1;
      for (const qToken of queryTokens) {
        for (const fToken of fieldTokens) {
          if (fToken === qToken) best = Math.max(best, 8000);
          else if (fToken.startsWith(qToken) || qToken.startsWith(fToken)) best = Math.max(best, 7000);
          else if (fToken.length >= 4 && qToken.length >= 4) {
            const distance = editDistance(fToken, qToken);
            const allowed = Math.max(fToken.length, qToken.length) >= 8 ? 2 : 1;
            if (distance <= allowed) best = Math.max(best, 5000 - distance * 100);
          }
        }
      }
      return best;
    };

    const matchingTransactions = expenses.filter((transaction) =>
      merchantScore(transaction.merchant) >= 5000
    );
    const totalSpent = matchingTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    let displayMerchantName = merchantName;
    if (matchingTransactions.length > 0) {
      const firstTx = matchingTransactions[0];
      displayMerchantName = firstTx.merchant || firstTx.description || firstTx.category?.name || merchantName;
    } else {
      const categories = await this.categoryRepo.findAll();
      const matchedCat = categories.find((c) => isDynamicMatch(c.name, normalizedMerchant));
      if (matchedCat) {
        displayMerchantName = matchedCat.name;
      }
    }

    return {
      merchantName: displayMerchantName,
      period: start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      totalSpent: Number(totalSpent.toFixed(2)),
      count: matchingTransactions.length,
      transactions: matchingTransactions.map((transaction) => ({
        amount: transaction.amount,
        date: transaction.transactionDate,
        merchant: transaction.merchant,
        description: transaction.description,
        category: transaction.category?.name || 'Uncategorized',
        paymentMethod: transaction.paymentMethod,
        account: transaction.sourceAccount?.name || 'Unknown account',
      })),
    };
  }

  async getExpensesByPaymentMethod(paymentMethodStr?: string) {
    const dashboard = await this.analyticsService.getDashboardData();

    if (!paymentMethodStr) {
      return {
        spendingByPaymentMethod: dashboard.spendingByPaymentMethod,
      };
    }

    let pm: PaymentMethod | undefined;
    const lower = paymentMethodStr.toLowerCase();
    if (lower.includes('credit') || lower.includes('card')) pm = PaymentMethod.CREDIT_CARD;
    else if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe')) pm = PaymentMethod.UPI;
    else if (lower.includes('bank') || lower.includes('transfer')) pm = PaymentMethod.BANK_TRANSFER;
    else if (lower.includes('cash')) pm = PaymentMethod.CASH;

    const matched = dashboard.spendingByPaymentMethod.find((p) => p.paymentMethod === pm);

    return {
      paymentMethod: pm || paymentMethodStr,
      totalSpent: matched ? matched.amount : 0,
      percentage: matched ? matched.percentage : 0,
      allPaymentMethods: dashboard.spendingByPaymentMethod,
    };
  }

  async getExpensesByAccount(accountNameStr?: string, categoryNameStr?: string) {
    const accounts = await this.accountRepo.findAll();
    const categories = await this.categoryRepo.findAll();

    let matchedAccount = accounts.find((a) =>
      a.name.toLowerCase().includes((accountNameStr || '').toLowerCase())
    );

    let matchedCategory = categories.find((c) =>
      c.name.toLowerCase().includes((categoryNameStr || '').toLowerCase())
    );

    const txs = await this.transactionService.getTransactions({
      type: TransactionType.EXPENSE,
      accountId: matchedAccount?.id,
      categoryId: matchedCategory?.id,
    });

    const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);

    return {
      accountFilter: matchedAccount ? matchedAccount.name : accountNameStr || 'All Accounts',
      categoryFilter: matchedCategory ? matchedCategory.name : categoryNameStr || 'All Categories',
      totalSpent: Number(totalSpent.toFixed(2)),
      count: txs.length,
      transactions: txs.map((t) => ({
        amount: t.amount,
        merchant: t.merchant,
        description: t.description,
        date: t.transactionDate,
        category: t.category?.name,
        account: t.sourceAccount?.name,
      })),
    };
  }

  async getCreditCardOutstanding(cardNameStr?: string) {
    const analytics = await this.creditCardService.getCreditCardAnalytics();

    if (!cardNameStr) {
      return {
        totalOutstandingAmount: analytics.totalOutstandingAmount,
        totalAvailableCredit: analytics.totalAvailableCredit,
        totalCreditCardSpending: analytics.totalCreditCardSpending,
        totalStatementAmount: analytics.totalStatementAmount,
        totalMinimumPayment: analytics.totalMinimumPayment,
        cards: analytics.cards.map((c: any) => ({
          name: c.name,
          currentOutstanding: c.currentOutstanding,
          availableCredit: c.availableCredit,
          utilizationPercentage: c.utilizationPercentage,
          statementAmount: c.statementAmount,
          minimumPayment: c.minimumPayment,
        })),
        spendingByCategory: analytics.spendingByCategory,
      };
    }

    const matchedCard: any = analytics.cards.find((c: any) =>
      c.name.toLowerCase().includes(cardNameStr.toLowerCase())
    );

    if (!matchedCard) {
      return {
        found: false,
        message: `Credit card '${cardNameStr}' not found.`,
        availableCards: analytics.cards.map((c: any) => c.name),
      };
    }

    return {
      found: true,
      cardName: matchedCard.name,
      currentOutstanding: matchedCard.currentOutstanding,
      availableCredit: matchedCard.availableCredit,
      utilizationPercentage: matchedCard.utilizationPercentage,
      statementAmount: matchedCard.statementAmount,
      minimumPayment: matchedCard.minimumPayment,
    };
  }

  async getSubscriptionSummary() {
    return this.subscriptionService.getSubscriptionAnalytics();
  }

  async getUpcomingSubscriptions(daysAhead: number = 30) {
    return this.subscriptionService.getUpcomingPayments(daysAhead);
  }

  async comparePeriods() {
    const dashboard = await this.analyticsService.getDashboardData();
    const currentSavings = dashboard.summary.savingsThisMonth;
    const prevSavings = dashboard.summary.previousMonthSavings;
    const savingsDiff = currentSavings - prevSavings;

    return {
      currentMonth: {
        income: dashboard.summary.incomeThisMonth,
        expenses: dashboard.summary.spendingThisMonth,
        savings: currentSavings,
      },
      previousMonth: {
        income: dashboard.summary.previousMonthIncome,
        expenses: dashboard.summary.previousMonthExpenses,
        savings: prevSavings,
      },
      comparison: {
        spendingDifference: Number((dashboard.summary.spendingThisMonth - dashboard.summary.previousMonthExpenses).toFixed(2)),
        savingsDifference: Number(savingsDiff.toFixed(2)),
        status: savingsDiff >= 0 ? 'INCREASED_SAVINGS' : 'DECREASED_SAVINGS',
      },
    };
  }

  async getSpendingTrend() {
    const dashboard = await this.analyticsService.getDashboardData();
    return {
      monthlyTrends: dashboard.monthlyTrends,
    };
  }

  async getDebtsSummary() {
    return this.debtService.getDebtSummary();
  }

  async getCashFlowAnalysis(month?: number, year?: number) {
    return this.analysisEngine.getCashFlow(month, year);
  }

  async getSavingsAnalysis() {
    const overview = await this.analysisEngine.getOverview();
    const cashFlow = await this.analysisEngine.getCashFlow();
    const profile = await this.profileService.getProfile();

    const currentSavingsRate = cashFlow.savingsRate;
    const targetSavingsRate = profile.preferredSavingsRate || 20.0;
    const isMeetingTarget = currentSavingsRate >= targetSavingsRate;
    const expectedNextMonthIncome = cashFlow.inflow;
    const targetMonthlySavings = Number(((expectedNextMonthIncome * targetSavingsRate) / 100).toFixed(2));
    const currentMonthShortfall = Number(Math.max(0, targetMonthlySavings - cashFlow.netCashFlow).toFixed(2));
    const catchUpSavingsTarget = Number(
      Math.max(0, ((cashFlow.inflow + expectedNextMonthIncome) * targetSavingsRate) / 100 - cashFlow.netCashFlow).toFixed(2)
    );

    return {
      currentMonthlySavings: cashFlow.netCashFlow,
      currentSavingsRate,
      targetSavingsRate,
      isMeetingTarget,
      expectedNextMonthIncome,
      targetMonthlySavings,
      currentMonthShortfall,
      catchUpSavingsTarget,
      totalNetSavings: overview.netSavings,
      savingsGoal: profile.monthlySavingsGoal || null,
      emergencyFundTarget: profile.emergencyFundTarget || null,
    };
  }

  async getCategoryAnalysis() {
    return this.analysisEngine.getCategoryAnalysis();
  }

  async getAccountAnalysis() {
    const dashboard = await this.analyticsService.getDashboardData();
    return dashboard.accounts;
  }

  async getCreditCardAnalysis() {
    return this.creditCardService.getCreditCardAnalytics();
  }

  async getRecurringExpenseAnalysis() {
    const subSummary = await this.subscriptionService.getSubscriptionAnalytics();
    const dashboard = await this.analyticsService.getDashboardData();
    const totalExpenses = dashboard.summary.spendingThisMonth || dashboard.summary.totalExpenses;
    const subscriptionSharePercent = totalExpenses > 0
      ? Number(((subSummary.totalNormalizedMonthlyCost / totalExpenses) * 100).toFixed(1))
      : 0;

    return {
      monthlySubscriptionCost: subSummary.totalNormalizedMonthlyCost,
      annualSubscriptionCost: subSummary.totalNormalizedAnnualCost,
      subscriptionSharePercent,
      activeSubscriptionsCount: subSummary.activeSubscriptionCount,
      activeSubscriptions: subSummary.activeSubscriptions,
    };
  }

  async getUpcomingObligations(daysAhead: number = 30) {
    const upcomingSubs = await this.subscriptionService.getUpcomingPayments(daysAhead);
    const cards = await this.creditCardService.getCreditCardAnalytics();
    const debts = await this.debtService.getDebtSummary();

    const upcomingDebts = debts.debts.filter(
      (d: any) => d.type === 'I_OWE' && d.status !== 'SETTLED'
    );

    return {
      upcomingSubscriptions: upcomingSubs,
      creditCardMinimumPayments: cards.totalMinimumPayment,
      creditCardStatementAmounts: cards.totalStatementAmount,
      upcomingDebtsIOwe: upcomingDebts,
    };
  }

  async getLargeTransactions(limit: number = 5) {
    return this.analysisEngine.getLargeTransactions(limit);
  }

  async getSpendingAnomalies() {
    return this.analysisEngine.getSpendingAnomalies();
  }

  async getMerchantAnalysis(merchantName?: string) {
    return this.analysisEngine.getMerchantAnalysis(merchantName);
  }

  async getFinancialProfile() {
    return this.profileService.getProfile();
  }

  async runScenarioAnalysis(type: string, params: Record<string, any>) {
    return this.analysisEngine.runScenario(type, params);
  }

  async getFinancialAdvice() {
    const dashboard = await this.analyticsService.getDashboardData();
    const subs = await this.subscriptionService.getSubscriptionAnalytics();
    const cards = await this.creditCardService.getCreditCardAnalytics();
    const debts = await this.debtService.getDebtSummary();

    const income = dashboard.summary.incomeThisMonth || dashboard.summary.totalIncome;
    const expenses = dashboard.summary.spendingThisMonth || dashboard.summary.totalExpenses;
    const savings = dashboard.summary.savingsThisMonth;
    const savingsRate = income > 0 ? Number(((savings / income) * 100).toFixed(1)) : 0;

    const topCategory = dashboard.spendingByCategory.length > 0 ? dashboard.spendingByCategory[0] : null;

    return {
      incomeThisMonth: dashboard.summary.incomeThisMonth,
      spendingThisMonth: dashboard.summary.spendingThisMonth,
      savingsThisMonth: dashboard.summary.savingsThisMonth,
      savingsRate,
      topSpendingCategory: topCategory,
      spendingByCategory: dashboard.spendingByCategory,
      creditOutstanding: cards.totalOutstandingAmount,
      availableCredit: cards.totalAvailableCredit,
      monthlySubscriptionCost: subs.totalNormalizedMonthlyCost,
      annualSubscriptionCost: subs.totalNormalizedAnnualCost,
      activeSubscriptionsCount: subs.activeSubscriptionCount,
      totalOwedToMe: debts.totalOwedToMe,
      totalIOwe: debts.totalIOwe,
    };
  }

  async searchFinancialData(searchTerm: string) {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) {
      return this.analyticsService.getDashboardData();
    }

    // 1. Search Debts (Person name, notes, loanCategory, status, recordKind)
    const debts = await this.debtService.getDebts({});
    const matchingDebts = debts.filter(
      (d: any) =>
        isDynamicMatch(d.personName, term) ||
        isDynamicMatch(d.notes, term) ||
        isDynamicMatch(d.loanCategory, term) ||
        isDynamicMatch(d.recordKind, term) ||
        isDynamicMatch(d.status, term)
    );

    // 2. Search Transactions (Merchant, Description, Category, Source, Dest, PaymentMethod, ReferenceNumber)
    const transactions = await this.transactionService.getTransactions({});
    const matchingTransactions = transactions.filter(
      (t: any) =>
        isDynamicMatch(t.merchant, term) ||
        isDynamicMatch(t.description, term) ||
        isDynamicMatch(t.category?.name, term) ||
        isDynamicMatch(t.sourceAccount?.name, term) ||
        isDynamicMatch(t.destinationAccount?.name, term) ||
        isDynamicMatch(t.paymentMethod, term) ||
        isDynamicMatch(t.referenceNumber, term)
    );

    // 3. Search Subscriptions (Name, Notes, Category, SourceAccount, Status)
    const subscriptions = await this.subscriptionService.getAllSubscriptions({});
    const matchingSubscriptions = subscriptions.filter(
      (s: any) =>
        isDynamicMatch(s.name, term) ||
        isDynamicMatch(s.notes, term) ||
        isDynamicMatch(s.category?.name, term) ||
        isDynamicMatch(s.sourceAccount?.name, term) ||
        isDynamicMatch(s.status, term)
    );

    // 4. Search Accounts (Name, Institution, Type)
    const accounts = await this.accountRepo.findAll();
    const matchingAccounts = accounts.filter(
      (a) =>
        isDynamicMatch(a.name, term) ||
        isDynamicMatch(a.institution, term) ||
        isDynamicMatch(a.type, term)
    );

    return {
      searchTerm,
      matchingDebts,
      matchingTransactions,
      matchingSubscriptions,
      matchingAccounts,
    };
  }
}
