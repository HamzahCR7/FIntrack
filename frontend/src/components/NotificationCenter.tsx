import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Flag,
  Gauge,
  HandCoins,
  PiggyBank,
  PieChart,
  Repeat2,
  Target,
  X,
} from 'lucide-react';
import { DashboardData, Budget, Goal } from '../types';
import { formatCurrency } from '../utils/privacyStore';

type NotificationTab = 'overview' | 'reminders' | 'accounts' | 'debts' | 'subscriptions' | 'budgets' | 'goals';
type NotificationTone = 'danger' | 'warning' | 'info';

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  tone: NotificationTone;
  icon: React.ComponentType<{ className?: string }>;
  tab: NotificationTab;
}

interface NotificationCenterProps {
  dashboardData: DashboardData | null;
  budgets?: Budget[];
  goals?: Goal[];
  onNavigate: (tab: NotificationTab) => void;
}

const toneStyles: Record<NotificationTone, { icon: string; dot: string }> = {
  danger: { icon: 'bg-rose-500/15 text-rose-300', dot: 'bg-rose-400' },
  warning: { icon: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400' },
  info: { icon: 'bg-blue-500/15 text-blue-300', dot: 'bg-blue-400' },
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  dashboardData,
  budgets = [],
  goals = [],
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Budget Alerts & Progress
    budgets.forEach((budget) => {
      const percentage = budget.percentageUsed || 0;
      const spent = budget.spentAmount || 0;
      const amount = budget.amount || 0;
      const remaining = budget.remainingAmount ?? Math.max(0, amount - spent);

      if (budget.status === 'EXCEEDED' || percentage >= 100) {
        items.push({
          id: `budget-exceeded-${budget.id}`,
          title: `Budget Exceeded: ${budget.name}`,
          detail: `${formatCurrency(spent)} spent (${percentage.toFixed(0)}% of ${formatCurrency(amount)} limit)`,
          tone: 'danger',
          icon: PieChart,
          tab: 'budgets',
        });
      } else if (budget.status === 'WARNING' || percentage >= (budget.alertThreshold || 80)) {
        items.push({
          id: `budget-warning-${budget.id}`,
          title: `Budget Near Limit: ${budget.name}`,
          detail: `${formatCurrency(spent)} spent (${percentage.toFixed(0)}%) · ${formatCurrency(remaining)} left`,
          tone: 'warning',
          icon: PieChart,
          tab: 'budgets',
        });
      } else {
        // Active budget status notification
        items.push({
          id: `budget-info-${budget.id}`,
          title: `Budget: ${budget.name}`,
          detail: `${formatCurrency(spent)} spent of ${formatCurrency(amount)} (${percentage.toFixed(0)}%) · ${formatCurrency(remaining)} available`,
          tone: 'info',
          icon: PieChart,
          tab: 'budgets',
        });
      }
    });

    // 2. Goal Deadlines, EMI & Milestones
    goals.forEach((goal) => {
      const progress = goal.progressPercentage || 0;
      const target = goal.targetAmount || 0;
      const current = goal.currentAmount || 0;
      const remaining = Math.max(0, target - current);
      const daysLeft = goal.daysRemaining;

      if (goal.status === 'COMPLETED' || progress >= 100) {
        // Completed milestone celebration notification
        items.push({
          id: `goal-completed-${goal.id}`,
          title: `Goal Achieved: ${goal.name} 🎉`,
          detail: `Target of ${formatCurrency(target)} reached 100%!`,
          tone: 'info',
          icon: Flag,
          tab: 'goals',
        });
      } else if (daysLeft !== undefined && daysLeft <= 7 && daysLeft >= 0) {
        items.push({
          id: `goal-deadline-${goal.id}`,
          title: `Goal Target Due: ${goal.name}`,
          detail: `${daysLeft === 0 ? 'Target deadline is today' : `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`} (${progress.toFixed(0)}% reached)`,
          tone: daysLeft <= 3 ? 'danger' : 'warning',
          icon: Target,
          tab: 'goals',
        });
      } else if (goal.type === 'EMI' && goal.monthlyProgressNeeded && goal.monthlyProgressNeeded > 0) {
        items.push({
          id: `goal-emi-${goal.id}`,
          title: `Monthly EMI Due: ${goal.name}`,
          detail: `${formatCurrency(goal.monthlyProgressNeeded)} required this month · ${formatCurrency(current)} of ${formatCurrency(target)} paid`,
          tone: 'info',
          icon: Target,
          tab: 'goals',
        });
      } else {
        items.push({
          id: `goal-progress-${goal.id}`,
          title: `Goal: ${goal.name}`,
          detail: `${formatCurrency(current)} saved of ${formatCurrency(target)} (${progress.toFixed(0)}%) · ${formatCurrency(remaining)} remaining`,
          tone: 'info',
          icon: Target,
          tab: 'goals',
        });
      }
    });

    if (!dashboardData) return items;

    const addDueNotification = (id: string, title: string, amount: number, dueDate: Date, tab: NotificationTab, icon: NotificationItem['icon']) => {
      dueDate.setHours(0, 0, 0, 0);
      const days = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
      if (days > 7) return;

      const isOverdue = days < 0;
      const isToday = days === 0;
      const detail = isOverdue
        ? `${formatCurrency(amount)} overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
        : isToday
          ? `${formatCurrency(amount)} due today`
          : `${formatCurrency(amount)} due in ${days} day${days === 1 ? '' : 's'}`;
      items.push({ id, title, detail, tone: isOverdue || isToday ? 'danger' : 'warning', icon, tab });
    };

    (dashboardData.accounts.breakdown.CREDIT_CARD || []).forEach((card) => {
      const amount = card.currentBalance ?? card.currentOutstanding ?? 0;
      if (amount <= 0) return;
      const dueDay = card.paymentDueDay || 9;
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (dueDate < today) dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      addDueNotification(`card-${card.id}`, card.name, amount, dueDate, 'reminders', CreditCard);
    });

    dashboardData.recurring.upcomingSubscriptions.forEach((subscription) => {
      addDueNotification(`subscription-${subscription.id}`, subscription.name, subscription.amount, new Date(subscription.nextBillingDate), 'subscriptions', Clock3);
    });

    dashboardData.debts.activeDebts.forEach((debt) => {
      if (debt.type !== 'I_OWE' || debt.remainingAmount <= 0 || debt.status === 'SETTLED') return;
      const dueDate = debt.dueDate
        ? new Date(debt.dueDate)
        : new Date(today.getFullYear(), today.getMonth(), 28);
      addDueNotification(`debt-${debt.id}`, `Payment to ${debt.personName}`, debt.remainingAmount, dueDate, 'debts', HandCoins);
    });

    const nearTermDueCount = items.filter((item) => item.tab === 'reminders').length;
    if (nearTermDueCount > 0) {
      const nearTermDueAmount = [
        ...(dashboardData.accounts.breakdown.CREDIT_CARD || []).map((card) => card.currentBalance ?? card.currentOutstanding ?? 0),
        ...dashboardData.recurring.upcomingSubscriptions.map((subscription) => subscription.amount),
        ...dashboardData.debts.activeDebts
          .filter((debt) => debt.type === 'I_OWE' && debt.status !== 'SETTLED')
          .map((debt) => debt.remainingAmount),
      ].reduce((total, amount) => total + amount, 0);
      items.push({ id: 'near-term-total', title: 'Upcoming obligations', detail: `${formatCurrency(nearTermDueAmount)} across ${nearTermDueCount} payment${nearTermDueCount === 1 ? '' : 's'}`, tone: 'info', icon: Bell, tab: 'reminders' });
    }

    const spending = dashboardData.summary.spendingThisMonth;

    if (dashboardData.summary.creditOutstanding > 0) {
      items.push({ id: 'credit-outstanding', title: 'Credit balance outstanding', detail: `${formatCurrency(dashboardData.summary.creditOutstanding)} across your cards`, tone: 'info', icon: CreditCard, tab: 'accounts' });
    }

    const highUtilizationCards = (dashboardData.accounts.breakdown.CREDIT_CARD || []).filter((card) => (card.utilizationPercentage || 0) >= 75);
    if (highUtilizationCards.length > 0) {
      items.push({ id: 'credit-utilization', title: 'Credit utilization is high', detail: `${highUtilizationCards.length} card${highUtilizationCards.length === 1 ? '' : 's'} above 75% utilization`, tone: 'warning', icon: CreditCard, tab: 'accounts' });
    }

    if (dashboardData.debts.totalOwedToMe > 0) {
      items.push({ id: 'owed-to-you', title: 'Money is owed to you', detail: `${formatCurrency(dashboardData.debts.totalOwedToMe)} in outstanding receivables`, tone: 'info', icon: HandCoins, tab: 'debts' });
    }

    if (dashboardData.recurring.monthlySubscriptionCost > 0) {
      items.push({ id: 'recurring-cost', title: 'Recurring commitments', detail: `${formatCurrency(dashboardData.recurring.monthlySubscriptionCost)} expected each month`, tone: 'info', icon: Repeat2, tab: 'subscriptions' });
    }

    const monthlyIncome = dashboardData.summary.incomeThisMonth;
    if (monthlyIncome > 0 && spending > monthlyIncome) {
      items.push({ id: 'spending-over-income', title: 'Spending is above income', detail: `${formatCurrency(spending - monthlyIncome)} more spent than earned this month`, tone: 'danger', icon: AlertTriangle, tab: 'overview' });
    }

    if (dashboardData.summary.savingsThisMonth < 0) {
      items.push({ id: 'negative-savings', title: 'Monthly savings are negative', detail: `${formatCurrency(Math.abs(dashboardData.summary.savingsThisMonth))} shortfall this month`, tone: 'danger', icon: PiggyBank, tab: 'overview' });
    } else if (dashboardData.summary.savingsThisMonth > 0) {
      items.push({ id: 'monthly-savings', title: 'Monthly savings progress', detail: `${formatCurrency(dashboardData.summary.savingsThisMonth)} saved this month`, tone: 'info', icon: PiggyBank, tab: 'overview' });
    }

    const liquidCash = dashboardData.accounts.bankBalances + dashboardData.accounts.cashBalances + dashboardData.accounts.upiBalances;
    const averageMonthlyExpense = spending || dashboardData.summary.totalExpenses;
    const runwayMonths = averageMonthlyExpense > 0 ? liquidCash / averageMonthlyExpense : 0;
    if (runwayMonths > 0 && runwayMonths < 3) {
      items.push({ id: 'cash-runway', title: 'Cash runway is low', detail: `${runwayMonths.toFixed(1)} months of typical spending covered`, tone: 'warning', icon: AlertTriangle, tab: 'overview' });
    }

    return items.sort((first, second) => (first.tone === 'danger' ? -1 : 1) - (second.tone === 'danger' ? -1 : 1));
  }, [dashboardData, budgets, goals]);

  const urgentCount = notifications.filter((item) => item.tone === 'danger').length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className={`relative rounded-xl border p-2.5 transition-colors ${isOpen ? 'border-blue-400/50 bg-blue-500/20 text-white' : 'border-slate-700/60 bg-slate-800 text-slate-300 hover:bg-slate-700/80 hover:text-white'}`}
        title="Open financial notifications"
        aria-label={`Financial notifications${notifications.length ? `, ${notifications.length} items` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{notifications.length}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-slate-950/60">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/80 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-white">Financial alerts</p>
              <p className="text-[11px] text-slate-400">{notifications.length ? `${urgentCount} urgent · ${notifications.length} total` : 'Everything looks clear'}</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Close notifications">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-semibold text-white">No new alerts</p>
                <p className="text-xs text-slate-400">Your upcoming payments and budget are under control.</p>
              </div>
            ) : notifications.map((notification) => {
              const Icon = notification.icon;
              const styles = toneStyles[notification.tone];
              return (
                <button
                  key={notification.id}
                  onClick={() => { onNavigate(notification.tab); setIsOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-800"
                >
                  <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
                    <Icon className="h-4 w-4" />
                    <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${styles.dot}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-100">{notification.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">{notification.detail}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
