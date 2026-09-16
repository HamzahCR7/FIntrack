import { PrismaClient, Goal, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';

export class GoalRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAll(): Promise<Goal[]> {
    return this.db.goal.findMany({
      where: { isActive: true },
      orderBy: { deadline: 'asc' },
    });
  }

  async findById(id: string): Promise<Goal | null> {
    return this.db.goal.findUnique({
      where: { id },
    });
  }

  async findActive(): Promise<Goal[]> {
    return this.db.goal.findMany({
      where: { 
        isActive: true,
        status: 'ACTIVE',
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async findByType(type: string): Promise<Goal[]> {
    return this.db.goal.findMany({
      where: { 
        type,
        isActive: true,
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async findByStatus(status: string): Promise<Goal[]> {
    return this.db.goal.findMany({
      where: { 
        status,
        isActive: true,
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async create(data: Prisma.GoalCreateInput): Promise<Goal> {
    return this.db.goal.create({ data });
  }

  async update(id: string, data: Prisma.GoalUpdateInput): Promise<Goal> {
    return this.db.goal.update({
      where: { id },
      data,
    });
  }

  async updateCurrentAmount(id: string, amount: number): Promise<Goal> {
    return this.db.goal.update({
      where: { id },
      data: { currentAmount: amount },
    });
  }

  async incrementCurrentAmount(id: string, delta: number): Promise<Goal> {
    return this.db.goal.update({
      where: { id },
      data: { currentAmount: { increment: delta } },
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.goal.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.goal.delete({
      where: { id },
    });
  }
}
