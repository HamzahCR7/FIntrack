import { PrismaClient, Account, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';

export class AccountRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAll(): Promise<Account[]> {
    return this.db.account.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Account | null> {
    const client = tx || this.db;
    return client.account.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.db.account.create({ data });
  }

  async update(id: string, data: Prisma.AccountUpdateInput, tx?: Prisma.TransactionClient): Promise<Account> {
    const client = tx || this.db;
    return client.account.update({
      where: { id },
      data,
    });
  }

  async updateBalance(id: string, delta: number, tx?: Prisma.TransactionClient): Promise<Account> {
    const client = tx || this.db;
    return client.account.update({
      where: { id },
      data: {
        currentBalance: {
          increment: delta,
        },
      },
    });
  }

  async delete(id: string): Promise<Account> {
    return this.db.account.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
