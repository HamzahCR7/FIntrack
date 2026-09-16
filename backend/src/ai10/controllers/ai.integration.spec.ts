import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/prisma';

const app = createApp();

describe('AI Controller REST Endpoint - POST /api/v1/ai/query', () => {
  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.debt.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('POST /api/v1/ai/query returns fact-grounded response and structured data', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .send({
        query: 'How much did I spend this month?',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.query).toBe('How much did I spend this month?');
    expect(res.body.data.answer).toBeDefined();
    expect(res.body.data.toolUsed).toBe('getMonthlyExpenses');
  });

  test('POST /api/v1/ai/query rejects empty query with 400 Validation Error', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .send({
        query: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
  });
});
