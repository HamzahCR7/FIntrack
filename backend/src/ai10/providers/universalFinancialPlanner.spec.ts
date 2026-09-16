import { DeterministicAIProvider } from './deterministicProvider';

describe('Universal financial planner regression cases', () => {
  const provider = new DeterministicAIProvider();

  it('treats SIP as recurring investment, never one-time purchase affordability', async () => {
    const plan = await provider.processQuery({ query: 'Should I spend 5k on SIP per month?' });
    expect(plan.capability).toBe('INVESTMENT_DECISION');
    expect(plan.action).toBe('INVEST');
    expect(plan.object).toBe('SIP');
    expect(plan.entities?.amount).toBe(5000);
    expect(plan.entities?.frequency).toBe('monthly');
  });

  it('models savings percentage as a plan', async () => {
    const plan = await provider.processQuery({ query: 'I want monthly savings to be 25% of income' });
    expect(plan.capability).toBe('SAVINGS_RATE_PLAN');
    expect(plan.action).toBe('SAVE');
    expect(plan.entities?.targetSavingsRate).toBe(25);
  });

  it('models monthly savings amount as a plan', async () => {
    const plan = await provider.processQuery({ query: 'How can I save ₹30,000 per month?' });
    expect(plan.capability).toBe('MONTHLY_SAVINGS_PLAN');
    expect(plan.action).toBe('SAVE');
    expect(plan.entities?.targetMonthlySavings).toBe(30000);
  });

  it('does not turn generic recommendation language into an entity search', async () => {
    const plan = await provider.processQuery({ query: 'What should I do with my money this month?' });
    expect(plan.capability).toBe('FINANCIAL_REASONING');
    expect(plan.toolCalls.some((c) => c.toolName === 'searchFinancialData')).toBe(false);
  });
});
