import { z } from 'zod';

export const AutoUpiIngestSchema = z.object({
  message: z.string().min(12, 'UPI alert message is required'),
  provider: z.enum(['GPAY', 'PHONEPE', 'PAYTM', 'AMAZON_PAY', 'OTHER']).optional().default('OTHER'),
  sourceAccountId: z.string().optional(),
  destinationAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  transactionDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

export type AutoUpiIngestDto = z.output<typeof AutoUpiIngestSchema>;
export type AutoUpiIngestInputDto = z.input<typeof AutoUpiIngestSchema>;
