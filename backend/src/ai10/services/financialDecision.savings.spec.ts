import { FinancialDecisionService } from './financialDecision.service';

describe('FinancialDecisionService - savings goals', () => {
  it('calculates required monthly saving and gap', () => {
    const service = new FinancialDecisionService();
    const result = service.evaluateSavingsGoal(
      { targetAmount: 300000, targetMonths: 12, itemName: 'laptop' },
      {
        overview: { totalIncome: 80000, totalExpenses: 60900, totalBalance: 75000 },
        cashFlow: { inflow: 80000, outflow: 60900 },
      }
    );

    expect(result.requiredMonthlySavings).toBe(25000);
    expect(result.currentMonthlySavings).toBe(19100);
    expect(result.monthlyGap).toBe(5900);
    expect(result.achievableWithCurrentSurplus).toBe(false);
  });
});
