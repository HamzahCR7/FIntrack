import { PrismaClient, Category, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';

export class CategoryRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAll(): Promise<Category[]> {
    return this.db.category.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.db.category.findFirst({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.db.category.findFirst({
      where: { name },
    });
  }

  async create(data: Omit<Prisma.CategoryUncheckedCreateInput, 'userId'>): Promise<Category> {
    return this.db.category.create({ data: data as any });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.db.category.update({ where: { id }, data });
  }

  async archive(id: string): Promise<Category> {
    return this.db.category.update({ where: { id }, data: { isArchived: true } });
  }
}
