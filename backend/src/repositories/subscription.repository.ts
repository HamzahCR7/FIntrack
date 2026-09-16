import { PrismaClient, Subscription, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { QuerySubscriptionDto } from '../dtos/subscription.dto';

export class SubscriptionRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAll(query: QuerySubscriptionDto): Promise<Subscription[]> {
    const where: Prisma.SubscriptionWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.sourceAccountId) {
      where.sourceAccountId = query.sourceAccountId;
    }

    if (query.billingCycle) {
      where.billingCycle = query.billingCycle;
    }

    return this.db.subscription.findMany({
      where,
      include: {
        sourceAccount: true,
        category: true,
      },
      orderBy: { nextBillingDate: 'asc' },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Subscription | null> {
    const client = tx || this.db;
    return client.subscription.findUnique({
      where: { id },
      include: {
        sourceAccount: true,
        category: true,
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 10,
        },
      },
    });
  }

  async create(data: Prisma.SubscriptionCreateInput, tx?: Prisma.TransactionClient): Promise<Subscription> {
    const client = tx || this.db;
    return client.subscription.create({
      data,
      include: {
        sourceAccount: true,
        category: true,
      },
    });
  }

  async update(id: string, data: Prisma.SubscriptionUpdateInput, tx?: Prisma.TransactionClient): Promise<Subscription> {
    const client = tx || this.db;
    return client.subscription.update({
      where: { id },
      data,
      include: {
        sourceAccount: true,
        category: true,
      },
    });
  }

  async findUpcoming(daysAhead: number = 30): Promise<Subscription[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    return this.db.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: {
          lte: targetDate,
        },
      },
      include: {
        sourceAccount: true,
        category: true,
      },
      orderBy: { nextBillingDate: 'asc' },
    });
  }
}
