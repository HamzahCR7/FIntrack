import { CategoryRepository } from '../repositories/category.repository';
import { CreateCategoryDto } from '../dtos/category.dto';
import { BadRequestError, NotFoundError } from '../common/errors';
import { Category } from '@prisma/client';

export class CategoryService {
  constructor(private categoryRepo: CategoryRepository = new CategoryRepository()) {}

  async getAllCategories(): Promise<Category[]> {
    const miscellaneous = await this.categoryRepo.findByName('Miscellaneous');
    if (!miscellaneous) {
      await this.categoryRepo.create({
        name: 'Miscellaneous',
        icon: 'tag',
        color: '#64748B',
        isSystem: true,
      });
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
