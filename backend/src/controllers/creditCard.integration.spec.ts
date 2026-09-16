import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/prisma';

const app = createApp();

describe('Credit Card REST API Endpoints', () => {
  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.category.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Credit Card API lifecycle: list, analytics, statement update, and bill payment', async () => {
    // 1. Create Bank Account
    const bankRes = await request(app).post('/api/v1/accounts').send({
      name: 'HDFC Savings',
      type: 'BANK_ACCOUNT',
      initialBalance: 50000,
    });
    const bankId = bankRes.body.data.id;

    // 2. Create Credit Card
    const cardRes = await request(app).post('/api/v1/accounts').send({
      name: 'SBI Prime Credit Card',
      type: 'CREDIT_CARD',
      creditLimit: 150000,
      initialBalance: 0,
      statementCycleDay: 20,
      paymentDueDay: 10,
    });
    const cardId = cardRes.body.data.id;

    // 3. Update Statement Details
    const statementRes = await request(app)
      .patch(`/api/v1/credit-cards/${cardId}/statement`)
      .send({
        statementAmount: 25000,
        minimumPayment: 1250,
      });
    expect(statementRes.status).toBe(200);
    expect(statementRes.body.data.statementAmount).toBe(25000);

    // 4. Create Category and Expense Transaction on Credit Card
    const catRes = await request(app).post('/api/v1/categories').send({
      name: 'Electronics & Gadgets',
    });
    const catId = catRes.body.data.id;

    await request(app).post('/api/v1/transactions').send({
      type: 'EXPENSE',
      amount: 15000,
      sourceAccountId: cardId,
      categoryId: catId,
      paymentMethod: 'CREDIT_CARD',
      merchant: 'Amazon',
      description: 'Monitor purchase',
    });

    // 5. Get Credit Card Analytics
    const analyticsRes = await request(app).get('/api/v1/credit-cards/analytics');
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.totalCreditCardSpending).toBe(15000);
    expect(analyticsRes.body.data.totalOutstandingAmount).toBe(15000);
    expect(analyticsRes.body.data.totalAvailableCredit).toBe(135000);
    expect(analyticsRes.body.data.spendingByCategory.length).toBe(1);

    // 6. Pay Credit Card Bill
    const payRes = await request(app).post('/api/v1/credit-cards/pay-bill').send({
      sourceAccountId: bankId,
      creditCardId: cardId,
      amount: 10000,
      paymentMethod: 'BANK_TRANSFER',
      description: 'Partial Bill Payment',
    });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.transaction.type).toBe('TRANSFER');
    expect(payRes.body.data.card.currentOutstanding).toBe(5000);
    expect(payRes.body.data.card.statementAmount).toBe(15000); // 25000 - 10000
  });
});
