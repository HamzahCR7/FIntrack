import { PrismaClient, Subscription, Account, Category as CategoryModel } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { AccountRepository } from '../repositories/account.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { TransactionService } from './transaction.service';
import {
  CreateSubscriptionDto,
  CreateSubscriptionInputDto,
  CreateSubscriptionSchema,
  UpdateSubscriptionDto,
  UpdateSubscriptionInputDto,
  UpdateSubscriptionSchema,
  QuerySubscriptionDto,
} from '../dtos/subscription.dto';
import { NotFoundError, BadRequestError } from '../common/errors';
import { BillingCycle, SubscriptionStatus, TransactionType, PaymentMethod, AccountType } from '../types/enums';

export interface SubscriptionWithNormalizedCosts extends Subscription {
  monthlyCost: number;
  annualCost: number;
  sourceAccount?: Account;
  category?: CategoryModel;
}

export class SubscriptionService {
  constructor(
    private db: PrismaClient = defaultPrisma,
    private subscriptionRepo: SubscriptionRepository = new SubscriptionRepository(db),
    private accountRepo: AccountRepository = new AccountRepository(db),
    private categoryRepo: CategoryRepository = new CategoryRepository(db),
    private transactionService: TransactionService = new TransactionService(db)
  ) {}

  public calculateNormalizedCosts(amount: number, cycle: BillingCycle): { monthlyCost: number; annualCost: number } {
    let monthlyCost = 0;
    let annualCost = 0;

    switch (cycle) {
      case BillingCycle.WEEKLY:
        annualCost = amount * 52;
        monthlyCost = annualCost / 12;
        break;
      case BillingCycle.EVERY_28_DAYS:
        annualCost = amount * 13;
        monthlyCost = annualCost / 12;
        break;
      case BillingCycle.MONTHLY:
        monthlyCost = amount;
        annualCost = amount * 12;
        break;
      case BillingCycle.QUARTERLY:
        monthlyCost = amount / 3;
        annualCost = amount * 4;
        break;
      case BillingCycle.YEARLY:
        monthlyCost = amount / 12;
        annualCost = amount;
        break;
      default:
        monthlyCost = amount;
        annualCost = amount * 12;
    }

    return {
      monthlyCost: Number(monthlyCost.toFixed(2)),
      annualCost: Number(annualCost.toFixed(2)),
    };
  }

