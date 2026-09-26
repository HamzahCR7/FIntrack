import { z } from 'zod';
import { DebtType, DebtStatus, DebtRecordKind } from '../types/enums';

export const CreateDebtSchema = z.object({
  personName: z.string().min(1, 'Person name is required').max(100),
  type: z.nativeEnum(DebtType, {
    errorMap: () => ({ message: 'Invalid debt type. Must be OWED_TO_ME or I_OWE' }),
  }),
  recordKind: z.nativeEnum(DebtRecordKind).default(DebtRecordKind.PERSONAL),
  loanCategory: z.string().max(50).optional(),
  loanItem: z.string().max(100).optional(),
  emiAmount: z.number().positive('EMI amount must be greater than zero').optional(),
  amount: z.number().positive('Amount must be greater than zero'),
  accountId: z.string().optional(),
  dueDate: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  notes: z.string().optional(),
});

export const SettleDebtSchema = z.object({
  amountToSettle: z.number().positive('Settlement amount must be positive'),
  accountId: z.string().optional(),
  settlementDate: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const QueryDebtSchema = z.object({
  type: z.nativeEnum(DebtType).optional(),
  status: z.nativeEnum(DebtStatus).optional(),
});

export type CreateDebtDto = z.output<typeof CreateDebtSchema>;
export type CreateDebtInputDto = z.input<typeof CreateDebtSchema>;
export type SettleDebtDto = z.infer<typeof SettleDebtSchema>;
export type QueryDebtDto = z.infer<typeof QueryDebtSchema>;
