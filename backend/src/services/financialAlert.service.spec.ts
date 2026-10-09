import { FinancialAlertService } from './financialAlert.service';

describe('FinancialAlertService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('evaluates legacy unscoped ledger rows for the production owner subscription', async () => {
    process.env.NODE_ENV = 'production';
    const subscriptionFindMany = jest
      .fn()
      .mockResolvedValueOnce([{ userId: 'owner' }])
      .mockResolvedValueOnce([]);
    const db = {
      pushSubscription: { findMany: subscriptionFindMany },
      subscription: { findMany: subscriptionFindMany },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      debt: { findMany: jest.fn().mockResolvedValue([]) },
      budget: { findMany: jest.fn().mockResolvedValue([]) },
      goal: { findMany: jest.fn().mockResolvedValue([]) },
      transaction: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
      pushAlertDelivery: { create: jest.fn() },
    };
    const push = { send: jest.fn() };

    await new FinancialAlertService(db as any, push as any).sendDailyAlerts(new Date('2026-10-10T09:00:00.000Z'));

    expect(subscriptionFindMany).toHaveBeenNthCalledWith(2, {
      where: { userId: null, status: 'ACTIVE' },
    });
  });
});
