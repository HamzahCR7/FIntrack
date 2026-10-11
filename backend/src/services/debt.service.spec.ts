import { DebtService } from './debt.service';

describe('DebtService recurring loans', () => {
  it('advances a fully paid loan installment and keeps cumulative repayment', async () => {
    const debt = {
      id: 'education-loan',
      personName: 'Education loan',
      type: 'I_OWE',
      recordKind: 'LOAN',
      loanCategory: 'EDUCATION',
      loanItem: null,
      emiAmount: 10000,
      amount: 10000,
      settledAmount: 0,
      dueDate: new Date('2026-09-05T00:00:00.000Z'),
      status: 'PENDING',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const debtRepo = {
      findById: jest.fn().mockResolvedValue(debt),
      update: jest.fn().mockImplementation(async (_id, update) => ({ ...debt, ...update, payments: [] })),
    };
    const service = new DebtService({} as any, debtRepo as any, {} as any, {} as any);

    const result = await service.settleDebt('education-loan', {
      amountToSettle: 10000,
      settlementDate: new Date('2026-09-01T00:00:00.000Z'),
    });

    expect(debtRepo.update).toHaveBeenCalledWith('education-loan', expect.objectContaining({
      settledAmount: 10000,
      status: 'SETTLED',
      payments: { create: expect.objectContaining({ amount: 10000, remainingAmountAfter: 0 }) },
    }));
    expect(result.status).toBe('SETTLED');
    expect(result.remainingAmount).toBe(0);
    expect(result.installmentRemainingAmount).toBe(0);
  });

  it('reports the remaining monthly installment separately from the total loan balance', () => {
    const service = new DebtService({} as any, {} as any, {} as any, {} as any);

    const result = service.enhanceDebt({
      id: 'electronics-loan',
      personName: 'Electronics loan',
      type: 'I_OWE',
      recordKind: 'LOAN',
      loanCategory: 'ELECTRONICS',
      loanItem: 'Laptop',
      emiAmount: 5000,
      amount: 50000,
      settledAmount: 2000,
      dueDate: null,
      status: 'PARTIALLY_SETTLED',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    expect(result.remainingAmount).toBe(48000);
    expect(result.installmentRemainingAmount).toBe(3000);
    expect(result.payments).toEqual([expect.objectContaining({
      id: 'legacy-electronics-loan',
      amount: 2000,
      remainingAmountAfter: 48000,
    })]);
  });

  it('accepts a loan payment above one EMI when it does not exceed the total balance', async () => {
    const debt = {
      id: 'electronics-loan', personName: 'Electronics loan', type: 'I_OWE', recordKind: 'LOAN',
      loanCategory: 'ELECTRONICS', loanItem: 'Laptop', emiAmount: 5000, amount: 50000,
      settledAmount: 0, dueDate: new Date('2026-09-05T00:00:00.000Z'), status: 'PENDING',
      notes: null, createdAt: new Date(), updatedAt: new Date(),
    };
    const debtRepo = {
      findById: jest.fn().mockResolvedValue(debt),
      update: jest.fn().mockImplementation(async (_id, update) => ({ ...debt, ...update, payments: [] })),
    };
    const service = new DebtService({} as any, debtRepo as any, {} as any, {} as any);

    const result = await service.settleDebt('electronics-loan', {
      amountToSettle: 7000,
      settlementDate: new Date('2026-09-01T00:00:00.000Z'),
    });

    expect(result.settledAmount).toBe(7000);
    expect(result.remainingAmount).toBe(43000);
    expect(result.installmentRemainingAmount).toBe(3000);
    expect(debtRepo.update).toHaveBeenCalledWith('electronics-loan', expect.objectContaining({
      payments: { create: expect.objectContaining({ amount: 7000, remainingAmountAfter: 43000 }) },
    }));
  });
});
