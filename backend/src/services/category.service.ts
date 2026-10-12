import { CategoryRepository } from '../repositories/category.repository';
import { CreateCategoryDto } from '../dtos/category.dto';
import { BadRequestError, NotFoundError } from '../common/errors';
import { Category } from '@prisma/client';

export class CategoryService {
  constructor(private categoryRepo: CategoryRepository = new CategoryRepository()) {}

  async getAllCategories(): Promise<Category[]> {
    const requiredCategories = [
      { name: 'Miscellaneous', icon: 'tag', color: '#64748B' },
      { name: 'Salary', icon: 'wallet', color: '#2ECC71' },
      { name: 'Pocket Allowance', icon: 'gift', color: '#F59E0B' },
      { name: 'Freelance Income', icon: 'briefcase', color: '#14B8A6' },
      { name: 'Interest Income', icon: 'landmark', color: '#38BDF8' },
      { name: 'Investment Returns', icon: 'trending-up', color: '#8B5CF6' },
      { name: 'Rental Income', icon: 'home', color: '#22C55E' },
      { name: 'Refund', icon: 'rotate-ccw', color: '#06B6D4' },
      { name: 'Money Returned', icon: 'undo-2', color: '#0EA5E9' },
      { name: 'Gift Received', icon: 'gift', color: '#EC4899' },
      { name: 'Other Income', icon: 'circle-dollar-sign', color: '#64748B' },
    ];

    for (const category of requiredCategories) {
      if (!await this.categoryRepo.findByName(category.name)) {
        await this.categoryRepo.create({ ...category, isSystem: true });
      }
    }

    return this.categoryRepo.findAll();
  }

  async getCategoryById(id: string): Promise<Category> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundError(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepo.findByName(dto.name);
    if (existing) {
      throw new BadRequestError(`Category with name '${dto.name}' already exists`);
    }
    return this.categoryRepo.create({
      name: dto.name,
      icon: dto.icon,
      color: dto.color,
      isSystem: false,
    });
  }
}
