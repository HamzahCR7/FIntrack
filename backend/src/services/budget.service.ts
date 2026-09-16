import { BudgetRepository } from '../repositories/budget.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateBudgetDto, UpdateBudgetDto, BudgetResponseDto } from '../dtos/budget.dto';
import { NotFoundError } from '../common/errors';
import { Budget } from '@prisma/client';

export class BudgetService {
  constructor(
    private budgetRepo: BudgetRepository = new BudgetRepository(),
    private transactionRepo: TransactionRepository = new TransactionRepository(),
    private categoryRepo: CategoryRepository = new CategoryRepository()
  ) {}

  async getAllBudgets(): Promise<BudgetResponseDto[]> {
    const budgets = await this.budgetRepo.findAll();
    return Promise.all(budgets.map((budget) => this.enrichBudget(budget)));
  }

  async getBudgetById(id: string): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepo.findById(id);
    if (!budget) {
      throw new NotFoundError(`Budget with ID '${id}' not found`);
    }
    return this.enrichBudget(budget);
  }

  async createBudget(data: CreateBudgetDto): Promise<BudgetResponseDto> {
    const now = new Date();
    const startDate = data.billingCycleStartDate
      ? new Date(data.billingCycleStartDate)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const selectedCategoryIds = this.normalizeCategoryIds(data.categoryId, data.categoryIds);
    const categoryValue = selectedCategoryIds.length > 0 ? selectedCategoryIds.join(',') : null;
    const endDate = data.billingCycleEndDate
      ? new Date(data.billingCycleEndDate)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const createData: any = {
      name: data.name,
      categoryIds: categoryValue,
      amount: data.amount,
      billingCycleStartDate: startDate,
      billingCycleEndDate: endDate,
      alertThreshold: data.alertThreshold || 80,
    };
    if (selectedCategoryIds.length === 1) {
      createData.category = { connect: { id: selectedCategoryIds[0] } };
    }

    const budget = await this.budgetRepo.create(createData);

    return this.enrichBudget(budget);
  }

  async updateBudget(id: string, data: UpdateBudgetDto): Promise<BudgetResponseDto> {
    await this.getBudgetById(id);

    const updateData: any = {
      name: data.name,
      amount: data.amount,
      alertThreshold: data.alertThreshold,
    };

    const selectedCategoryIds = this.normalizeCategoryIds(data.categoryId, data.categoryIds);
    if (data.categoryId !== undefined || data.categoryIds !== undefined) {
      const categoryValue = selectedCategoryIds.length > 0 ? selectedCategoryIds.join(',') : null;
      updateData.categoryIds = categoryValue;
      if (selectedCategoryIds.length === 1) {
        updateData.category = { connect: { id: selectedCategoryIds[0] } };
      } else {
        updateData.category = { disconnect: true };
      }
    }

    if (data.billingCycleStartDate) {
      updateData.billingCycleStartDate = new Date(data.billingCycleStartDate);
    }

    if (data.billingCycleEndDate) {
      updateData.billingCycleEndDate = new Date(data.billingCycleEndDate);
    }

    const budget = await this.budgetRepo.update(id, updateData);
    return this.enrichBudget(budget);
  }

  async deleteBudget(id: string): Promise<void> {
    await this.getBudgetById(id); // Verify exists
    await this.budgetRepo.delete(id);
  }

  async getBudgetStatus(id: string): Promise<{ status: 'OK' | 'WARNING' | 'EXCEEDED'; percentageUsed: number }> {
    const enriched = await this.getBudgetById(id);
    const percentageUsed = enriched.percentageUsed || 0;
    
    let status: 'OK' | 'WARNING' | 'EXCEEDED' = 'OK';
    if (percentageUsed >= 100) {
      status = 'EXCEEDED';
    } else if (percentageUsed >= (enriched.alertThreshold || 80)) {
      status = 'WARNING';
    }

    return { status, percentageUsed };
  }

  private async enrichBudget(budget: Budget): Promise<BudgetResponseDto> {
    const categoryIds = this.getBudgetCategoryIds(budget.categoryId, budget.categoryIds);

    // Ensure start date always covers from the 1st of the budget month (00:00:00.000 UTC)
    const startDate = budget.billingCycleStartDate
      ? new Date(Date.UTC(new Date(budget.billingCycleStartDate).getUTCFullYear(), new Date(budget.billingCycleStartDate).getUTCMonth(), 1, 0, 0, 0, 0))
      : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1, 0, 0, 0, 0));

    const endDate = budget.billingCycleEndDate
      ? new Date(Date.UTC(new Date(budget.billingCycleEndDate).getUTCFullYear(), new Date(budget.billingCycleEndDate).getUTCMonth() + 1, 0, 23, 59, 59, 999))
      : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // Calculate spending within budget period
    const spendingDetails = await this.calculateBudgetSpendingDetails(
      categoryIds,
      startDate,
      endDate,
      budget.amount
    );

    const spentAmount = spendingDetails.spentAmount;
    const remainingAmount = Math.max(0, budget.amount - spentAmount);
    const percentageUsed = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;

    return {
      id: budget.id,
      name: budget.name,
      categoryId: budget.categoryId || (categoryIds.length > 0 ? categoryIds.join(',') : null),
      categoryIds: categoryIds,
      amount: budget.amount,
      billingCycleStartDate: startDate.toISOString(),
      billingCycleEndDate: endDate.toISOString(),
      alertThreshold: budget.alertThreshold,
      isActive: budget.isActive,
      spentAmount: Math.round(spentAmount * 100) / 100,
      remainingAmount: Math.round(remainingAmount * 100) / 100,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      status: this.getStatusFromPercentage(percentageUsed, budget.alertThreshold),
      spentTransactions: spendingDetails.spentTransactions,
      categoryBreakdown: spendingDetails.categoryBreakdown,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }

  private async calculateBudgetSpendingDetails(
    categoryIds: string[] | string | undefined,
    startDate: Date,
    endDate: Date,
    totalBudgetAmount: number
  ): Promise<{
    spentAmount: number;
    spentTransactions: Array<{
      id: string;
      amount: number;
      description?: string | null;
      merchant?: string | null;
      itemTag?: string | null;
      categoryName?: string | null;
      subcategoryName?: string | null;
      transactionDate: string;
    }>;
    categoryBreakdown: Array<{
      categoryName: string;
      amount: number;
      percentage: number;
    }>;
  }> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await this.transactionRepo.findByDateRange(start, end);
    const selectedCategoryTokens = this.parseCategoryIds(categoryIds);

    let matchingTxs = transactions.filter((t) => t.type === 'EXPENSE');

    if (selectedCategoryTokens.length > 0) {
      // Resolve matching category IDs and names (including all subcategories)
      const allCategories = await this.categoryRepo.findAll();
      const matchingIds = new Set<string>();
      const matchingNames = new Set<string>();

      for (const token of selectedCategoryTokens) {
        const tokenLower = token.toLowerCase();
        matchingIds.add(token);

        for (const cat of allCategories) {
          const catNameLower = cat.name.toLowerCase();
          if (
            cat.id === token ||
            catNameLower === tokenLower ||
            catNameLower.startsWith(`${tokenLower} > `) ||
            catNameLower.startsWith(`${tokenLower}>`)
          ) {
            matchingIds.add(cat.id);
            matchingNames.add(catNameLower);
          }
        }
      }

      // Expand recursively to all child categories
      let sizeBefore = 0;
      do {
        sizeBefore = matchingIds.size;
        for (const cat of allCategories) {
          const catNameLower = cat.name.toLowerCase();
          const isParentMatched = Boolean(cat.parentId && matchingIds.has(cat.parentId));
          const isNamePrefixMatched = Array.from(matchingNames).some(
            (name) => catNameLower.startsWith(`${name} > `) || catNameLower.startsWith(`${name}>`)
          );

          if (isParentMatched || isNamePrefixMatched) {
            matchingIds.add(cat.id);
            matchingNames.add(catNameLower);
          }
        }
      } while (matchingIds.size > sizeBefore);

      matchingTxs = matchingTxs.filter((t) => {
        if (t.categoryId && matchingIds.has(t.categoryId)) return true;
        if (t.subcategoryId && matchingIds.has(t.subcategoryId)) return true;

        if (t.category?.id && matchingIds.has(t.category.id)) return true;
        if (t.subcategory?.id && matchingIds.has(t.subcategory.id)) return true;

        if (t.category?.name && matchingNames.has(t.category.name.toLowerCase())) return true;
        if (t.subcategory?.name && matchingNames.has(t.subcategory.name.toLowerCase())) return true;

        if (t.category?.parentId && matchingIds.has(t.category.parentId)) return true;
        if (t.subcategory?.parentId && matchingIds.has(t.subcategory.parentId)) return true;

        return false;
      });
    }

    const spentAmount = matchingTxs.reduce((sum, t) => sum + t.amount, 0);

    const spentTransactions = matchingTxs.map((t) => ({
      id: t.id,
      amount: t.amount,
      description: t.description || null,
      merchant: t.merchant || null,
      itemTag: t.itemTag || null,
      categoryName: t.category?.name || 'Uncategorized',
      subcategoryName: t.subcategory?.name || null,
      transactionDate: t.transactionDate ? new Date(t.transactionDate).toISOString() : new Date().toISOString(),
    }));

    // Group spending by category
    const categoryTotals = new Map<string, number>();
    for (const t of matchingTxs) {
      const name = t.category?.name || 'Uncategorized';
      categoryTotals.set(name, (categoryTotals.get(name) || 0) + t.amount);
    }

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([categoryName, amount]) => ({
        categoryName,
        amount: Math.round(amount * 100) / 100,
        percentage: spentAmount > 0 ? Math.round((amount / spentAmount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      spentAmount,
      spentTransactions,
      categoryBreakdown,
    };
  }

  private getBudgetCategoryIds(categoryId: string | null | undefined, categoryIds: string | null | undefined): string[] {
    const combined = [
      ...(categoryId ? [categoryId] : []),
      ...(categoryIds ? [categoryIds] : []),
    ];

    return [...new Set(combined.flatMap((value) => this.parseCategoryIds(value)).filter(Boolean))];
  }

  private parseCategoryIds(categoryId: string[] | string | undefined): string[] {
    if (!categoryId) return [];

    const valueList = Array.isArray(categoryId) ? categoryId : [categoryId];
    return valueList
      .flatMap((value) =>
        String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      );
  }

  private normalizeCategoryIds(categoryId?: string | null, categoryIds?: string[] | null): string[] {
    const combined = [...(categoryIds || []), ...(categoryId ? categoryId.split(',') : [])];
    return [...new Set(combined.map((value) => value.trim()).filter(Boolean))];
  }

  private getStatusFromPercentage(percentage: number, alertThreshold: number): 'OK' | 'WARNING' | 'EXCEEDED' {
    if (percentage >= 100) return 'EXCEEDED';
    if (percentage >= alertThreshold) return 'WARNING';
    return 'OK';
  }
}
