export type AccountType = 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH' | 'UPI' | 'AMAZON_PAY';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type PaymentMethod = 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CASH' | 'UPI';
export type BillingCycle = 'WEEKLY' | 'EVERY_28_DAYS' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type DebtType = 'OWED_TO_ME' | 'I_OWE';
export type DebtRecordKind = 'PERSONAL' | 'LOAN';
export type DebtStatus = 'PENDING' | 'PARTIALLY_SETTLED' | 'SETTLED';
export type QuickItemType = 'NOTE' | 'TODO' | 'REMINDER';
export type QuickItemPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface QuickItem {
  id: string;
  type: QuickItemType;
  title: string;
  details?: string | null;
  price?: number | null;
  category?: string | null;
  priority: QuickItemPriority;
  dueDate?: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  personName: string;
  type: DebtType;
  recordKind: DebtRecordKind;
  loanCategory?: string;
  loanItem?: string;
  emiAmount?: number;
  amount: number;
  settledAmount: number;
  remainingAmount: number;
  dueDate?: string;
  status: DebtStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  currentBalance: number;
  creditLimit?: number;
  lastFourDigits?: string;
  statementCycleDay?: number;
  paymentDueDay?: number;
  statementAmount?: number;
  minimumPayment?: number;
  currentOutstanding?: number;
  availableCredit?: number;
  utilizationPercentage?: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isSystem: boolean;
  parentId?: string;
  parent?: Category;
  children?: Category[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId?: string;
  subcategoryId?: string;
  itemTag?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  paymentMethod: PaymentMethod;
  merchant?: string;
  description?: string;
  transactionDate: string;
  referenceNumber?: string;
  isSubscription: boolean;
  subscriptionId?: string;
  category?: Category;
  subcategory?: Category;
  sourceAccount?: Account;
  destinationAccount?: Account;
}

export interface BudgetSpentTransaction {
  id: string;
  amount: number;
  description?: string | null;
  merchant?: string | null;
  itemTag?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
  transactionDate: string;
}

export interface BudgetCategoryBreakdown {
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface Budget {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryIds?: string[];
  amount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  billingCycleStartDate: string;
  billingCycleEndDate: string;
  alertThreshold: number;
  isActive: boolean;
  status: 'OK' | 'WARNING' | 'EXCEEDED';
  spentTransactions?: BudgetSpentTransaction[];
  categoryBreakdown?: BudgetCategoryBreakdown[];
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  monthlyTarget?: number;
  targetDate?: string;
  daysRemaining?: number;
  monthlyProgressNeeded?: number;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  sourceAccountId: string;
  categoryId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  notes?: string;
  monthlyCost?: number;
  annualCost?: number;
  daysUntilDue?: number;
  sourceAccount?: Account;
  category?: Category;
}

export interface DashboardData {
  summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    savings: number;
    creditOutstanding: number;
    spendingThisMonth: number;
    incomeThisMonth: number;
    savingsThisMonth: number;
    previousMonthSavings: number;
    previousMonthIncome?: number;
    previousMonthExpenses?: number;
    pocketAllowanceBalance: number;
    pocketAllowanceThisMonth: number;
  };
  spendingByCategory: Array<{
    id: string;
    name: string;
    icon?: string;
    color?: string;
    amount: number;
    percentage: number;
  }>;
  spendingByPaymentMethod: Array<{
    paymentMethod: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  accounts: {
    bankBalances: number;
    cashBalances: number;
    upiBalances: number;
    creditOutstanding: number;
    breakdown: Record<string, Account[]>;
  };
  recurring: {
    monthlySubscriptionCost: number;
    activeSubscriptionsCount: number;
    upcomingSubscriptions: Subscription[];
  };
  debts: {
    totalOwedToMe: number;
    totalIOwe: number;
    netOutstanding: number;
    activeDebtsCount: number;
    activeDebts: Debt[];
  };
  forecast?: SpendForecast;
}

export interface SpendForecast {
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
  spendingSoFar: number;
  dailyBurnRate: number;
  projectedMonthEndSpend: number;
  incomeThisMonth: number;
  projectedSavings: number;
  projectedOverspend: number;
  willOverspend: boolean;
  onTrackForSavingsGoal: boolean;
  currentMonthWeeklyTrend: {
    direction: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA';
    changeAmount: number | null;
    changePercent: number | null;
    points: Array<{
      weekNumber: number;
      weekLabel: string;
      spent: number;
      daysCovered: number;
      burnRate: number;
    }>;
  };
  budgetForecasts: Array<{
    budgetId: string;
    budgetName: string;
    budgetAmount: number;
    spentSoFar: number;
    projectedSpend: number;
    projectedOverBudget: number;
    willExceed: boolean;
  }>;
}

export interface TransactionFilters {
  search?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

export interface ParsedReceipt {
  amount?: number;
  amountCandidates?: number[];
  merchant?: string;
  transactionDate?: string;
  currency?: string;
  paymentMethodHint?: PaymentMethod;
  description?: string;
  rawText: string;
}

export interface RunwaySimulationResponse {
  assumptions: {
    months: number;
    salaryChangePercent: number;
    rentChangePercent: number;
    cancelSubscriptionsCount: number;
    extraMonthlyEmi: number;
  };
  baseline: {
    startingBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyNet: number;
  };
  scenario: {
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyNet: number;
    monthlySubscriptionSavings: number;
  };
  risk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    monthsUntilNegative: number | null;
    firstNegativeMonthLabel: string | null;
    biggestDropDriver: {
      name: string;
      monthlyImpact: number;
    };
  };
  timeline: Array<{
    monthIndex: number;
    monthLabel: string;
    baselineBalance: number;
    scenarioBalance: number;
  }>;
  recommendations: string[];
  cancelledSubscriptions: Array<{
    id: string;
    name: string;
    monthlyCost: number;
  }>;
}
