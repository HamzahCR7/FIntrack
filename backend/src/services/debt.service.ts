import { PrismaClient, Debt } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { DebtRepository } from '../repositories/debt.repository';
import { AccountRepository } from '../repositories/account.repository';
import { TransactionService } from './transaction.service';
import { CreateDebtDto, CreateDebtInputDto, CreateDebtSchema, QueryDebtDto, SettleDebtDto } from '../dtos/debt.dto';
import { NotFoundError, BadRequestError } from '../common/errors';
import { DebtType, DebtStatus, DebtRecordKind, AccountType, TransactionType, PaymentMethod } from '../types/enums';

export interface EnhancedDebt extends Debt {
  remainingAmount: number;
}

export class DebtService {
  constructor(
    private db: PrismaClient = defaultPrisma,
    private debtRepo: DebtRepository = new DebtRepository(db),
    private accountRepo: AccountRepository = new AccountRepository(db),
    private transactionService: TransactionService = new TransactionService(db)
  ) {}

  public enhanceDebt(debt: Debt): EnhancedDebt {
    const remainingAmount = Math.max(0, debt.amount - debt.settledAmount);
    return {
      ...debt,
      remainingAmount: Number(remainingAmount.toFixed(2)),
    };
  }

  async getDebts(query: QueryDebtDto): Promise<EnhancedDebt[]> {
    const debts = await this.debtRepo.findAll(query);
    return debts.map((d) => this.enhanceDebt(d));
  }

  async getDebtById(id: string): Promise<EnhancedDebt> {
    const debt = await this.debtRepo.findById(id);
    if (!debt) {
      throw new NotFoundError(`Debt record with ID '${id}' not found`);
    }
    return this.enhanceDebt(debt);
  }

  async createDebt(input: CreateDebtInputDto): Promise<EnhancedDebt> {
    const dto: CreateDebtDto = CreateDebtSchema.parse(input);

    if (dto.recordKind === DebtRecordKind.LOAN && dto.type !== DebtType.I_OWE) {
      throw new BadRequestError('Loans must be recorded as money you owe.');
    }

    if (dto.accountId) {
      const account = await this.accountRepo.findById(dto.accountId);
      if (!account || !account.isActive) {
        throw new NotFoundError(`Account '${dto.accountId}' not found`);
      }

      let paymentMethod: PaymentMethod = PaymentMethod.BANK_TRANSFER;
      if (account.type === AccountType.CREDIT_CARD) paymentMethod = PaymentMethod.CREDIT_CARD;
      else if (account.type === AccountType.CASH) paymentMethod = PaymentMethod.CASH;
      else if (account.type === AccountType.UPI || account.type === AccountType.AMAZON_PAY) paymentMethod = PaymentMethod.UPI;

      if (dto.type === DebtType.OWED_TO_ME) {
        // Lending money -> Expense (Money leaving account)
        await this.transactionService.createTransaction({
          type: TransactionType.EXPENSE,
          amount: dto.amount,
          sourceAccountId: dto.accountId,
          paymentMethod,
          merchant: dto.personName,
          description: `Lent money to ${dto.personName}${dto.notes ? `: ${dto.notes}` : ''}`,
          transactionDate: new Date(),
        });
      } else if (dto.type === DebtType.I_OWE) {
        // Borrowing money -> Income (Money entering account)
        await this.transactionService.createTransaction({
          type: TransactionType.INCOME,
          amount: dto.amount,
          destinationAccountId: dto.accountId,
          paymentMethod,
          merchant: dto.personName,
          description: `Borrowed money from ${dto.personName}${dto.notes ? `: ${dto.notes}` : ''}`,
          transactionDate: new Date(),
        });
      }
    }

    const created = await this.debtRepo.create({
      personName: dto.personName,
      type: dto.type,
      recordKind: dto.recordKind,
      loanCategory: dto.recordKind === DebtRecordKind.LOAN ? dto.loanCategory : undefined,
      loanItem: dto.recordKind === DebtRecordKind.LOAN ? dto.loanItem : undefined,
      emiAmount: dto.recordKind === DebtRecordKind.LOAN ? dto.emiAmount : undefined,
      amount: dto.amount,
      dueDate: dto.dueDate,
      notes: dto.notes,
      status: DebtStatus.PENDING,
    });

    return this.enhanceDebt(created);
  }

