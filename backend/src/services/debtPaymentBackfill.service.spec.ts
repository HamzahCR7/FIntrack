import { backfillDebtPaymentTransactions } from './debtPaymentBackfill.service';

describe('backfillDebtPaymentTransactions', () => {
  it('marks only legacy system-generated repayment expenses', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });

    await expect(backfillDebtPaymentTransactions({ transaction: { updateMany } } as any)).resolves.toBe(2);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        type: 'EXPENSE',
        isDebtPayment: false,
        description: { startsWith: 'Paid back borrowed money to ' },
      }),
      data: { isDebtPayment: true },
    }));
  });
});
