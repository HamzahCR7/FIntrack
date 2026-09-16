import { z } from 'zod';

export const QuickItemTypeSchema = z.enum(['NOTE', 'TODO', 'REMINDER']);

export const CreateQuickItemSchema = z.object({
  type: QuickItemTypeSchema,
  title: z.string().trim().min(1, 'Title is required').max(200),
  details: z.string().trim().max(1000).optional(),
  price: z.number().nonnegative().optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const UpdateQuickItemSchema = CreateQuickItemSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

export type CreateQuickItemDto = z.infer<typeof CreateQuickItemSchema>;
export type UpdateQuickItemDto = z.infer<typeof UpdateQuickItemSchema>;