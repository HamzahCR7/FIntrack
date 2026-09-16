import { z } from 'zod';
import { PaymentMethod } from '../types/enums';

export const UpdateCreditCardStatementSchema = z.object({
  statementAmount: z.number().min(0, 'Statement amount cannot be negative'),
  minimumPayment: z.number().min(0, 'Minimum payment cannot be negative').optional(),
  statementCycleDay: z.number().min(1).max(31).optional(),
  paymentDueDay: z.number().min(1).max(31).optional(),
});

export const PayCreditCardBillSchema = z.object({
  sourceAccountId: z.string().min(1, 'Source account ID is required'),
  creditCardId: z.string().min(1, 'Credit card account ID is required'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.BANK_TRANSFER),
  description: z.string().optional(),
  referenceNumber: z.string().optional(),
  transactionDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

export type UpdateCreditCardStatementDto = z.infer<typeof UpdateCreditCardStatementSchema>;
export type PayCreditCardBillDto = z.output<typeof PayCreditCardBillSchema>;
export type PayCreditCardBillInputDto = z.input<typeof PayCreditCardBillSchema>;
