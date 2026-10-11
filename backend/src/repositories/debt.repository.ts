import { PrismaClient, Debt, DebtPayment, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { QueryDebtDto } from '../dtos/debt.dto';

export class DebtRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAll(query: QueryDebtDto): Promise<(Debt & { payments: DebtPayment[]; category?: any })[]> {
    const where: Prisma.DebtWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.db.debt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { payments: { orderBy: { settlementDate: 'desc' } }, category: true },
    });
  }

  async findById(id: string): Promise<(Debt & { payments: DebtPayment[]; category?: any }) | null> {
    return this.db.debt.findUnique({
      where: { id },
      include: { payments: { orderBy: { settlementDate: 'desc' } }, category: true },
    });
  }

  async create(data: Prisma.DebtCreateInput): Promise<Debt> {
    return this.db.debt.create({ data });
  }

  async update(id: string, data: Prisma.DebtUpdateInput): Promise<Debt & { payments: DebtPayment[]; category?: any }> {
    return this.db.debt.update({
      where: { id },
      data,
      include: { payments: { orderBy: { settlementDate: 'desc' } }, category: true },
    });
  }

  async delete(id: string): Promise<Debt> {
    return this.db.debt.delete({
      where: { id },
    });
  }
}
