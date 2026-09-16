import { PrismaClient, Transaction } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { AutoUpiIngestDto } from '../dtos/upiAutoIngest.dto';
import { BadRequestError, NotFoundError } from '../common/errors';
import { TransactionService } from './transaction.service';
import { TransactionType, PaymentMethod } from '../types/enums';

interface ParsedUpiMessage {
  amount: number;
  merchant?: string;
  referenceNumber?: string;
  inferredType: TransactionType;
  description: string;
}

export interface AutoUpiIngestResult {
  created: boolean;
  duplicate: boolean;
  transaction: Transaction;
}

export class UpiAutoIngestService {
  constructor(
    private db: PrismaClient = defaultPrisma,
    private transactionService: TransactionService = new TransactionService(db)
  ) {}

  async ingestFromMessage(input: AutoUpiIngestDto): Promise<AutoUpiIngestResult> {
    const parsed = this.parseMessage(input.message, input.provider);

    const transactionDate = input.transactionDate || new Date();

    const duplicate = await this.findDuplicate(parsed.referenceNumber, parsed.amount, transactionDate);
    if (duplicate) {
      return {
        created: false,
        duplicate: true,
        transaction: duplicate,
      };
    }

    const upiAccount = await this.db.account.findFirst({
      where: {
        isActive: true,
        type: {
          in: ['UPI', 'AMAZON_PAY'],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!upiAccount) {
      throw new NotFoundError('No active UPI account found. Create a UPI account first or pass explicit account IDs.');
    }

    const sourceAccountId =
      parsed.inferredType === TransactionType.EXPENSE
        ? (input.sourceAccountId || upiAccount.id)
        : undefined;
    const destinationAccountId =
      parsed.inferredType === TransactionType.INCOME
        ? (input.destinationAccountId || upiAccount.id)
        : undefined;

    const transaction = await this.transactionService.createTransaction({
      type: parsed.inferredType,
      amount: parsed.amount,
      currency: 'INR',
      categoryId: input.categoryId,
      sourceAccountId,
      destinationAccountId,
      paymentMethod: PaymentMethod.UPI,
      merchant: parsed.merchant,
      description: parsed.description,
      transactionDate,
      referenceNumber: parsed.referenceNumber,
    });

    return {
      created: true,
      duplicate: false,
      transaction,
    };
  }

  private async findDuplicate(referenceNumber: string | undefined, amount: number, transactionDate: Date): Promise<Transaction | null> {
    if (referenceNumber) {
      const existingByRef = await this.db.transaction.findFirst({
        where: {
          paymentMethod: 'UPI',
          referenceNumber,
        },
      });

      if (existingByRef) return existingByRef;
    }

    const start = new Date(transactionDate);
    start.setMinutes(start.getMinutes() - 2);

    const end = new Date(transactionDate);
    end.setMinutes(end.getMinutes() + 2);

    const existingNearby = await this.db.transaction.findFirst({
      where: {
        paymentMethod: 'UPI',
        amount,
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    return existingNearby;
  }

  private parseMessage(message: string, provider: AutoUpiIngestDto['provider']): ParsedUpiMessage {
    const normalized = message.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    const upper = normalized.toUpperCase();

    const isUpiMentioned =
      upper.includes('UPI') ||
      upper.includes('GPAY') ||
      upper.includes('GOOGLE PAY') ||
      upper.includes('PHONEPE') ||
      upper.includes('PAYTM') ||
      upper.includes('AMAZON PAY') ||
      upper.includes('AMAZONPAY');

    if (!isUpiMentioned) {
      throw new BadRequestError('Message does not look like a UPI payment alert.');
    }

    const amountMatch = normalized.match(/(?:INR|RS\.?|₹)\s*([0-9]{1,7}(?:[.,][0-9]{1,2})?)/i)
      || normalized.match(/([0-9]{1,7}(?:[.,][0-9]{1,2})?)\s*(?:INR|RS\.?)/i)
      || normalized.match(/\b([0-9]{2,7}(?:[.,][0-9]{1,2})?)\b/);

    if (!amountMatch?.[1]) {
      throw new BadRequestError('Unable to detect amount from UPI alert message.');
    }

    const amount = Number.parseFloat(amountMatch[1].replace(/,/g, ''));
    if (Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestError('Invalid amount found in UPI alert message.');
    }

    const creditedKeywords = ['CREDITED', 'RECEIVED', 'COLLECTED', 'ADDED'];
    const debitedKeywords = ['DEBITED', 'SENT', 'PAID', 'SPENT', 'TRANSFERRED'];

    const hasCreditSignal = creditedKeywords.some((keyword) => upper.includes(keyword));
    const hasDebitSignal = debitedKeywords.some((keyword) => upper.includes(keyword));

    const inferredType = hasCreditSignal && !hasDebitSignal
      ? TransactionType.INCOME
      : TransactionType.EXPENSE;

    const merchantMatch = normalized.match(/\b(?:to|from|at)\s+([A-Za-z0-9 .&'_-]{2,50})/i);
    const merchant = merchantMatch?.[1]?.trim();

    const referenceMatch = normalized.match(/\b(?:UPI\s*(?:Ref(?:erence)?|ID)?|UTR|TXN\s*ID|TRANSACTION\s*ID)\s*[:#-]?\s*([A-Za-z0-9-]{6,})/i);
    const referenceNumber = referenceMatch?.[1]?.trim();

    const providerLabel = provider === 'OTHER' ? 'UPI' : provider;

    return {
      amount,
      merchant,
      referenceNumber,
      inferredType,
      description: `Auto-imported ${providerLabel} payment alert`,
    };
  }
}