  async updateDebt(id: string, input: CreateDebtInputDto): Promise<EnhancedDebt> {
    const dto: CreateDebtDto = CreateDebtSchema.parse(input);
    const existing = await this.getDebtById(id);

    if (dto.recordKind === DebtRecordKind.LOAN && dto.type !== DebtType.I_OWE) {
      throw new BadRequestError('Loans must be recorded as money you owe.');
    }

    let newStatus: DebtStatus = existing.status as DebtStatus;
    if (existing.settledAmount >= dto.amount) {
      newStatus = DebtStatus.SETTLED;
    } else if (existing.settledAmount > 0) {
      newStatus = DebtStatus.PARTIALLY_SETTLED;
    } else {
      newStatus = DebtStatus.PENDING;
    }

    const updated = await this.debtRepo.update(id, {
      personName: dto.personName,
      type: dto.type,
      recordKind: dto.recordKind,
      loanCategory: dto.recordKind === DebtRecordKind.LOAN ? dto.loanCategory : null,
      loanItem: dto.recordKind === DebtRecordKind.LOAN ? dto.loanItem : null,
      emiAmount: dto.recordKind === DebtRecordKind.LOAN ? dto.emiAmount : null,
      amount: dto.amount,
      dueDate: dto.dueDate,
      notes: dto.notes,
      status: newStatus,
    });

    return this.enhanceDebt(updated);
  }

  async settleDebt(id: string, dto: SettleDebtDto): Promise<EnhancedDebt> {
    const debt = await this.getDebtById(id);

    if (debt.status === DebtStatus.SETTLED) {
      throw new BadRequestError(`Debt record for ${debt.personName} is already fully settled.`);
    }

    const newSettledAmount = Number((debt.settledAmount + dto.amountToSettle).toFixed(2));
    if (newSettledAmount > debt.amount) {
      throw new BadRequestError(`Settlement amount exceeds remaining debt balance.`);
    }

    if (dto.accountId) {
      const account = await this.accountRepo.findById(dto.accountId);
      if (!account || !account.isActive) {
        throw new NotFoundError(`Account '${dto.accountId}' not found`);
      }

      let paymentMethod: PaymentMethod = PaymentMethod.BANK_TRANSFER;
      if (account.type === AccountType.CREDIT_CARD) paymentMethod = PaymentMethod.CREDIT_CARD;
      else if (account.type === AccountType.CASH) paymentMethod = PaymentMethod.CASH;
      else if (account.type === AccountType.UPI || account.type === AccountType.AMAZON_PAY) paymentMethod = PaymentMethod.UPI;

      if (debt.type === DebtType.OWED_TO_ME) {
        // They returned money -> Income (Money entering account)
        await this.transactionService.createTransaction({
          type: TransactionType.INCOME,
          amount: dto.amountToSettle,
          destinationAccountId: dto.accountId,
          paymentMethod,
          merchant: debt.personName,
          description: `Returned money / Debt settlement from ${debt.personName}`,
          transactionDate: new Date(),
        });
      } else if (debt.type === DebtType.I_OWE) {
        // Paying back borrowed money -> Expense (Money leaving account)
        await this.transactionService.createTransaction({
          type: TransactionType.EXPENSE,
          amount: dto.amountToSettle,
          sourceAccountId: dto.accountId,
          paymentMethod,
          merchant: debt.personName,
          description: `Paid back borrowed money to ${debt.personName}`,
          transactionDate: new Date(),
        });
      }
    }

    let newStatus: DebtStatus = DebtStatus.PARTIALLY_SETTLED;
    if (newSettledAmount >= debt.amount) {
      newStatus = DebtStatus.SETTLED;
    }

    const updated = await this.debtRepo.update(id, {
      settledAmount: newSettledAmount,
      status: newStatus,
    });

    return this.enhanceDebt(updated);
  }

  async deleteDebt(id: string): Promise<Debt> {
    await this.getDebtById(id);
    return this.debtRepo.delete(id);
  }

  async getDebtSummary() {
    const debts = await this.getDebts({});

    let totalOwedToMe = 0; // Money others owe me
    let totalIOwe = 0;     // Money I owe others

    for (const d of debts) {
      if (d.status !== DebtStatus.SETTLED) {
        if (d.type === DebtType.OWED_TO_ME) {
          totalOwedToMe += d.remainingAmount;
        } else if (d.type === DebtType.I_OWE) {
          totalIOwe += d.remainingAmount;
        }
      }
    }

    return {
      totalOwedToMe: Number(totalOwedToMe.toFixed(2)),
      totalIOwe: Number(totalIOwe.toFixed(2)),
      netOutstanding: Number((totalOwedToMe - totalIOwe).toFixed(2)),
      activeDebtsCount: debts.filter((d) => d.status !== DebtStatus.SETTLED).length,
      debts,
    };
  }
}
