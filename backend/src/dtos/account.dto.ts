import { z } from 'zod';
import { AccountType } from '../types/enums';

export const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.nativeEnum(AccountType, {
    errorMap: () => ({ message: 'Invalid account type. Must be BANK_ACCOUNT, CREDIT_CARD, CASH, UPI, or AMAZON_PAY' }),
  }),
  institution: z.string().optional(),
  initialBalance: z.number().optional().default(0.0),
  creditLimit: z.number().optional(),
  lastFourDigits: z.string().length(4).optional(),
  statementCycleDay: z.number().min(1).max(31).optional(),
  paymentDueDay: z.number().min(1).max(31).optional(),
  statementAmount: z.number().min(0).optional(),
  minimumPayment: z.number().min(0).optional(),
});

export const UpdateAccountSchema = CreateAccountSchema.partial();

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountDto = z.infer<typeof UpdateAccountSchema>;
