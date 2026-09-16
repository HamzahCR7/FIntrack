import { PrismaClient, Category, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';

export class CategoryRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAll(): Promise<Category[]> {
    return this.db.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.db.category.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.db.category.findUnique({
      where: { name },
    });
  }

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.db.category.create({ data });
  }
}
