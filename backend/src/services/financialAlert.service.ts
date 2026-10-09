import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { PushNotificationService } from './pushNotification.service';

type Alert = { key: string; title: string; body: string; tab: string };
const dayMs = 86_400_000;
const daysUntil = (date: Date, now: Date) => Math.ceil((new Date(date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / dayMs);
const money = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Generates only actionable alerts; event keys make each financial state deliver once. */
export class FinancialAlertService {
  constructor(private db: PrismaClient = defaultPrisma, private push = new PushNotificationService()) {}

  async sendDailyAlerts(now = new Date()) {
    const subscribers = await this.db.pushSubscription.findMany({ select: { userId: true }, distinct: ['userId'] });
    if (!subscribers.length) return { sent: 0, reason: 'no-subscribers' };
    let sent = 0;
    let evaluated = 0;
    for (const { userId } of subscribers) {
      // Production authentication currently represents the single owner as
      // "owner", while existing ledger rows predate user scoping and have a
      // null userId. Evaluate that legacy ledger, but deliver to the owner's
      // registered push subscriptions.
      const ledgerUserId = process.env.NODE_ENV === 'production' && userId === 'owner' ? null : userId;
      const alerts = await this.collectAlerts(now, ledgerUserId);
      evaluated += alerts.length;
      for (const alert of alerts) {
        try {
          await this.db.pushAlertDelivery.create({ data: { eventKey: `${userId || 'legacy'}:${alert.key}` } });
        } catch { continue; } // another process already delivered this event
        await this.push.send({ title: alert.title, body: alert.body, data: { tab: alert.tab } }, userId);
        sent++;
      }
    }
    return { sent, evaluated };
  }

  private async collectAlerts(now: Date, userId: string | null): Promise<Alert[]> {
    const owner = userId ? { userId } : { userId: null };
    const [subscriptions, cards, debts, budgets, goals] = await Promise.all([
      this.db.subscription.findMany({ where: { ...owner, status: 'ACTIVE' } }),
      this.db.account.findMany({ where: { ...owner, type: 'CREDIT_CARD', isActive: true } }),
      this.db.debt.findMany({ where: { ...owner, type: 'I_OWE', status: { not: 'SETTLED' }, dueDate: { not: null } } }),
      this.db.budget.findMany({ where: { ...owner, isActive: true, billingCycleStartDate: { lte: now }, billingCycleEndDate: { gte: now } } }),
      this.db.goal.findMany({ where: { ...owner, isActive: true, status: 'ACTIVE' } }),
    ]);
    const alerts: Alert[] = [];
    for (const subscription of subscriptions) {
      const days = daysUntil(subscription.nextBillingDate, now);
      if (days >= 0 && days <= 3) alerts.push({ key: `subscription:${subscription.id}:${subscription.nextBillingDate.toISOString().slice(0, 10)}`, title: days === 0 ? 'Subscription due today' : 'Subscription due soon', body: `${subscription.name} renews ${days === 0 ? 'today' : `in ${days} days`} for ${money(subscription.amount)}.`, tab: 'subscriptions' });
    }
    for (const card of cards) {
      const outstanding = Math.max(0, card.currentBalance || 0);
      if (!outstanding || !card.paymentDueDay) continue;
      const due = new Date(now.getFullYear(), now.getMonth(), Math.min(card.paymentDueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
      if (due < new Date(now.getFullYear(), now.getMonth(), now.getDate())) due.setMonth(due.getMonth() + 1);
      const days = daysUntil(due, now);
      if (days <= 5) alerts.push({ key: `card:${card.id}:${due.toISOString().slice(0, 10)}:${outstanding.toFixed(2)}`, title: days === 0 ? 'Credit-card payment due today' : 'Credit-card payment due soon', body: `${card.name} has ${money(outstanding)} outstanding; pay ${days === 0 ? 'today' : `in ${days} days`}.`, tab: 'accounts' });
    }
    for (const debt of debts) {
      const days = daysUntil(debt.dueDate!, now); const remaining = Math.max(0, debt.amount - debt.settledAmount);
      if (remaining && days <= 5) alerts.push({ key: `debt:${debt.id}:${debt.dueDate!.toISOString().slice(0, 10)}:${remaining.toFixed(2)}`, title: days <= 0 ? 'Debt payment overdue' : 'Debt payment due soon', body: `${money(remaining)} owed to ${debt.personName} is ${days <= 0 ? 'due now' : `due in ${days} days`}.`, tab: 'debts' });
    }
    for (const budget of budgets) {
      const categoryIds = (budget.categoryIds || budget.categoryId || '').split(',').filter(Boolean);
      const spent = await this.db.transaction.aggregate({ _sum: { amount: true }, where: { ...owner, type: 'EXPENSE', transactionDate: { gte: budget.billingCycleStartDate, lte: budget.billingCycleEndDate }, ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}) } });
      const percent = budget.amount ? ((spent._sum.amount || 0) / budget.amount) * 100 : 0;
      const level = percent >= 100 ? 'exceeded' : percent >= budget.alertThreshold ? 'warning' : null;
      if (level) alerts.push({ key: `budget:${budget.id}:${budget.billingCycleStartDate.toISOString().slice(0, 10)}:${level}`, title: level === 'exceeded' ? 'Budget exceeded' : 'Budget nearing its limit', body: `${budget.name} is at ${percent.toFixed(0)}% of its ${money(budget.amount)} limit.`, tab: 'budgets' });
    }
    for (const goal of goals) {
      const days = daysUntil(goal.deadline, now);
      if (days >= 0 && days <= 7 && goal.currentAmount < goal.targetAmount) alerts.push({ key: `goal:${goal.id}:${goal.deadline.toISOString().slice(0, 10)}`, title: days === 0 ? 'Goal deadline is today' : 'Goal deadline approaching', body: `${goal.name} is ${days === 0 ? 'due today' : `due in ${days} days`} (${Math.round(goal.currentAmount / goal.targetAmount * 100)}% complete).`, tab: 'goals' });
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [income, expenses] = await Promise.all(['INCOME', 'EXPENSE'].map((type) => this.db.transaction.aggregate({ _sum: { amount: true }, where: { ...owner, type, transactionDate: { gte: monthStart, lte: now } } })));
    const net = (income._sum.amount || 0) - (expenses._sum.amount || 0);
    if (net < 0) alerts.push({ key: `cashflow:${monthStart.toISOString().slice(0, 7)}:negative`, title: 'Spending is ahead of income', body: `This month is ${money(Math.abs(net))} below break-even. Review discretionary spending.`, tab: 'overview' });
    return alerts;
  }
}
