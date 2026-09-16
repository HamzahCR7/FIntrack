import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
