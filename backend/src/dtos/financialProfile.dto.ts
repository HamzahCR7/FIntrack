import { z } from 'zod';

export const UpdateFinancialProfileSchema = z.object({
  monthlyIncomeTarget: z.number().positive().optional(),
  monthlySavingsGoal: z.number().positive().optional(),
  emergencyFundTarget: z.number().positive().optional(),
  discretionarySpendCap: z.number().positive().optional(),
  preferredSavingsRate: z.number().min(0).max(100).optional(),
});

export type UpdateFinancialProfileDto = z.infer<typeof UpdateFinancialProfileSchema>;
