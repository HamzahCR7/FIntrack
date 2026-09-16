import { z } from 'zod';

export const CreateGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100),
  description: z.string().nullable().optional(),
  type: z.enum(['SAVINGS', 'INVESTMENT', 'EXPENSE_REDUCTION', 'EMI']),
  targetAmount: z.number().min(0, 'Target amount must be positive'),
  deadline: z.string().datetime(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  category: z.string().nullable().optional(),
  autoContribute: z.boolean().default(false),
  monthlyTarget: z.number().min(0).nullable().optional(),
  emiMonths: z.number().int().positive().nullable().optional(),
  emiAmount: z.number().min(0).nullable().optional(),
  downPayment: z.number().min(0).nullable().optional(),
});

export const UpdateGoalSchema = CreateGoalSchema.partial();

export type CreateGoalDto = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalDto = z.infer<typeof UpdateGoalSchema>;

export interface GoalResponseDto {
  id: string;
  name: string;
  description: string | null;
  type: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: string;
  category: string | null;
  autoContribute: boolean;
  monthlyTarget: number | null;
  emiMonths: number | null;
  emiAmount: number | null;
  downPayment: number | null;
  isActive: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  progressPercentage?: number;
  daysRemaining?: number;
  monthlyProgressNeeded?: number;
  createdAt: string;
  updatedAt: string;
}
