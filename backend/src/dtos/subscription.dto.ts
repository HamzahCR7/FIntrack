import { z } from 'zod';
import { BillingCycle, SubscriptionStatus } from '../types/enums';

export const CreateSubscriptionSchema = z.object({
  name: z.string().min(1, 'Subscription name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  billingCycle: z.nativeEnum(BillingCycle, {
    errorMap: () => ({ message: 'Invalid billing cycle. Must be WEEKLY, EVERY_28_DAYS, MONTHLY, QUARTERLY, or YEARLY' }),
  }),
  nextBillingDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  sourceAccountId: z.string().min(1, 'Source account is required'),
  categoryId: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
  startDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

export const UpdateSubscriptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
  nextBillingDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  sourceAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  notes: z.string().optional(),
  startDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => (val ? new Date(val) : val === null ? null : undefined)),
});

export const QuerySubscriptionSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus).optional(),
  categoryId: z.string().optional(),
  sourceAccountId: z.string().optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
});

export type CreateSubscriptionDto = z.output<typeof CreateSubscriptionSchema>;
export type CreateSubscriptionInputDto = z.input<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionDto = z.output<typeof UpdateSubscriptionSchema>;
export type UpdateSubscriptionInputDto = z.input<typeof UpdateSubscriptionSchema>;
export type QuerySubscriptionDto = z.infer<typeof QuerySubscriptionSchema>;
