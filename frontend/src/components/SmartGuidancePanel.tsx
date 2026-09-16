import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Clock3,
  Gift,
  HeartPulse,
  Info,
  Loader2,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
} from 'lucide-react';
import { DashboardData, Transaction } from '../types';
import { formatCurrency } from './SummaryCards';
import { api } from '../api/client';
import { useToast } from '../utils/toastStore';

type SmartGuidancePanelProps = {
  dashboardData: DashboardData;
  transactions: Transaction[];
};

type CategoryDrift = {
  categoryName: string;
  currentAmount: number;
  previousMonthAmount: number;
  delta: number;
  deltaPercent: number;
};

type QuickActionId = 'daily-cap-alert' | 'category-budget' | 'payday-reminder' | 'reset-plan' | 'weekend-guard';

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const toPrimaryCategoryName = (rawName?: string) => {
  if (!rawName) return 'Uncategorized';
  return rawName.split('>')[0].trim() || 'Uncategorized';
};

export const SmartGuidancePanel: React.FC<SmartGuidancePanelProps> = ({ dashboardData, transactions }) => {
  const { addToast } = useToast();
  const [actionLoading, setActionLoading] = useState<QuickActionId | null>(null);

  const insights = useMemo(() => {
    const now = new Date();
    const todayKey = toDateKey(now);
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const expenseTransactions = transactions.filter((tx) => tx.type === 'EXPENSE');
    const incomeTransactions = transactions.filter((tx) => tx.type === 'INCOME');
    const monthlyExpenseTransactions = expenseTransactions.filter((tx) => {
      const d = new Date(tx.transactionDate);
      return d >= startOfMonth && d <= endOfMonth;
    });

    // 7) Safe-to-spend-today meter
    const daysInMonth = dashboardData.forecast?.daysInMonth || endOfMonth.getDate();
    const daysElapsed = dashboardData.forecast?.daysElapsed || now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - daysElapsed);
    const spendingSoFar = dashboardData.forecast?.spendingSoFar || dashboardData.summary.spendingThisMonth;
    const incomeThisMonth = dashboardData.summary.incomeThisMonth;
    const monthlyHeadroom = incomeThisMonth - spendingSoFar;
    const safeToSpendToday = Number((monthlyHeadroom / daysRemaining).toFixed(2));

    // 2) Category drift alerts (current month vs previous month)
    const monthCategorySpend: Record<string, Record<string, number>> = {};
    const monthPocketSpend: Record<string, number> = {};
    for (const tx of expenseTransactions) {
      const d = new Date(tx.transactionDate);
      const mKey = toMonthKey(d);
      const categoryName = toPrimaryCategoryName(tx.category?.name);
      if (!monthCategorySpend[mKey]) monthCategorySpend[mKey] = {};
      monthCategorySpend[mKey][categoryName] = (monthCategorySpend[mKey][categoryName] || 0) + tx.amount;
    }

    for (const tx of expenseTransactions) {
      const d = new Date(tx.transactionDate);
      const mKey = toMonthKey(d);
      const sourceAccountName = tx.sourceAccount?.name?.toLowerCase() || '';
      const destinationAccountName = tx.destinationAccount?.name?.toLowerCase() || '';
      const sourceIsPocketApp = sourceAccountName.includes('pocket app');
      const destinationIsPocketApp = destinationAccountName.includes('pocket app');
      const isPocketAppUsage = sourceIsPocketApp || destinationIsPocketApp;

      if (isPocketAppUsage) {
        monthPocketSpend[mKey] = (monthPocketSpend[mKey] || 0) + tx.amount;
      }
    }

    const currentMonthKey = toMonthKey(now);
    const previousMonthKey = toMonthKey(new Date(year, month - 1, 1));

    const currentCategorySpend = { ...(monthCategorySpend[currentMonthKey] || {}) };
    const previousMonthCategorySpend = { ...(monthCategorySpend[previousMonthKey] || {}) };

    const currentPocketAllowance = monthPocketSpend[currentMonthKey] || 0;
    const previousPocketAllowance = monthPocketSpend[previousMonthKey] || 0;
    if (currentPocketAllowance > 0 || previousPocketAllowance > 0) {
      currentCategorySpend['Pocket Allowance'] = Number(currentPocketAllowance.toFixed(2));
      previousMonthCategorySpend['Pocket Allowance'] = Number(previousPocketAllowance.toFixed(2));
    }
    const topCurrentMonthEntry = Object.entries(currentCategorySpend)
      .sort((a, b) => b[1] - a[1])[0];
    const topPreviousMonthEntry = Object.entries(previousMonthCategorySpend)
      .sort((a, b) => b[1] - a[1])[0];

    const topCurrentMonthSpend = topCurrentMonthEntry
      ? { categoryName: topCurrentMonthEntry[0], amount: Number(topCurrentMonthEntry[1].toFixed(2)) }
      : null;
    const topPreviousMonthSpend = topPreviousMonthEntry
      ? { categoryName: topPreviousMonthEntry[0], amount: Number(topPreviousMonthEntry[1].toFixed(2)) }
      : null;
    const categoryNames = Array.from(new Set([
      ...Object.keys(currentCategorySpend),
      ...Object.keys(previousMonthCategorySpend),
    ]));

    const allCategoryDrifts: CategoryDrift[] = categoryNames
      .map((categoryName) => {
        const currentAmount = currentCategorySpend[categoryName] || 0;
        const previousMonthAmount = previousMonthCategorySpend[categoryName] || 0;
        const delta = currentAmount - previousMonthAmount;
        const deltaPercent = previousMonthAmount > 0 ? (delta / previousMonthAmount) * 100 : 0;
        return {
          categoryName,
          currentAmount: Number(currentAmount.toFixed(2)),
          previousMonthAmount: Number(previousMonthAmount.toFixed(2)),
          delta: Number(delta.toFixed(2)),
          deltaPercent: Number(deltaPercent.toFixed(1)),
        };
      })
      .filter((item) => item.currentAmount > 0 || item.previousMonthAmount > 0)
      .sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent));

    let categoryDrifts: CategoryDrift[] = allCategoryDrifts.slice(0, 5);
    const pocketDrift = allCategoryDrifts.find((item) => item.categoryName === 'Pocket Allowance');
    if (pocketDrift && !categoryDrifts.some((item) => item.categoryName === 'Pocket Allowance')) {
      categoryDrifts = [...categoryDrifts, pocketDrift];
    }

    const priorityCategoryKeywords = ['rent', 'housing', 'house'];
    const mustShowHousingDrifts = allCategoryDrifts.filter((item) => {
      const normalizedName = item.categoryName.toLowerCase();
      return priorityCategoryKeywords.some((keyword) => normalizedName.includes(keyword));
    });

    for (const mustShow of mustShowHousingDrifts) {
      const alreadyShown = categoryDrifts.some((item) => item.categoryName === mustShow.categoryName);
      if (!alreadyShown) {
        categoryDrifts = [...categoryDrifts, mustShow];
      }
    }

    // 4) No-spend streak + recovery mode
    const expenseByDate: Record<string, number> = {};
    for (const tx of expenseTransactions) {
      const d = new Date(tx.transactionDate);
      const key = toDateKey(d);
      expenseByDate[key] = (expenseByDate[key] || 0) + tx.amount;
    }

    const todaySpent = Number((expenseByDate[todayKey] || 0).toFixed(2));
    let noSpendStreak = 0;
    let cursor = new Date(now);

    while (noSpendStreak < 90) {
      const key = toDateKey(cursor);
      const daySpent = expenseByDate[key] || 0;
      if (daySpent > 0) break;
      noSpendStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    let previousStreakBeforeToday = 0;
    if (todaySpent > 0) {
      const prevCursor = new Date(now);
      prevCursor.setDate(prevCursor.getDate() - 1);
      while (previousStreakBeforeToday < 90) {
        const key = toDateKey(prevCursor);
        const daySpent = expenseByDate[key] || 0;
        if (daySpent > 0) break;
        previousStreakBeforeToday += 1;
        prevCursor.setDate(prevCursor.getDate() - 1);
      }
    }

    const isRecoveryMode = todaySpent > 0 && previousStreakBeforeToday >= 2;
    const recommendedRecoveryCap = Number(Math.max(200, safeToSpendToday * 0.65).toFixed(2));

    // 3) Payday auto-plan
    const todaysIncomeTransactions = incomeTransactions.filter((tx) => toDateKey(new Date(tx.transactionDate)) === todayKey);
    const paydayTodayIncome = Number(todaysIncomeTransactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2));
    const paycheckAmount = paydayTodayIncome > 0 ? paydayTodayIncome : Math.max(0, dashboardData.summary.incomeThisMonth);
    const debtRatio = dashboardData.summary.totalBalance > 0
      ? dashboardData.debts.totalIOwe / dashboardData.summary.totalBalance
      : 0;

    const essentialsPct = 50;
    const savingsPct = debtRatio > 0.45 ? 15 : 20;
    const emiPct = debtRatio > 0.45 ? 20 : 15;
    const discretionaryPct = 100 - essentialsPct - savingsPct - emiPct;

    const paydayPlan = {
      paycheckAmount,
      paydayDetectedToday: paydayTodayIncome > 0,
      essentials: Number(((paycheckAmount * essentialsPct) / 100).toFixed(2)),
      savings: Number(((paycheckAmount * savingsPct) / 100).toFixed(2)),
      emiAndDebt: Number(((paycheckAmount * emiPct) / 100).toFixed(2)),
      discretionary: Number(((paycheckAmount * discretionaryPct) / 100).toFixed(2)),
    };

    // 9) Weekend vs weekday burn analysis (last 60 days)
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 59);

    let weekendDays = 0;
    let weekdayDays = 0;
    let weekendSpend = 0;
    let weekdaySpend = 0;

    const spendByDateInRange: Record<string, number> = {};
    for (const tx of expenseTransactions) {
      const d = new Date(tx.transactionDate);
      if (d < rangeStart || d > now) continue;
      const key = toDateKey(d);
      spendByDateInRange[key] = (spendByDateInRange[key] || 0) + tx.amount;
    }

    const dayCursor = new Date(rangeStart);
    while (dayCursor <= now) {
      const dayKey = toDateKey(dayCursor);
      const daySpend = spendByDateInRange[dayKey] || 0;
      const dayOfWeek = dayCursor.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWeekend) {
        weekendDays += 1;
        weekendSpend += daySpend;
      } else {
        weekdayDays += 1;
        weekdaySpend += daySpend;
      }

      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    const avgWeekendSpend = weekendDays > 0 ? weekendSpend / weekendDays : 0;
    const avgWeekdaySpend = weekdayDays > 0 ? weekdaySpend / weekdayDays : 0;
    const weekendVsWeekdayDeltaPct = avgWeekdaySpend > 0
      ? ((avgWeekendSpend - avgWeekdaySpend) / avgWeekdaySpend) * 100
      : 0;
    const weekendDominant = weekendVsWeekdayDeltaPct > 10;

    // 10) Financial stress score (0 low stress -> 100 high stress)
    const overspendRatio = incomeThisMonth > 0
      ? Math.max(0, (dashboardData.forecast?.projectedOverspend || 0) / incomeThisMonth)
      : 0;
    const runwayPressure = Math.min(35, overspendRatio * 35);

    const debtPressure = dashboardData.summary.totalBalance > 0
      ? Math.min(30, (dashboardData.debts.totalIOwe / dashboardData.summary.totalBalance) * 30)
      : 15;

    const dailySpendMapForVolatility: Record<string, number> = {};
    for (const tx of monthlyExpenseTransactions) {
      const key = toDateKey(new Date(tx.transactionDate));
      dailySpendMapForVolatility[key] = (dailySpendMapForVolatility[key] || 0) + tx.amount;
    }

    const dailyValues: number[] = [];
    for (let d = 1; d <= now.getDate(); d++) {
      const key = toDateKey(new Date(year, month, d));
      dailyValues.push(dailySpendMapForVolatility[key] || 0);
    }

    const mean = dailyValues.length > 0
      ? dailyValues.reduce((sum, value) => sum + value, 0) / dailyValues.length
      : 0;
    const variance = dailyValues.length > 0
      ? dailyValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / dailyValues.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const volatilityRatio = mean > 0 ? stdDev / mean : 0;
    const volatilityPressure = Math.min(20, volatilityRatio * 20);

    const subscriptionLoadRatio = incomeThisMonth > 0
      ? dashboardData.recurring.monthlySubscriptionCost / incomeThisMonth
      : 0;
    const subscriptionPressure = Math.min(15, subscriptionLoadRatio * 15);

    const stressScore = Math.min(100, Math.round(runwayPressure + debtPressure + volatilityPressure + subscriptionPressure));
    const stressLevel = stressScore >= 65 ? 'HIGH' : stressScore >= 40 ? 'MEDIUM' : 'LOW';

    // 3) Month-end projection
    const avgBurnRate = daysElapsed > 0 ? spendingSoFar / daysElapsed : 0;
    const projectedMonthEndSpend = Number((dashboardData.forecast?.projectedMonthEndSpend || (avgBurnRate * daysInMonth)).toFixed(2));
    const projectedLeftover = Number((incomeThisMonth - projectedMonthEndSpend).toFixed(2));
    const overspendProbability = projectedLeftover >= 0 ? Math.max(5, Math.round((1 - (projectedLeftover / Math.max(incomeThisMonth, 1))) * 45)) : Math.min(95, 55 + Math.round((Math.abs(projectedLeftover) / Math.max(incomeThisMonth, 1)) * 40));
    const overspendRisk = overspendProbability >= 65 ? 'HIGH' : overspendProbability >= 35 ? 'MEDIUM' : 'LOW';

    // 5) Habit nudges with timing
    const weekendHourBuckets = Array.from({ length: 24 }, () => 0);
    for (const tx of expenseTransactions) {
      const d = new Date(tx.transactionDate);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (!isWeekend || d < rangeStart || d > now) continue;
      weekendHourBuckets[d.getHours()] += tx.amount;
    }

    const topWeekendHour = weekendHourBuckets.reduce((maxHour, value, hour, arr) => (value > arr[maxHour] ? hour : maxHour), 0);
    const topWeekendHourSpend = weekendHourBuckets[topWeekendHour];
    const habitNudges: string[] = [];

    if (weekendDominant && topWeekendHourSpend > 0) {
      const startHour = topWeekendHour;
      const endHour = (topWeekendHour + 2) % 24;
      habitNudges.push(`Your peak weekend spending hour is around ${startHour}:00-${endHour}:00. Set a low-spend reminder before this window.`);
    }

    const topDriftUp = categoryDrifts.find((item) => item.deltaPercent > 0);
    if (topDriftUp) {
      habitNudges.push(`"${topDriftUp.categoryName}" is up ${topDriftUp.deltaPercent}%. Keep this category under ${formatCurrency(Math.max(0, topDriftUp.currentAmount * 0.85))} this month.`);
    }

    if (habitNudges.length === 0) {
      habitNudges.push('Spend pattern is steady. Keep a 24-hour delay rule for non-essential purchases to protect savings.');
    }

    // 9) Streak gamification
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    let noSpendDaysThisWeek = 0;
    const weekCursor = new Date(weekStart);
    while (weekCursor <= now) {
      const key = toDateKey(weekCursor);
      if ((expenseByDate[key] || 0) === 0) noSpendDaysThisWeek += 1;
      weekCursor.setDate(weekCursor.getDate() + 1);
    }

    let noSpendDaysThisMonth = 0;
    for (let d = 1; d <= daysElapsed; d++) {
      const key = toDateKey(new Date(year, month, d));
      if ((expenseByDate[key] || 0) === 0) noSpendDaysThisMonth += 1;
    }

    const monthlyConsistencyScore = Math.round((noSpendDaysThisMonth / Math.max(daysElapsed, 1)) * 100);

    let bestStreak90d = 0;
    let running = 0;
    const streakCursor = new Date(now);
    for (let i = 0; i < 90; i++) {
      const key = toDateKey(streakCursor);
      if ((expenseByDate[key] || 0) === 0) {
        running += 1;
        bestStreak90d = Math.max(bestStreak90d, running);
      } else {
        running = 0;
      }
      streakCursor.setDate(streakCursor.getDate() - 1);
    }

    const badgeLabel = noSpendStreak >= 14
      ? 'Momentum Master'
      : noSpendStreak >= 7
        ? 'Weekly Discipline'
        : noSpendStreak >= 3
          ? 'Consistency Starter'
          : 'Getting Started';

    // 10) Next best move summary
    let nextBestMove = {
      title: `Keep spend under ${formatCurrency(Math.max(0, safeToSpendToday))} today`,
      reason: `${daysRemaining} day(s) left, this keeps your monthly plan stable.`,
      actionId: 'daily-cap-alert' as QuickActionId,
    };

    if (stressLevel === 'HIGH') {
      nextBestMove = {
        title: `Start a 3-day reset under ${formatCurrency(recommendedRecoveryCap)} per day`,
        reason: 'Stress is high; a short reset lowers volatility quickly.',
        actionId: 'reset-plan',
      };
    } else if (weekendDominant) {
      nextBestMove = {
        title: 'Enable a weekend spending guard reminder',
        reason: 'Your weekend burn is consistently above weekday average.',
        actionId: 'weekend-guard',
      };
    } else if (topDriftUp) {
      nextBestMove = {
        title: `Create a budget cap for ${topDriftUp.categoryName}`,
        reason: `Spending in this category is up ${topDriftUp.deltaPercent}% month over month.`,
        actionId: 'category-budget',
      };
    }

    return {
      safeToSpendToday: Number(safeToSpendToday.toFixed(2)),
      monthlyHeadroom: Number(monthlyHeadroom.toFixed(2)),
      daysRemaining,
      topCurrentMonthSpend,
      topPreviousMonthSpend,
      categoryDrifts,
      noSpendStreak,
      previousStreakBeforeToday,
      todaySpent,
      isRecoveryMode,
      recommendedRecoveryCap,
      paydayPlan,
      avgWeekendSpend: Number(avgWeekendSpend.toFixed(2)),
      avgWeekdaySpend: Number(avgWeekdaySpend.toFixed(2)),
      weekendVsWeekdayDeltaPct: Number(weekendVsWeekdayDeltaPct.toFixed(1)),
      weekendDominant,
      stressScore,
      stressLevel,
      projectedMonthEndSpend,
      projectedLeftover,
      overspendProbability,
      overspendRisk,
      habitNudges,
      noSpendDaysThisWeek,
      noSpendDaysThisMonth,
      monthlyConsistencyScore,
      bestStreak90d,
      badgeLabel,
      nextBestMove,
    };
  }, [dashboardData, transactions]);

  const handleQuickAction = async (actionId: QuickActionId) => {
    try {
      setActionLoading(actionId);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (actionId === 'daily-cap-alert') {
        await api.createQuickItem({
          type: 'REMINDER',
          title: `Daily spend cap: ${formatCurrency(Math.max(0, insights.safeToSpendToday))}`,
          details: `Keep today's non-essential spending under ${formatCurrency(Math.max(0, insights.safeToSpendToday))}.`,
          priority: 'HIGH',
          dueDate: tomorrow.toISOString(),
        });
        addToast('Daily spend reminder created', 'success');
      }

      if (actionId === 'category-budget') {
        const targetCategory = insights.categoryDrifts.find((item) => item.deltaPercent > 0)?.categoryName || 'High-drift category';
        await api.createQuickItem({
          type: 'TODO',
          title: `Create budget for ${targetCategory}`,
          details: 'Open Budgets and set a cap for this category to reduce drift.',
          priority: 'NORMAL',
        });
        addToast('Budget task added to quick items', 'success');
      }

      if (actionId === 'payday-reminder') {
        await api.createQuickItem({
          type: 'REMINDER',
          title: 'Payday transfer plan',
          details: `Essentials ${formatCurrency(insights.paydayPlan.essentials)}, Savings ${formatCurrency(insights.paydayPlan.savings)}, Debt ${formatCurrency(insights.paydayPlan.emiAndDebt)}.`,
          priority: 'HIGH',
          dueDate: new Date().toISOString(),
        });
        addToast('Payday reminder created', 'success');
      }

      if (actionId === 'reset-plan') {
        await api.createQuickItem({
          type: 'TODO',
          title: 'Start 3-day spending reset',
          details: `For the next 3 days, keep daily spend under ${formatCurrency(insights.recommendedRecoveryCap)}.`,
          priority: 'HIGH',
        });
        addToast('3-day reset plan added', 'success');
      }

      if (actionId === 'weekend-guard') {
        await api.createQuickItem({
          type: 'REMINDER',
          title: 'Weekend spending guard',
          details: 'Before peak weekend hours, review your cap and pause impulse purchases.',
          priority: 'NORMAL',
          dueDate: tomorrow.toISOString(),
        });
        addToast('Weekend guard reminder created', 'success');
      }
    } catch (error: any) {
      addToast(error?.response?.data?.message || error?.message || 'Quick action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const actionButton = (actionId: QuickActionId, label: string) => (
    <button
      type="button"
      onClick={() => handleQuickAction(actionId)}
      disabled={actionLoading !== null}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-slate-900/50 px-2 py-1 text-[11px] text-slate-100 transition hover:bg-slate-800/70 disabled:opacity-60"
    >
      {actionLoading === actionId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {label}
    </button>
  );

  const whyPanel = (title: string, lines: string[]) => (
    <details className="mt-2 text-[11px]">
      <summary className="inline-flex cursor-pointer items-center gap-1 text-slate-300 hover:text-white">
        <Info className="h-3.5 w-3.5" /> Why this insight?
      </summary>
      <div className="mt-1 rounded-lg border border-white/10 bg-slate-900/45 p-2 text-slate-300">
        <p className="font-semibold text-slate-200">{title}</p>
        {lines.map((line) => (
          <p key={line} className="mt-0.5">{line}</p>
        ))}
      </div>
    </details>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 md:col-span-2 xl:col-span-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
          <Megaphone className="h-4 w-4" /> Next Best Move Today
        </div>
        <p className="mt-1 text-base font-semibold text-white">{insights.nextBestMove.title}</p>
        <p className="mt-0.5 text-xs text-blue-100/90">{insights.nextBestMove.reason}</p>
        {actionButton(insights.nextBestMove.actionId, 'Do this now')}
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
        <div className="flex items-center gap-2 text-cyan-200 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4" /> Safe To Spend Today
        </div>
        <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(Math.max(0, insights.safeToSpendToday))}</p>
        <p className="mt-1 text-xs text-cyan-100/90">
          {insights.daysRemaining} day(s) left. Monthly headroom: {formatCurrency(insights.monthlyHeadroom)}
        </p>
        {actionButton('daily-cap-alert', 'Set daily spending alert')}
        {whyPanel('Safe-to-spend logic', [
          `Monthly headroom = income this month (${formatCurrency(dashboardData.summary.incomeThisMonth)}) - spending so far (${formatCurrency(dashboardData.forecast?.spendingSoFar || dashboardData.summary.spendingThisMonth)}).`,
          `Daily cap = headroom / remaining days (${insights.daysRemaining}).`,
        ])}
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
        <div className="flex items-center gap-2 text-amber-200 text-sm font-semibold">
          <Sparkles className="h-4 w-4" /> Category Drift Alerts
        </div>
        <div className="mt-1.5 rounded-lg border border-amber-400/20 bg-slate-900/40 p-2 text-[11px] leading-tight">
          <p className="text-amber-100/90">Top spent comparison</p>
          <p className="mt-0.5 text-slate-100">
            Current month: {insights.topCurrentMonthSpend ? `${insights.topCurrentMonthSpend.categoryName} (${formatCurrency(insights.topCurrentMonthSpend.amount)})` : 'No spending data'}
          </p>
          <p className="mt-0.5 text-slate-300">
            Last month: {insights.topPreviousMonthSpend ? `${insights.topPreviousMonthSpend.categoryName} (${formatCurrency(insights.topPreviousMonthSpend.amount)})` : 'No spending data'}
          </p>
        </div>
        {insights.categoryDrifts.length > 0 ? (
          <div className="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {insights.categoryDrifts.map((item) => (
              <div key={item.categoryName} className="text-[11px] leading-tight rounded-lg border border-amber-400/20 bg-slate-900/40 p-1.5">
                <div className="flex items-center justify-between text-slate-100">
                  <span>{item.categoryName}</span>
                    <span className={item.deltaPercent >= 0 ? 'text-amber-200' : 'text-emerald-200'}>
                      {item.deltaPercent >= 0 ? '+' : ''}{item.deltaPercent}%
                    </span>
                </div>
                <div className="mt-0.5 text-slate-300">
                  {formatCurrency(item.currentAmount)} vs last month {formatCurrency(item.previousMonthAmount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-amber-100/90">No abnormal category drift right now.</p>
        )}
        {actionButton('category-budget', 'Create category budget task')}
        {whyPanel('Category drift calculation', [
          'This compares each category spend in current month vs previous month.',
          'Drift % = (current - previous) / previous, then top shifts are highlighted.',
        ])}
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
        <div className="flex items-center gap-2 text-indigo-200 text-sm font-semibold">
          <CalendarClock className="h-4 w-4" /> Payday Auto-Plan
        </div>
        <p className="mt-2 text-xs text-indigo-100/90">
          {insights.paydayPlan.paydayDetectedToday ? 'Salary detected today. Plan generated.' : 'Preview split for your current monthly income.'}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-indigo-400/20 bg-slate-900/40 p-2">
            Essentials
            <p className="text-slate-100 font-semibold">{formatCurrency(insights.paydayPlan.essentials)}</p>
          </div>
          <div className="rounded-lg border border-indigo-400/20 bg-slate-900/40 p-2">
            Savings
            <p className="text-slate-100 font-semibold">{formatCurrency(insights.paydayPlan.savings)}</p>
          </div>
          <div className="rounded-lg border border-indigo-400/20 bg-slate-900/40 p-2">
            EMI and debt
            <p className="text-slate-100 font-semibold">{formatCurrency(insights.paydayPlan.emiAndDebt)}</p>
          </div>
          <div className="rounded-lg border border-indigo-400/20 bg-slate-900/40 p-2">
            Discretionary
            <p className="text-slate-100 font-semibold">{formatCurrency(insights.paydayPlan.discretionary)}</p>
          </div>
        </div>
        {actionButton('payday-reminder', 'Create transfer reminders')}
        {whyPanel('Payday split logic', [
          'Base split is Essentials 50%, Savings 20%, Debt 15%, Discretionary remainder.',
          'If debt ratio is high, savings and debt buckets are rebalanced toward repayment.',
        ])}
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 text-emerald-200 text-sm font-semibold">
          <Target className="h-4 w-4" /> No-Spend Streak
        </div>
        <p className="mt-2 text-2xl font-bold text-white">{insights.noSpendStreak} day(s)</p>
        {insights.isRecoveryMode ? (
          <div className="mt-2 text-xs text-emerald-100/90">
            Streak broke today after {insights.previousStreakBeforeToday} day(s). Recovery mode: keep next 3 days under {formatCurrency(insights.recommendedRecoveryCap)} per day.
          </div>
        ) : (
          <p className="mt-2 text-xs text-emerald-100/90">Keep momentum by staying below your safe daily cap.</p>
        )}
        {actionButton('reset-plan', 'Start 3-day reset plan')}
        {whyPanel('Streak and recovery detection', [
          'A streak increments for each consecutive zero-expense day from today backward.',
          'Recovery mode starts when a spend happens after at least 2 no-spend days.',
        ])}
      </div>

      <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
        <div className="flex items-center gap-2 text-fuchsia-200 text-sm font-semibold">
          <ShoppingBag className="h-4 w-4" /> Weekend vs Weekday Burn
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-fuchsia-100/90">
          {insights.weekendDominant ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          <span>
            Weekend avg {formatCurrency(insights.avgWeekendSpend)} vs weekday avg {formatCurrency(insights.avgWeekdaySpend)}
          </span>
        </div>
        <p className="mt-1 text-xs text-fuchsia-100/90">
          Difference: {insights.weekendVsWeekdayDeltaPct > 0 ? '+' : ''}{insights.weekendVsWeekdayDeltaPct}%
        </p>
        {actionButton('weekend-guard', 'Enable weekend guard reminder')}
        {whyPanel('Weekend burn analysis', [
          'Looks at the last 60 days and computes average spend per weekend day vs weekday.',
          'If weekend average is meaningfully higher, it marks weekend as dominant.',
        ])}
      </div>

      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
        <div className="flex items-center gap-2 text-rose-200 text-sm font-semibold">
          <HeartPulse className="h-4 w-4" /> Financial Stress Score
        </div>
        <div className="mt-2 flex items-center gap-3">
          <p className="text-3xl font-bold text-white">{insights.stressScore}</p>
          <span className={`text-xs font-semibold rounded-full px-2 py-1 border ${insights.stressLevel === 'HIGH' ? 'border-rose-400/40 text-rose-200' : insights.stressLevel === 'MEDIUM' ? 'border-amber-400/40 text-amber-200' : 'border-emerald-400/40 text-emerald-200'}`}>
            {insights.stressLevel}
          </span>
        </div>
        <p className="mt-1 text-xs text-rose-100/90">
          Score combines runway pressure, debt load, spending volatility, and subscription load.
        </p>
        {whyPanel('Stress score inputs', [
          `Runway pressure uses projected overspend against income (${formatCurrency(dashboardData.summary.incomeThisMonth)}).`,
          `Debt and volatility contribute additional pressure; current level is ${insights.stressLevel}.`,
        ])}
      </div>

      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
        <div className="flex items-center gap-2 text-orange-200 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4" /> Month-End Forecast
        </div>
        <p className="mt-2 text-xs text-orange-100/90">
          Projected spend: {formatCurrency(insights.projectedMonthEndSpend)}
        </p>
        <p className="mt-1 text-xs text-orange-100/90">
          Projected leftover: {formatCurrency(insights.projectedLeftover)}
        </p>
        <div className="mt-2 inline-flex items-center rounded-full border border-orange-400/40 px-2 py-0.5 text-[11px] font-semibold text-orange-100">
          Overspend risk: {insights.overspendRisk} ({insights.overspendProbability}%)
        </div>
        {whyPanel('Forecast model', [
          'Uses forecast service projection when available.',
          'Fallback extrapolates current average daily burn to full month.',
        ])}
      </div>

      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
        <div className="flex items-center gap-2 text-sky-200 text-sm font-semibold">
          <Clock3 className="h-4 w-4" /> Habit Nudges
        </div>
        <div className="mt-2 space-y-1.5 text-xs text-sky-100/90">
          {insights.habitNudges.map((nudge) => (
            <p key={nudge} className="rounded-lg border border-sky-300/20 bg-slate-900/35 p-2">{nudge}</p>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
        <div className="flex items-center gap-2 text-violet-200 text-sm font-semibold">
          <Gift className="h-4 w-4" /> Streak Gamification
        </div>
        <p className="mt-2 text-xs text-violet-100/90">
          No-spend days this week: <span className="font-semibold text-white">{insights.noSpendDaysThisWeek}</span>
        </p>
        <p className="mt-1 text-xs text-violet-100/90">
          Monthly consistency score: <span className="font-semibold text-white">{insights.monthlyConsistencyScore}%</span>
        </p>
        <p className="mt-1 text-xs text-violet-100/90">
          Best streak (last 90 days): <span className="font-semibold text-white">{insights.bestStreak90d} day(s)</span>
        </p>
        <div className="mt-2 inline-flex items-center rounded-full border border-violet-300/40 px-2 py-0.5 text-[11px] font-semibold text-violet-100">
          Badge: {insights.badgeLabel}
        </div>
      </div>
    </div>
  );
};
