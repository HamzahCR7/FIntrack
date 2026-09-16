import { FinancialToolRegistry } from '../tools/financialToolRegistry';

export type FinancialContextKey =
  | 'FINANCIAL_OVERVIEW'
  | 'CASH_FLOW'
  | 'CATEGORY_SPENDING'
  | 'RECURRING_EXPENSES'
  | 'UPCOMING_OBLIGATIONS'
  | 'DEBT_OBLIGATIONS'
  | 'SPENDING_TREND'
  | 'INVESTMENT_CONTEXT';

export class FinancialContextService {
  constructor(private registry: FinancialToolRegistry) {}

  async gather(keys: FinancialContextKey[], entities: Record<string, any> = {}) {
    const context: Record<string, any> = {};
    await Promise.all(keys.map(async (key) => {
      switch (key) {
        case 'FINANCIAL_OVERVIEW': context.overview = await this.registry.getFinancialOverview(); break;
        case 'CASH_FLOW': context.cashFlow = await this.registry.getCashFlowAnalysis(); break;
        case 'CATEGORY_SPENDING': context.categorySpending = await this.registry.getExpensesByCategory(entities.category); break;
        case 'RECURRING_EXPENSES': context.recurringExpenses = await this.registry.getRecurringExpenseAnalysis(); break;
        case 'UPCOMING_OBLIGATIONS': context.upcomingObligations = await this.registry.getUpcomingObligations(entities.daysAhead || 30); break;
        case 'DEBT_OBLIGATIONS': context.debts = await this.registry.getDebtsSummary(); break;
        case 'SPENDING_TREND': context.spendingTrend = await this.registry.getSpendingTrend(); break;
        case 'INVESTMENT_CONTEXT':
          context.investmentContext = {
            financialProfile: await this.registry.getFinancialProfile(),
            currentBalance: await this.registry.getCurrentBalance(),
            savingsAnalysis: await this.registry.getSavingsAnalysis(),
          };
          break;
      }
    }));
    return context;
  }
}