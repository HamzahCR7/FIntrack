import { z } from 'zod';
import { TransactionType, PaymentMethod } from '../types/enums';

export const CreateTransactionSchema = z
  .object({
    type: z.nativeEnum(TransactionType, {
      errorMap: () => ({ message: 'Invalid transaction type. Must be INCOME, EXPENSE, or TRANSFER' }),
    }),
    amount: z.number().positive('Amount must be greater than zero'),
    currency: z.string().optional().default('INR'),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    sourceAccountId: z.string().optional(),
    destinationAccountId: z.string().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      errorMap: () => ({ message: 'Invalid payment method' }),
    }),
    merchant: z.string().optional(),
    description: z.string().optional(),
    itemTag: z.string().optional(),
    transactionDate: z
      .union([z.string(), z.date()])
      .optional()
      .transform((val) => (val ? new Date(val) : new Date())),
    referenceNumber: z.string().optional(),
    isSubscription: z.boolean().optional().default(false),
    subscriptionId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === TransactionType.EXPENSE) {
      if (!data.sourceAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expense requires a sourceAccountId',
          path: ['sourceAccountId'],
        });
      }
    }

    if (data.type === TransactionType.INCOME) {
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Income requires a destinationAccountId',
          path: ['destinationAccountId'],
        });
      }
    }

    if (data.type === TransactionType.TRANSFER) {
      if (!data.sourceAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transfer requires a sourceAccountId',
          path: ['sourceAccountId'],
        });
      }
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transfer requires a destinationAccountId',
          path: ['destinationAccountId'],
        });
      }
      if (data.sourceAccountId && data.destinationAccountId && data.sourceAccountId === data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Source and destination accounts cannot be the same for a transfer',
          path: ['destinationAccountId'],
        });
      }
    }
  });

export const QueryTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

export type CreateTransactionDto = z.output<typeof CreateTransactionSchema>;
export type CreateTransactionInputDto = z.input<typeof CreateTransactionSchema>;
export type QueryTransactionDto = z.infer<typeof QueryTransactionSchema>;
