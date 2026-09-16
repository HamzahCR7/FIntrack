import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/prisma';

const app = createApp();

describe('Subscription REST API Endpoints', () => {
  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.category.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Subscription API lifecycle: create, get analytics, list, process payment, cancel', async () => {
    // 1. Create source account and category
    const accRes = await request(app).post('/api/v1/accounts').send({
      name: 'Salary Bank Account',
      type: 'BANK_ACCOUNT',
      initialBalance: 20000,
    });
    const accountId = accRes.body.data.id;

    const catRes = await request(app).post('/api/v1/categories').send({
      name: 'Subscriptions & Utilities',
    });
    const categoryId = catRes.body.data.id;

    // 2. Create Subscription
    const createRes = await request(app)
      .post('/api/v1/subscriptions')
      .send({
        name: 'Spotify Family',
        amount: 299,
        billingCycle: 'MONTHLY',
        sourceAccountId: accountId,
        categoryId: categoryId,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.id).toBeDefined();
    expect(createRes.body.data.monthlyCost).toBe(299);
    expect(createRes.body.data.annualCost).toBe(3588);
    const subscriptionId = createRes.body.data.id;

    // 3. Get Subscription Analytics
    const analyticsRes = await request(app).get('/api/v1/subscriptions/analytics');
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.activeSubscriptionCount).toBe(1);
    expect(analyticsRes.body.data.totalNormalizedMonthlyCost).toBe(299);
    expect(analyticsRes.body.data.totalNormalizedAnnualCost).toBe(3588);

    // 4. Process Payment
    const processRes = await request(app).post(`/api/v1/subscriptions/${subscriptionId}/process-payment`);
    expect(processRes.status).toBe(200);
    expect(processRes.body.data.transaction).toBeDefined();
    expect(processRes.body.data.transaction.amount).toBe(299);

    // 5. Cancel Subscription
    const cancelRes = await request(app).post(`/api/v1/subscriptions/${subscriptionId}/cancel`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
  });
});
