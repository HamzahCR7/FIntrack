import { PrismaClient, Account, Transaction } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { AccountType, TransactionType } from '../types/enums';

export class CreditCardRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findAllCreditCards(): Promise<Account[]> {
    return this.db.account.findMany({
      where: {
        type: AccountType.CREDIT_CARD,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findCreditCardById(id: string): Promise<Account | null> {
    return this.db.account.findFirst({
      where: {
        id,
        type: AccountType.CREDIT_CARD,
        isActive: true,
      },
    });
  }

  async getCardTransactions(cardId: string): Promise<Transaction[]> {
    return this.db.transaction.findMany({
      where: {
        OR: [{ sourceAccountId: cardId }, { destinationAccountId: cardId }],
      },
      include: {
        category: true,
        sourceAccount: true,
        destinationAccount: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async getAllCreditCardExpenses(cardId?: string): Promise<any[]> {
    const where: any = {
      type: TransactionType.EXPENSE,
      sourceAccount: {
        type: AccountType.CREDIT_CARD,
      },
    };

    if (cardId) {
      where.sourceAccountId = cardId;
    }

    return this.db.transaction.findMany({
      where,
      include: {
        category: true,
        sourceAccount: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async getAllCreditCardPayments(cardId?: string): Promise<any[]> {
    const where: any = {
      type: TransactionType.TRANSFER,
      destinationAccount: {
        type: AccountType.CREDIT_CARD,
      },
    };

    if (cardId) {
      where.destinationAccountId = cardId;
    }

    return this.db.transaction.findMany({
      where,
      include: {
        sourceAccount: true,
        destinationAccount: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }
}
