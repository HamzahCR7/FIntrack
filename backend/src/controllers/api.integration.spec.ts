import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/prisma';

const app = createApp();

describe('FinTrack REST APIs (Phase 1)', () => {
  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.category.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('GET /health returns health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('Account CRUD workflow via REST API', async () => {
    // Create Account
    const createRes = await request(app)
      .post('/api/v1/accounts')
      .send({
        name: 'Primary HDFC',
        type: 'BANK_ACCOUNT',
        institution: 'HDFC Bank',
        initialBalance: 25000,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.id).toBeDefined();
    const accountId = createRes.body.data.id;

    // Get All Accounts
    const listRes = await request(app).get('/api/v1/accounts');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);

    // Get Single Account
    const getRes = await request(app).get(`/api/v1/accounts/${accountId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('Primary HDFC');
  });

  test('Validation error handling for invalid transaction payload', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .send({
        type: 'TRANSFER',
        amount: 500,
        paymentMethod: 'UPI',
        // Missing sourceAccountId and destinationAccountId
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.errors).toBeDefined();
  });
});
