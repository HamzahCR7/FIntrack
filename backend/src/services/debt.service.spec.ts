import { DebtService } from './debt.service';

describe('DebtService recurring loans', () => {
  it('advances a fully paid loan installment to the next month', async () => {
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
      update: jest.fn().mockImplementation(async (_id, update) => ({ ...debt, ...update })),
    };
    const service = new DebtService({} as any, debtRepo as any, {} as any, {} as any);

    const result = await service.settleDebt('education-loan', {
      amountToSettle: 10000,
      settlementDate: new Date('2026-09-01T00:00:00.000Z'),
    });

    expect(debtRepo.update).toHaveBeenCalledWith('education-loan', expect.objectContaining({
      settledAmount: 0,
      status: 'PENDING',
      emiAmount: 10000,
      dueDate: new Date('2026-10-05T00:00:00.000Z'),
    }));
    expect(result.status).toBe('PENDING');
    expect(result.remainingAmount).toBe(10000);
    expect(result.installmentRemainingAmount).toBe(10000);
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
  });
});
