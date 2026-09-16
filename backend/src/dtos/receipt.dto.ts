import { z } from 'zod';

export const ParseReceiptSchema = z.object({
  imageBase64: z
    .string()
    .min(1, 'file base64 payload is required')
    .refine((value) => !value.startsWith('data:'), 'Send raw base64 only, without data URL prefix')
    .refine((value) => value.length <= 12_000_000, 'File payload is too large'),
  mimeType: z
    .enum(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'])
    .optional()
    .default('image/jpeg'),
});

export type ParseReceiptDto = z.infer<typeof ParseReceiptSchema>;

export interface ParsedReceiptData {
  amount?: number;
  amountCandidates?: number[];
  merchant?: string;
  transactionDate?: string;
  currency?: string;
  paymentMethodHint?: 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CASH' | 'UPI';
  description?: string;
  rawText: string;
}
