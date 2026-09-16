import { DeterministicAIProvider } from './deterministicProvider';

describe('DeterministicAIProvider - investment decisions', () => {
  const provider = new DeterministicAIProvider();

  it('treats a monthly SIP as an investment decision, not a purchase', async () => {
    const plan = await provider.processQuery({
      query: 'should I spend 5k on sip per month?',
    });

    expect(plan.capability).toBe('INVESTMENT_DECISION');
    expect(plan.entities?.amount).toBe(5000);
    expect(plan.entities?.frequency).toBe('monthly');
    expect(plan.entities?.instrument).toBe('SIP');
    expect(plan.capability).not.toBe('PURCHASE_AFFORDABILITY');
  });

  it('treats recurring mutual fund contributions as investments', async () => {
    const plan = await provider.processQuery({
      query: 'can I invest ₹10,000 every month in mutual funds?',
    });

    expect(plan.capability).toBe('INVESTMENT_DECISION');
    expect(plan.entities?.amount).toBe(10000);
    expect(plan.entities?.frequency).toBe('monthly');
  });
});
