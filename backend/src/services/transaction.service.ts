import { PrismaClient, Transaction, Account } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AccountRepository } from '../repositories/account.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateTransactionDto, CreateTransactionInputDto, CreateTransactionSchema, QueryTransactionDto } from '../dtos/transaction.dto';
import { BadRequestError, NotFoundError } from '../common/errors';
import { TransactionType, AccountType } from '../types/enums';

export class TransactionService {
  private readonly prismaTransactionOptions = {
    timeout: 30000,
    maxWait: 30000,
  };

  constructor(
    private db: PrismaClient = defaultPrisma,
    private transactionRepo: TransactionRepository = new TransactionRepository(db),
    private accountRepo: AccountRepository = new AccountRepository(db),
    private categoryRepo: CategoryRepository = new CategoryRepository(db)
  ) {}

  async getTransactions(query: QueryTransactionDto): Promise<any[]> {
    return this.transactionRepo.findMany(query);
  }

  async getTransactionById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) {
      throw new NotFoundError(`Transaction with ID '${id}' not found`);
    }
    return transaction;
  }

  async createTransaction(input: CreateTransactionInputDto): Promise<Transaction> {
    const dto: CreateTransactionDto = CreateTransactionSchema.parse(input);
    return this.db.$transaction(async (tx) => {
      let sourceAccount: Account | null = null;
      let destinationAccount: Account | null = null;

      if (dto.sourceAccountId) {
        sourceAccount = await this.accountRepo.findById(dto.sourceAccountId, tx);
        if (!sourceAccount || !sourceAccount.isActive) {
          throw new NotFoundError(`Source account '${dto.sourceAccountId}' not found`);
        }
      }

      if (dto.destinationAccountId) {
        destinationAccount = await this.accountRepo.findById(dto.destinationAccountId, tx);
        if (!destinationAccount || !destinationAccount.isActive) {
          throw new NotFoundError(`Destination account '${dto.destinationAccountId}' not found`);
        }
      }

      if (dto.categoryId) {
        const category = await this.categoryRepo.findById(dto.categoryId);
        if (!category) {
          throw new NotFoundError(`Category '${dto.categoryId}' not found`);
        }
      }

      if (dto.subcategoryId) {
        const subcategory = await this.categoryRepo.findById(dto.subcategoryId);
        if (!subcategory) {
          throw new NotFoundError(`Subcategory '${dto.subcategoryId}' not found`);
        }
      }

      // Calculate balance updates for source and destination accounts
      const { sourceDelta, destDelta } = this.calculateBalanceDeltas(
        dto.type,
        dto.amount,
        sourceAccount,
        destinationAccount
      );

      if (sourceAccount && sourceDelta !== 0) {
        await this.accountRepo.updateBalance(sourceAccount.id, sourceDelta, tx);
      }

      if (destinationAccount && destDelta !== 0) {
        await this.accountRepo.updateBalance(destinationAccount.id, destDelta, tx);
      }

      return this.transactionRepo.create(
        {
          type: dto.type,
          amount: dto.amount,
          currency: dto.currency || 'INR',
          paymentMethod: dto.paymentMethod,
          merchant: dto.merchant,
          description: dto.description,
          transactionDate: dto.transactionDate || new Date(),
          referenceNumber: dto.referenceNumber,
          isSubscription: dto.isSubscription ?? false,
          subscription: dto.subscriptionId ? { connect: { id: dto.subscriptionId } } : undefined,
          category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
          subcategory: dto.subcategoryId ? { connect: { id: dto.subcategoryId } } : undefined,
          sourceAccount: dto.sourceAccountId ? { connect: { id: dto.sourceAccountId } } : undefined,
          destinationAccount: dto.destinationAccountId ? { connect: { id: dto.destinationAccountId } } : undefined,
        },
        tx
      );
    }, this.prismaTransactionOptions);
  }

  async updateTransaction(id: string, input: CreateTransactionInputDto): Promise<any> {
    const dto: CreateTransactionDto = CreateTransactionSchema.parse(input);
    return this.db.$transaction(async (tx) => {
      const existing = await this.transactionRepo.findById(id, tx);
      if (!existing) {
        throw new NotFoundError(`Transaction with ID '${id}' not found`);
      }

      // 1. Revert original balance deltas
      const oldSource = existing.sourceAccountId
        ? await this.accountRepo.findById(existing.sourceAccountId, tx)
        : null;
      const oldDest = existing.destinationAccountId
        ? await this.accountRepo.findById(existing.destinationAccountId, tx)
        : null;

      const { sourceDelta: oldSourceDelta, destDelta: oldDestDelta } = this.calculateBalanceDeltas(
        existing.type as TransactionType,
        existing.amount,
        oldSource,
        oldDest
      );

      if (oldSource && oldSourceDelta !== 0) {
        await this.accountRepo.updateBalance(oldSource.id, -oldSourceDelta, tx);
      }
      if (oldDest && oldDestDelta !== 0) {
        await this.accountRepo.updateBalance(oldDest.id, -oldDestDelta, tx);
      }

      // 2. Fetch new accounts and calculate new balance deltas
      let newSource: Account | null = null;
      let newDest: Account | null = null;

      if (dto.sourceAccountId) {
        newSource = await this.accountRepo.findById(dto.sourceAccountId, tx);
        if (!newSource || !newSource.isActive) {
          throw new NotFoundError(`Source account '${dto.sourceAccountId}' not found`);
        }
      }

      if (dto.destinationAccountId) {
        newDest = await this.accountRepo.findById(dto.destinationAccountId, tx);
        if (!newDest || !newDest.isActive) {
          throw new NotFoundError(`Destination account '${dto.destinationAccountId}' not found`);
        }
      }

      if (dto.categoryId) {
        const category = await this.categoryRepo.findById(dto.categoryId);
        if (!category) {
          throw new NotFoundError(`Category '${dto.categoryId}' not found`);
        }
      }

      if (dto.subcategoryId) {
        const subcategory = await this.categoryRepo.findById(dto.subcategoryId);
        if (!subcategory) {
          throw new NotFoundError(`Subcategory '${dto.subcategoryId}' not found`);
        }
      }

      const { sourceDelta: newSourceDelta, destDelta: newDestDelta } = this.calculateBalanceDeltas(
        dto.type,
        dto.amount,
        newSource,
        newDest
      );

      if (newSource && newSourceDelta !== 0) {
        await this.accountRepo.updateBalance(newSource.id, newSourceDelta, tx);
      }
      if (newDest && newDestDelta !== 0) {
        await this.accountRepo.updateBalance(newDest.id, newDestDelta, tx);
      }

      // 3. Update transaction record
      return this.transactionRepo.update(
        id,
        {
          type: dto.type,
          amount: dto.amount,
          currency: dto.currency || 'INR',
          paymentMethod: dto.paymentMethod,
          merchant: dto.merchant,
          description: dto.description,
          transactionDate: dto.transactionDate || new Date(),
          referenceNumber: dto.referenceNumber,
          category: dto.categoryId
            ? { connect: { id: dto.categoryId } }
            : { disconnect: true },
          subcategory: dto.subcategoryId
            ? { connect: { id: dto.subcategoryId } }
            : { disconnect: true },
          sourceAccount: dto.sourceAccountId
            ? { connect: { id: dto.sourceAccountId } }
            : { disconnect: true },
          destinationAccount: dto.destinationAccountId
            ? { connect: { id: dto.destinationAccountId } }
            : { disconnect: true },
        },
        tx
      );
    }, this.prismaTransactionOptions);
  }

  async deleteTransaction(id: string): Promise<Transaction> {
    return this.db.$transaction(async (tx) => {
      const transaction = await this.transactionRepo.findById(id, tx);
      if (!transaction) {
        throw new NotFoundError(`Transaction with ID '${id}' not found`);
      }

      const sourceAccount = transaction.sourceAccountId
        ? await this.accountRepo.findById(transaction.sourceAccountId, tx)
        : null;
      const destinationAccount = transaction.destinationAccountId
        ? await this.accountRepo.findById(transaction.destinationAccountId, tx)
        : null;

      // Calculate original balance changes to revert them
      const { sourceDelta, destDelta } = this.calculateBalanceDeltas(
        transaction.type as TransactionType,
        transaction.amount,
        sourceAccount,
        destinationAccount
      );

      // Revert account balances (multiply delta by -1)
      if (sourceAccount && sourceDelta !== 0) {
        await this.accountRepo.updateBalance(sourceAccount.id, -sourceDelta, tx);
      }

      if (destinationAccount && destDelta !== 0) {
        await this.accountRepo.updateBalance(destinationAccount.id, -destDelta, tx);
      }

      return this.transactionRepo.delete(id, tx);
    }, this.prismaTransactionOptions);
  }

  async getFinancialSummary() {
    const summary = await this.transactionRepo.calculateSummary();
    const accounts = await this.accountRepo.findAll();

    let totalAssetBalance = 0;
    let totalCreditOutstanding = 0;

    for (const acc of accounts) {
      if (acc.type === AccountType.CREDIT_CARD) {
        totalCreditOutstanding += acc.currentBalance;
      } else {
        totalAssetBalance += acc.currentBalance;
      }
    }

    return {
      totalAssetBalance,
      totalCreditOutstanding,
      netWorth: totalAssetBalance - totalCreditOutstanding,
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      netSavings: summary.netSavings,
      totalTransfersVolume: summary.totalTransfersVolume,
      note: 'Transfers between accounts are excluded from Income and Expenses totals.',
    };
  }

  private calculateBalanceDeltas(
    type: TransactionType,
    amount: number,
    sourceAccount: Account | null,
    destinationAccount: Account | null
  ): { sourceDelta: number; destDelta: number } {
    let sourceDelta = 0;
    let destDelta = 0;

    if (type === TransactionType.EXPENSE && sourceAccount) {
      // Outgoing expense
      if (sourceAccount.type === AccountType.CREDIT_CARD) {
        sourceDelta = amount; // Debt increases
      } else {
        sourceDelta = -amount; // Balance decreases
      }
    } else if (type === TransactionType.INCOME && destinationAccount) {
      // Incoming income
      if (destinationAccount.type === AccountType.CREDIT_CARD) {
        destDelta = -amount; // Debt decreases
      } else {
        destDelta = amount; // Balance increases
      }
    } else if (type === TransactionType.TRANSFER) {
      // Transfer between accounts
      if (sourceAccount) {
        if (sourceAccount.type === AccountType.CREDIT_CARD) {
          sourceDelta = amount;
        } else {
          sourceDelta = -amount;
        }
      }

      if (destinationAccount) {
        if (destinationAccount.type === AccountType.CREDIT_CARD) {
          destDelta = -amount;
        } else {
          destDelta = amount;
        }
      }
    }

    return { sourceDelta, destDelta };
  }
}
