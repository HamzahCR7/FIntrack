import { PrismaClient, Budget, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';

export class BudgetRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAll(): Promise<Budget[]> {
    return this.db.budget.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Budget | null> {
    return this.db.budget.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async findByCategory(categoryId: string | null): Promise<Budget[]> {
    return this.db.budget.findMany({
      where: { 
        categoryId,
        isActive: true,
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveBudgets(): Promise<Budget[]> {
    return this.db.budget.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.BudgetCreateInput): Promise<Budget> {
    return this.db.budget.create({
      data,
      include: { category: true },
    });
  }

  async update(id: string, data: Prisma.BudgetUpdateInput): Promise<Budget> {
    return this.db.budget.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.budget.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.budget.delete({
      where: { id },
    });
  }
}
