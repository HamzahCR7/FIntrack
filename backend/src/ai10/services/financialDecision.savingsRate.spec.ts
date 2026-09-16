import { FinancialDecisionService } from './financialDecision.service';

describe('FinancialDecisionService - savings rate goals', () => {
  it('calculates the monthly amount needed for a percentage of income', () => {
    const service = new FinancialDecisionService();
    const result = service.evaluateSavingsRatePlan(25, {
      overview: { totalIncome: 80000 },
      cashFlow: { inflow: 80000, outflow: 60900 },
      categorySpending: [
        { categoryName: 'Food & Dining', amount: 15000 },
        { categoryName: 'Shopping', amount: 10000 },
      ],
    });
    expect(result.targetMonthlySavings).toBe(20000);
    expect(result.currentMonthlySavings).toBe(19100);
    expect(result.monthlyGap).toBe(900);
    expect(result.targetSavingsRate).toBe(25);
  });
});
