import { PrismaClient, Transaction, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { QueryTransactionDto } from '../dtos/transaction.dto';

export class TransactionRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findMany(query: QueryTransactionDto): Promise<any[]> {
    const where: Prisma.TransactionWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.accountId) {
      where.OR = [
        { sourceAccountId: query.accountId },
        { destinationAccountId: query.accountId },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
      if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
    }

    return this.db.transaction.findMany({
      where,
      include: {
        category: true,
        subcategory: true,
        sourceAccount: true,
        destinationAccount: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Transaction | null> {
    const client = tx || this.db;
    return client.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        sourceAccount: true,
        destinationAccount: true,
      },
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    return this.db.transaction.findMany({
      where: {
        transactionDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        category: true,
        subcategory: true,
        sourceAccount: true,
        destinationAccount: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async create(data: Prisma.TransactionCreateInput, tx?: Prisma.TransactionClient): Promise<Transaction> {
    const client = tx || this.db;
    return client.transaction.create({
      data,
      include: {
        category: true,
        subcategory: true,
        sourceAccount: true,
        destinationAccount: true,
      },
    });
  }

  async update(id: string, data: Prisma.TransactionUpdateInput, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || this.db;
    return client.transaction.update({
      where: { id },
      data,
      include: {
        category: true,
        subcategory: true,
        sourceAccount: true,
        destinationAccount: true,
      },
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<Transaction> {
    const client = tx || this.db;
    return client.transaction.delete({
      where: { id },
    });
  }

  // Summary aggregation excluding transfers from income/expense totals
  async calculateSummary() {
    const incomeAggregate = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME' },
    });

    const expenseAggregate = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'EXPENSE' },
    });

    const transferAggregate = await this.db.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'TRANSFER' },
    });

    const totalIncome = incomeAggregate._sum.amount || 0;
    const totalExpenses = expenseAggregate._sum.amount || 0;
    const totalTransfersVolume = transferAggregate._sum.amount || 0;

    return {
      totalIncome,
      totalExpenses,
      netSavings: totalIncome - totalExpenses,
      totalTransfersVolume,
    };
  }
}
