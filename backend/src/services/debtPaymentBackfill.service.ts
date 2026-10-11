import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { TransactionType } from '../types/enums';

/** Marks legacy transactions created by DebtService before isDebtPayment existed. */
export async function backfillDebtPaymentTransactions(db: PrismaClient = defaultPrisma): Promise<number> {
  const result = await db.transaction.updateMany({
    where: {
      type: TransactionType.EXPENSE,
      isDebtPayment: false,
      // This is the exact, system-generated description used for repayments.
      description: { startsWith: 'Paid back borrowed money to ' },
    },
    data: { isDebtPayment: true },
  });
  return result.count;
}
