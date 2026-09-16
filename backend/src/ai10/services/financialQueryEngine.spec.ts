import { interpretFinancialQuery } from './financialQueryEngine';

describe('FinancialQueryEngine semantic contract', () => {
  const cases: Array<[string, any]> = [
    ['How much I saved in August?', { subject: 'SAVINGS', operation: 'TOTAL', month: 8, year: 2026 }],
    ['how much I saved in July?', { subject: 'SAVINGS', operation: 'TOTAL', month: 7, year: 2026 }],
    ['Show my savings trend', { subject: 'SAVINGS', operation: 'TREND' }],
    ['How much spent on Zomato?', { subject: 'MERCHANT', operation: 'TOTAL', merchant: 'zomato' }],
    ['How much spent on rent this month?', { subject: 'CATEGORY', operation: 'TOTAL', category: 'rent' }],
    ['How much money do people owe me?', { subject: 'RECEIVABLES', operation: 'TOTAL' }],
    ['How much do I owe?', { subject: 'DEBT', operation: 'TOTAL' }],
    ['How much did I earn in August?', { subject: 'INCOME', operation: 'TOTAL', month: 8, year: 2026 }],
    ['Show my spending trend', { subject: 'SPENDING', operation: 'TREND' }],
    ['What is my current balance?', { subject: 'BALANCE', operation: 'TOTAL' }],
  ];

  test.each(cases)('%s', (query, expected) => {
    expect(interpretFinancialQuery(query)).toEqual(expect.objectContaining(expected));
  });
});


describe('FinancialQueryEngine execution routing', () => {
  test('routes rent spending to the category tool and preserves the requested entity', async () => {
    const tools: any = {
      getExpensesByCategory: jest.fn().mockResolvedValue({
        found: true,
        categoryName: 'Rent & Housing',
        period: 'September 2026',
        totalSpent: 10385,
        count: 1,
      }),
    };

    const { FinancialQueryEngine } = require('./financialQueryEngine');
    const engine = new FinancialQueryEngine(tools);
    const result = await engine.tryExecute('How much money spent on rent this month?');

    expect(result?.toolUsed).toBe('getExpensesByCategory');
    expect(result?.toolCallsExecuted[0]).toEqual({
      toolName: 'getExpensesByCategory',
      toolParams: { categoryName: 'rent', month: expect.any(Number), year: expect.any(Number) },
    });
    expect(tools.getExpensesByCategory).toHaveBeenCalledWith('rent', expect.any(Number), expect.any(Number));
    expect(result?.data.categoryName).toBe('Rent & Housing');
    expect(result?.data.totalSpent).toBe(10385);
  });
});