  public advanceBillingDate(currentDate: Date, cycle: BillingCycle): Date {
    const nextDate = new Date(currentDate);

    switch (cycle) {
      case BillingCycle.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case BillingCycle.EVERY_28_DAYS:
        nextDate.setDate(nextDate.getDate() + 28);
        break;
      case BillingCycle.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case BillingCycle.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  private enhanceSubscription(sub: Subscription): SubscriptionWithNormalizedCosts {
    const { monthlyCost, annualCost } = this.calculateNormalizedCosts(
      sub.amount,
      sub.billingCycle as BillingCycle
    );
    return {
      ...sub,
      monthlyCost,
      annualCost,
    };
  }

  async getAllSubscriptions(query: QuerySubscriptionDto): Promise<SubscriptionWithNormalizedCosts[]> {
    const subs = await this.subscriptionRepo.findAll(query);
    return subs.map((s) => this.enhanceSubscription(s));
  }

  async getSubscriptionById(id: string): Promise<SubscriptionWithNormalizedCosts> {
    const sub = await this.subscriptionRepo.findById(id);
    if (!sub) {
      throw new NotFoundError(`Subscription with ID '${id}' not found`);
    }
    return this.enhanceSubscription(sub);
  }

  async createSubscription(input: CreateSubscriptionInputDto): Promise<SubscriptionWithNormalizedCosts> {
    const dto: CreateSubscriptionDto = CreateSubscriptionSchema.parse(input);

    const account = await this.accountRepo.findById(dto.sourceAccountId);
    if (!account || !account.isActive) {
      throw new NotFoundError(`Source account '${dto.sourceAccountId}' not found`);
    }

    const category = await this.categoryRepo.findById(dto.categoryId);
    if (!category) {
      throw new NotFoundError(`Category '${dto.categoryId}' not found`);
    }

    const created = await this.subscriptionRepo.create({
      name: dto.name,
      amount: dto.amount,
      billingCycle: dto.billingCycle,
      nextBillingDate: dto.nextBillingDate || new Date(),
      startDate: dto.startDate || new Date(),
      notes: dto.notes,
      sourceAccount: { connect: { id: dto.sourceAccountId } },
      category: { connect: { id: dto.categoryId } },
      status: SubscriptionStatus.ACTIVE,
    });

    return this.enhanceSubscription(created);
  }

  async updateSubscription(id: string, input: UpdateSubscriptionInputDto): Promise<SubscriptionWithNormalizedCosts> {
    const dto: UpdateSubscriptionDto = UpdateSubscriptionSchema.parse(input);
    const existing = await this.getSubscriptionById(id);

    if (dto.sourceAccountId) {
      const account = await this.accountRepo.findById(dto.sourceAccountId);
      if (!account || !account.isActive) {
        throw new NotFoundError(`Source account '${dto.sourceAccountId}' not found`);
      }
    }

    if (dto.categoryId) {
      const category = await this.categoryRepo.findById(dto.categoryId);
      if (!category) {
        throw new NotFoundError(`Category '${dto.categoryId}' not found`);
      }
    }

    const updated = await this.subscriptionRepo.update(id, {
      name: dto.name,
      amount: dto.amount,
      billingCycle: dto.billingCycle,
      nextBillingDate: dto.nextBillingDate,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: dto.status,
      notes: dto.notes,
      sourceAccount: dto.sourceAccountId ? { connect: { id: dto.sourceAccountId } } : undefined,
      category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
    });

    return this.enhanceSubscription(updated);
  }

  async cancelSubscription(id: string): Promise<SubscriptionWithNormalizedCosts> {
    return this.updateSubscription(id, {
      status: SubscriptionStatus.CANCELLED,
      endDate: new Date(),
    });
  }

  async toggleStatus(id: string, status: SubscriptionStatus): Promise<SubscriptionWithNormalizedCosts> {
    if (!Object.values(SubscriptionStatus).includes(status)) {
      throw new BadRequestError(`Invalid subscription status '${status}'`);
    }
    return this.updateSubscription(id, { status });
  }

  async processPayment(id: string) {
    const sub = await this.getSubscriptionById(id);

    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestError(`Cannot process payment for subscription '${sub.name}' because it is ${sub.status}`);
    }

    // Determine payment method from source account type
    let paymentMethod: PaymentMethod = PaymentMethod.BANK_TRANSFER;
    if (sub.sourceAccount?.type === AccountType.CREDIT_CARD) {
      paymentMethod = PaymentMethod.CREDIT_CARD;
    } else if (sub.sourceAccount?.type === AccountType.CASH) {
      paymentMethod = PaymentMethod.CASH;
    } else if (sub.sourceAccount?.type === AccountType.UPI || sub.sourceAccount?.type === AccountType.AMAZON_PAY) {
      paymentMethod = PaymentMethod.UPI;
    }

    // 1. Create Transaction (EXPENSE linked to Subscription)
    const transaction = await this.transactionService.createTransaction({
      type: TransactionType.EXPENSE,
      amount: sub.amount,
      sourceAccountId: sub.sourceAccountId,
      categoryId: sub.categoryId,
      paymentMethod,
      description: `Recurring Subscription Payment: ${sub.name}`,
      merchant: sub.name,
      isSubscription: true,
      subscriptionId: sub.id,
      transactionDate: new Date(),
    });

    // 2. Advance Next Billing Date
    const nextBillingDate = this.advanceBillingDate(sub.nextBillingDate, sub.billingCycle as BillingCycle);
    await this.subscriptionRepo.update(sub.id, { nextBillingDate });

    return {
      message: `Payment processed for subscription '${sub.name}'`,
      transaction,
      nextBillingDate,
    };
  }

  async getUpcomingPayments(daysAhead: number = 30) {
    const upcoming = await this.subscriptionRepo.findUpcoming(daysAhead);
    return upcoming.map((s) => ({
      ...this.enhanceSubscription(s),
      daysUntilDue: Math.ceil((new Date(s.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)),
    }));
  }

  async getSubscriptionAnalytics() {
    const allActive = await this.subscriptionRepo.findAll({ status: SubscriptionStatus.ACTIVE });
    const enhancedActive = allActive.map((s) => this.enhanceSubscription(s));

    const totalMonthlyCost = enhancedActive.reduce((sum, s) => sum + s.monthlyCost, 0);
    const totalAnnualCost = enhancedActive.reduce((sum, s) => sum + s.annualCost, 0);

    const upcoming = await this.getUpcomingPayments(30);

    return {
      activeSubscriptionCount: enhancedActive.length,
      totalNormalizedMonthlyCost: Number(totalMonthlyCost.toFixed(2)),
      totalNormalizedAnnualCost: Number(totalAnnualCost.toFixed(2)),
      upcomingPaymentsCount: upcoming.length,
      upcomingPayments: upcoming,
      activeSubscriptions: enhancedActive,
    };
  }
}
