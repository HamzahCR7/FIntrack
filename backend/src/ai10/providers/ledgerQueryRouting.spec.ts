import { describe, expect, it } from 'vitest';
import { DeterministicAIProvider } from './deterministicProvider';

describe('specific ledger query routing', () => {
  it('routes "how much on zomato?" to merchant spending, not generic financial reasoning', async () => {
    const provider = new DeterministicAIProvider();
    const plan = await provider.processQuery({ query: 'how much on zomato?' });
    expect(plan.intent).toBe('MERCHANT_SPENDING');
    expect(plan.toolCalls[0]?.toolName).toBe('getMerchantSpending');
    expect(plan.toolCalls[0]?.toolParams?.merchantName).toMatch(/zomato/i);
    expect(plan.toolCalls[0]?.toolParams?.merchantName).not.toMatch(/chennai bus/i);
  });

  it('routes "how much I spent on rent this month?" to category spending', async () => {
    const provider = new DeterministicAIProvider();
    const plan = await provider.processQuery({ query: 'how much I spent on rent this month?' });
    expect(plan.intent).toBe('EXPENSE_BY_CATEGORY');
    expect(plan.toolCalls[0]?.toolName).toBe('getExpensesByCategory');
    expect(plan.toolCalls[0]?.toolParams?.categoryName).toBe('Rent & Housing');
  });
});
