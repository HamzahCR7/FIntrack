import { BudgetService } from './budget.service';

describe('BudgetService debt repayments', () => {
  it('excludes debt repayments from a general personal-expense budget', async () => {
    const transactionRepo = {
      findByDateRange: jest.fn().mockResolvedValue([
        { id: 'purchase', type: 'EXPENSE', amount: 600, description: 'Groceries', category: null, subcategory: null, isDebtPayment: false },
        { id: 'repayment', type: 'EXPENSE', amount: 5000, description: 'Paid back borrowed money to Bank', category: null, subcategory: null, isDebtPayment: true },
      ]),
    };
    const service = new BudgetService({} as any, transactionRepo as any, {} as any);

    const result = await (service as any).calculateBudgetSpendingDetails(
      undefined,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-31T00:00:00.000Z'),
      10000,
    );

    expect(result.spentAmount).toBe(600);
    expect(result.spentTransactions).toEqual([expect.objectContaining({ id: 'purchase' })]);
  });

  it('includes debt repayments in an explicitly matching category budget', async () => {
    const category = { id: 'electronics', name: 'Shopping > Electronics', parentId: null };
    const transactionRepo = {
      findByDateRange: jest.fn().mockResolvedValue([
        { id: 'repayment', type: 'EXPENSE', amount: 5000, categoryId: category.id, category, subcategory: null, isDebtPayment: true },
      ]),
    };
    const categoryRepo = { findAll: jest.fn().mockResolvedValue([category]) };
    const service = new BudgetService({} as any, transactionRepo as any, categoryRepo as any);

    const result = await (service as any).calculateBudgetSpendingDetails(
      [category.id],
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-31T00:00:00.000Z'),
      10000,
    );

    expect(result.spentAmount).toBe(5000);
    expect(result.spentTransactions).toEqual([expect.objectContaining({ id: 'repayment' })]);
  });
});
