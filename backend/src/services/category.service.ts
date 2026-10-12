import { CategoryRepository } from '../repositories/category.repository';
import { CreateCategoryDto } from '../dtos/category.dto';
import { BadRequestError, NotFoundError } from '../common/errors';
import { Category } from '@prisma/client';
import { TransactionRepository } from '../repositories/transaction.repository';
import { expenseCategoryKnowledge, getSubcategoryMerchantSuggestions, incomeCategoryKnowledge, merchantSuggestionKnowledge } from '../data/categorySuggestionKnowledge';

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  confidence: number;
  reason: string;
}

const normalize = (value: string) => value
  .toLocaleLowerCase()
  .replace(/\b(?:upi|imps|neft|rtgs|txn|ref|payment|paid|debit|credit|dr|cr)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const leafName = (value?: string | null) => value?.replace(/^.*?>\s*/, '');

export class CategoryService {
  constructor(
    private categoryRepo: CategoryRepository = new CategoryRepository(),
    private transactionRepo: TransactionRepository = new TransactionRepository(),
  ) {}

  async suggestCategories(text: string, type = 'EXPENSE'): Promise<CategorySuggestion[]> {
    const query = normalize(text).slice(0, 160);
    if (query.length < 2 || !['EXPENSE', 'INCOME'].includes(type)) return [];

    const [categories, history] = await Promise.all([
      this.categoryRepo.findAll(),
      this.transactionRepo.findCategorizedForSuggestions(type),
    ]);
    const byName = new Map(categories.map((category) => [category.name.toLocaleLowerCase(), category]));
    const scores = new Map<string, CategorySuggestion>();

    const add = (categoryName: string, subcategoryName: string | undefined, score: number, reason: string) => {
      const category = byName.get(categoryName.toLocaleLowerCase());
      const fullSubcategoryName = subcategoryName ? `${categoryName} > ${subcategoryName}` : undefined;
      const subcategory = fullSubcategoryName ? byName.get(fullSubcategoryName.toLocaleLowerCase()) : undefined;
      if (!category) return;
      const key = `${category.id}:${subcategory?.id || ''}`;
      const previous = scores.get(key);
      if (!previous || score > previous.confidence) {
        scores.set(key, {
          categoryId: category.id,
          categoryName: category.name,
          subcategoryId: subcategory?.id,
          subcategoryName: leafName(subcategory?.name),
          confidence: Math.min(99, Math.round(score)),
          reason,
        });
      }
    };

    for (const transaction of history) {
      const merchant = normalize(transaction.merchant || '');
      const description = normalize(transaction.description || '');
      const exactMerchant = merchant.length >= 2 && (query === merchant || query.includes(merchant));
      const exactDescription = description.length >= 3 && query === description;
      if (exactMerchant || exactDescription) {
        add(transaction.category?.name, leafName(transaction.subcategory?.name), exactMerchant ? 98 : 92, 'Based on your previous transactions');
      }
    }

    const knowledge = type === 'INCOME' ? incomeCategoryKnowledge : expenseCategoryKnowledge;
    for (const rule of knowledge) {
      const matched = rule.keywords.find((keyword) => query.includes(normalize(keyword)));
      if (matched) add(rule.category, rule.subcategory, 86, `Matched “${matched}”`);
    }

    const queryTokens = new Set(query.split(' ').filter((token) => token.length > 2));
    for (const transaction of history) {
      const candidateTokens = new Set(normalize(`${transaction.merchant || ''} ${transaction.description || ''}`).split(' '));
      const overlap = [...queryTokens].filter((token) => candidateTokens.has(token)).length;
      if (overlap > 0) add(transaction.category?.name, leafName(transaction.subcategory?.name), 60 + Math.min(18, overlap * 6), 'Similar to a previous transaction');
    }

    return [...scores.values()]
      .sort((a, b) => b.confidence - a.confidence || a.categoryName.localeCompare(b.categoryName))
      .slice(0, 3);
  }

  async suggestMerchants(categoryId: string, text = '', type = 'EXPENSE', subcategoryId = ''): Promise<string[]> {
    if (!categoryId || !['EXPENSE', 'INCOME'].includes(type)) return [];

    const [category, subcategory, history] = await Promise.all([
      this.categoryRepo.findById(categoryId),
      subcategoryId ? this.categoryRepo.findById(subcategoryId) : Promise.resolve(null),
      this.transactionRepo.findCategorizedForSuggestions(type),
    ]);
    if (!category) return [];

    const query = normalize(text);
    const ranked = new Map<string, { value: string; score: number }>();
    const add = (value: string, score: number) => {
      const trimmed = value.trim();
      if (!trimmed || (query && !normalize(trimmed).includes(query))) return;
      const key = normalize(trimmed);
      const current = ranked.get(key);
      ranked.set(key, { value: current?.value || trimmed, score: (current?.score || 0) + score });
    };

    history.forEach((transaction, index) => {
      if (transaction.categoryId === categoryId && transaction.merchant) {
        const subcategoryBoost = subcategoryId && transaction.subcategoryId === subcategoryId ? 100 : 0;
        add(transaction.merchant, 100 + subcategoryBoost + Math.max(0, 25 - index));
      }
    });

    const rootCategoryName = category.name.split('>')[0].trim().toLocaleLowerCase();
    if (subcategory) {
      getSubcategoryMerchantSuggestions(subcategory.name).forEach((merchant) => add(merchant, 50));
    }
    (merchantSuggestionKnowledge[rootCategoryName] || []).forEach((merchant) => add(merchant, 10));

    return [...ranked.values()]
      .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value))
      .slice(0, 20)
      .map(({ value }) => value);
  }

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
