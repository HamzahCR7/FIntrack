import { PrismaClient, Debt, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { QueryDebtDto } from '../dtos/debt.dto';

export class DebtRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAll(query: QueryDebtDto): Promise<Debt[]> {
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
    });
  }

  async findById(id: string): Promise<Debt | null> {
    return this.db.debt.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.DebtCreateInput): Promise<Debt> {
    return this.db.debt.create({ data });
  }

  async update(id: string, data: Prisma.DebtUpdateInput): Promise<Debt> {
    return this.db.debt.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Debt> {
    return this.db.debt.delete({
      where: { id },
    });
  }
}
