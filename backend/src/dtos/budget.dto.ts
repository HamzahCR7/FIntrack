import { z } from 'zod';

export const CreateBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required').max(100),
  categoryId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).nullable().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  billingCycleStartDate: z.string().datetime().optional(),
  billingCycleEndDate: z.string().datetime().optional(),
  alertThreshold: z.number().min(0).max(100).default(80),
});

export const UpdateBudgetSchema = CreateBudgetSchema.partial();

export type CreateBudgetDto = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetDto = z.infer<typeof UpdateBudgetSchema>;

export interface BudgetSpentTransactionDto {
  id: string;
  amount: number;
  description?: string | null;
  merchant?: string | null;
  itemTag?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
  transactionDate: string;
}

export interface BudgetCategoryBreakdownDto {
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface BudgetResponseDto {
  id: string;
  name: string;
  categoryId: string | null;
  categoryIds?: string[];
  amount: number;
  billingCycleStartDate: string;
  billingCycleEndDate: string;
  alertThreshold: number;
  isActive: boolean;
  spentAmount?: number;
  remainingAmount?: number;
  percentageUsed?: number;
  status?: 'OK' | 'WARNING' | 'EXCEEDED';
  spentTransactions?: BudgetSpentTransactionDto[];
  categoryBreakdown?: BudgetCategoryBreakdownDto[];
  createdAt: string;
  updatedAt: string;
}
