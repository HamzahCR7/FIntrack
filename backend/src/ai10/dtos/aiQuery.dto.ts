import { z } from 'zod';

export const AIQuerySchema = z.object({
  query: z.string().min(1, 'Query text cannot be empty').max(500, 'Query too long'),
  contextHistory: z
    .array(
      z.object({
        sender: z.enum(['user', 'assistant']),
        text: z.string(),
      })
    )
    .optional(),
});

export type AIQueryDto = z.infer<typeof AIQuerySchema>;
