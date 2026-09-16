import { PrismaClient, Account, Transaction } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { CreditCardRepository } from '../repositories/creditCard.repository';
import { AccountRepository } from '../repositories/account.repository';
import { TransactionService } from './transaction.service';
import {
  UpdateCreditCardStatementDto,
  UpdateCreditCardStatementSchema,
  PayCreditCardBillDto,
  PayCreditCardBillInputDto,
  PayCreditCardBillSchema,
} from '../dtos/creditCard.dto';
import { NotFoundError, BadRequestError } from '../common/errors';
import { AccountType, TransactionType } from '../types/enums';

export interface EnhancedCreditCard extends Account {
  currentOutstanding: number;
  availableCredit: number;
  utilizationPercentage: number;
}

export class CreditCardService {
  constructor(
    private db: PrismaClient = defaultPrisma,
    private creditCardRepo: CreditCardRepository = new CreditCardRepository(db),
    private accountRepo: AccountRepository = new AccountRepository(db),
    private transactionService: TransactionService = new TransactionService(db)
  ) {}

  public enhanceCreditCard(card: Account): EnhancedCreditCard {
    const currentOutstanding = card.currentBalance;
    const creditLimit = card.creditLimit || 0.0;
    const availableCredit = Math.max(0, creditLimit - currentOutstanding);
    const utilizationPercentage = creditLimit > 0 ? Number(((currentOutstanding / creditLimit) * 100).toFixed(2)) : 0;

    return {
      ...card,
      currentOutstanding,
      availableCredit,
      utilizationPercentage,
    };
  }

  async getAllCreditCards(): Promise<EnhancedCreditCard[]> {
    const cards = await this.creditCardRepo.findAllCreditCards();
    return cards.map((c) => this.enhanceCreditCard(c));
  }

  async getCreditCardById(id: string): Promise<EnhancedCreditCard> {
    const card = await this.creditCardRepo.findCreditCardById(id);
    if (!card) {
      throw new NotFoundError(`Credit card account with ID '${id}' not found`);
    }
    return this.enhanceCreditCard(card);
  }

  async updateStatementDetails(id: string, dto: UpdateCreditCardStatementDto): Promise<EnhancedCreditCard> {
    const card = await this.getCreditCardById(id);

    const statementAmount = dto.statementAmount;
    const minimumPayment = dto.minimumPayment ?? Number((statementAmount * 0.05).toFixed(2));

    const updated = await this.accountRepo.update(card.id, {
      statementAmount,
      minimumPayment,
      statementCycleDay: dto.statementCycleDay ?? card.statementCycleDay,
      paymentDueDay: dto.paymentDueDay ?? card.paymentDueDay,
    });

    return this.enhanceCreditCard(updated);
  }

  async payCreditCardBill(input: PayCreditCardBillInputDto) {
    const dto: PayCreditCardBillDto = PayCreditCardBillSchema.parse(input);

    // 1. Verify source account
    const sourceAccount = await this.accountRepo.findById(dto.sourceAccountId);
    if (!sourceAccount || !sourceAccount.isActive) {
      throw new NotFoundError(`Source account '${dto.sourceAccountId}' not found`);
    }
    if (sourceAccount.type === AccountType.CREDIT_CARD) {
      throw new BadRequestError(`Source account for credit card bill payment cannot be another Credit Card`);
    }

    // 2. Verify destination credit card
    const creditCard = await this.getCreditCardById(dto.creditCardId);

    // 3. Create TRANSFER transaction
    const transaction = await this.transactionService.createTransaction({
      type: TransactionType.TRANSFER,
      amount: dto.amount,
      sourceAccountId: dto.sourceAccountId,
      destinationAccountId: dto.creditCardId,
      paymentMethod: dto.paymentMethod,
      description: dto.description || `Bill Payment for ${creditCard.name}`,
      referenceNumber: dto.referenceNumber,
      transactionDate: dto.transactionDate,
    });

    // 4. Update statement amount on card (reduce by payment amount, max 0)
    const newStatementAmount = Math.max(0, (creditCard.statementAmount || 0) - dto.amount);
    const newMinimumPayment = Math.max(0, (creditCard.minimumPayment || 0) - dto.amount);

    await this.accountRepo.update(creditCard.id, {
      statementAmount: newStatementAmount,
      minimumPayment: newMinimumPayment,
    });

    const updatedCard = await this.getCreditCardById(creditCard.id);

    return {
      message: `Successfully paid ₹${dto.amount} toward ${creditCard.name}`,
      transaction,
      card: updatedCard,
    };
  }

  async getCardTransactions(cardId: string): Promise<Transaction[]> {
    await this.getCreditCardById(cardId);
    return this.creditCardRepo.getCardTransactions(cardId);
  }

  async getCreditCardAnalytics() {
    const cards = await this.getAllCreditCards();
    const expenses = await this.creditCardRepo.getAllCreditCardExpenses();
    const payments = await this.creditCardRepo.getAllCreditCardPayments();

    const totalCreditCardSpending = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPaymentsMade = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstandingAmount = cards.reduce((sum, c) => sum + c.currentOutstanding, 0);
    const totalAvailableCredit = cards.reduce((sum, c) => sum + c.availableCredit, 0);
    const totalStatementAmount = cards.reduce((sum, c) => sum + (c.statementAmount || 0), 0);
    const totalMinimumPayment = cards.reduce((sum, c) => sum + (c.minimumPayment || 0), 0);

    // Spending by category aggregation
    const categoryMap: Record<string, { categoryId: string; categoryName: string; icon?: string; color?: string; totalSpent: number }> = {};

    for (const exp of expenses) {
      const catId = exp.categoryId || 'uncategorized';
      const catName = exp.category?.name || 'Uncategorized';
      const icon = exp.category?.icon || undefined;
      const color = exp.category?.color || undefined;

      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          categoryId: catId,
          categoryName: catName,
          icon,
          color,
          totalSpent: 0,
        };
      }
      categoryMap[catId].totalSpent += exp.amount;
    }

    const spendingByCategory = Object.values(categoryMap).map((cat) => ({
      ...cat,
      totalSpent: Number(cat.totalSpent.toFixed(2)),
      percentage: totalCreditCardSpending > 0 ? Number(((cat.totalSpent / totalCreditCardSpending) * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      totalCreditCardsCount: cards.length,
      totalCreditCardSpending: Number(totalCreditCardSpending.toFixed(2)),
      totalPaymentsMade: Number(totalPaymentsMade.toFixed(2)),
      totalOutstandingAmount: Number(totalOutstandingAmount.toFixed(2)),
      totalAvailableCredit: Number(totalAvailableCredit.toFixed(2)),
      totalStatementAmount: Number(totalStatementAmount.toFixed(2)),
      totalMinimumPayment: Number(totalMinimumPayment.toFixed(2)),
      spendingByCategory,
      cards,
    };
  }
}
