import React, { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency } from './SummaryCards';
import { ClearableSelect } from './ClearableSelect';

interface DailySpendingSectionProps {
  transactions: Transaction[];
  onAddTransactionForDate?: (dateIsoString: string) => void;
}

interface DailySpendingDatum {
  day: number;
  dayName: string;
  date: string;
  isoDate: string;
  spending: number;
  income: number;
  netFlow: number;
  prevSpending: number;
  isSpike: boolean;
}

const formatCompactCurrency = (value: number) => {
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `₹${value}`;
};

const VisibleBarShape = (props: any) => {
  const { fill, x, y, width, height, value, radius } = props;
  if (!value || value <= 0) return null;

  const minHeight = 4;
  const actualHeight = Math.max(height || 0, minHeight);
  const actualY = (y || 0) - (actualHeight - (height || 0));
  const r = radius && Array.isArray(radius) ? radius[0] : 4;

  return (
    <rect
      x={x}
      y={actualY}
      width={width}
      height={actualHeight}
      fill={fill}
      rx={r}
      ry={r}
    />
  );
};

export const DailySpendingSection: React.FC<DailySpendingSectionProps> = ({
  transactions,
  onAddTransactionForDate,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [showBudgetLine, setShowBudgetLine] = useState<boolean>(true);
  const [showPrevMonth, setShowPrevMonth] = useState<boolean>(false);
  const [showNetFlow, setShowNetFlow] = useState<boolean>(false);
  const [showDistribution, setShowDistribution] = useState<boolean>(false);

  // Extract unique categories & accounts
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach((t) => {
      const catId = t.categoryId || t.category?.id;
      const catName = t.category?.name || 'Uncategorized';
      if (catId) {
        map.set(catId, catName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions]);

  const accounts = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach((t) => {
      const accId = t.sourceAccountId || t.sourceAccount?.id;
      const accName = t.sourceAccount?.name || 'Account';
      if (accId) {
        map.set(accId, accName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions]);

  // Filter transactions by Category and Account
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const catId = t.categoryId || t.category?.id;
      const accId = t.sourceAccountId || t.sourceAccount?.id;
      const matchesCategory = selectedCategory === 'ALL' || catId === selectedCategory;
      const matchesAccount = selectedAccount === 'ALL' || accId === selectedAccount;
      return matchesCategory && matchesAccount;
    });
  }, [transactions, selectedCategory, selectedAccount]);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month dates for MoM comparison
  const prevMonthDate = new Date(year, month - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  const spendingByDay = new Map<number, number>();
  const incomeByDay = new Map<number, number>();
  const prevSpendingByDay = new Map<number, number>();

  filteredTransactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.transactionDate);
    const tYear = transactionDate.getFullYear();
    const tMonth = transactionDate.getMonth();
    const day = transactionDate.getDate();

    const isCurrentMonthTx = tYear === year && tMonth === month;
    const isPrevMonthTx = tYear === prevYear && tMonth === prevMonth;
    const isExpense = transaction.type === 'EXPENSE';
    const isIncome = transaction.type === 'INCOME';

    if (isCurrentMonthTx) {
      if (isExpense) {
        spendingByDay.set(day, (spendingByDay.get(day) || 0) + transaction.amount);
      }
      if (isIncome) {
        incomeByDay.set(day, (incomeByDay.get(day) || 0) + transaction.amount);
      }
    }

    if (isPrevMonthTx && isExpense) {
      prevSpendingByDay.set(day, (prevSpendingByDay.get(day) || 0) + transaction.amount);
    }
  });

  // Calculate totals and average for anomaly detection
  let currentMonthSpentTotal = 0;
  let activeDaysCount = 0;
  spendingByDay.forEach((amt) => {
    if (amt > 0) {
      currentMonthSpentTotal += amt;
      activeDaysCount += 1;
    }
  });
  const avgDailySpend = activeDaysCount > 0 ? currentMonthSpentTotal / activeDaysCount : 0;
  const spikeThreshold = Math.max(avgDailySpend * 1.8, 1200);

  // Weekday vs Weekend breakdown logic
  let weekdaySpendTotal = 0;
  let weekdayDaysCount = 0;
  let weekendSpendTotal = 0;
  let weekendDaysCount = 0;

  // Day of week distribution map (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const dowStats = Array.from({ length: 7 }, (_, i) => ({
    dow: i,
    label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
    totalSpend: 0,
    count: 0,
  }));

  const chartData: DailySpendingDatum[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const spending = Number((spendingByDay.get(day) || 0).toFixed(2));
    const income = Number((incomeByDay.get(day) || 0).toFixed(2));
    const netFlow = Number((income - spending).toFixed(2));
    const prevSpending = Number((prevSpendingByDay.get(day) || 0).toFixed(2));
    const isSpike = spending > 0 && spending >= spikeThreshold;

    const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });

    if (isWeekend) {
      weekendSpendTotal += spending;
      weekendDaysCount += 1;
    } else {
      weekdaySpendTotal += spending;
      weekdayDaysCount += 1;
    }

    dowStats[dayOfWeek].totalSpend += spending;
    dowStats[dayOfWeek].count += 1;

    const monthPadded = String(month + 1).padStart(2, '0');
    const dayPadded = String(day).padStart(2, '0');
    const isoDate = `${year}-${monthPadded}-${dayPadded}`;

    return {
      day,
      dayName,
      date: `${dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (${dayName})`,
      isoDate,
      spending,
      income,
      netFlow,
      prevSpending,
      isSpike,
    };
  });

  const totalSpent = chartData.reduce((total, item) => total + item.spending, 0);
  const totalIncome = chartData.reduce((total, item) => total + item.income, 0);
  const activeDays = chartData.filter((item) => item.spending > 0 || item.income > 0).length;
  const spikeDaysCount = chartData.filter((item) => item.isSpike).length;
  const highestSpend = Math.max(...chartData.map((item) => item.spending), 0);

  const avgWeekdaySpend = weekdayDaysCount > 0 ? Math.round(weekdaySpendTotal / weekdayDaysCount) : 0;
  const avgWeekendSpend = weekendDaysCount > 0 ? Math.round(weekendSpendTotal / weekendDaysCount) : 0;

  // Daily budget limit calculation
  const dailyBudgetLimit = activeDays > 0 ? Math.round(totalSpent / activeDays) : (totalSpent > 0 ? Math.round(totalSpent / daysInMonth) : 0);

  // Projected End-of-Month Spend Trajectory
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const daysPassed = isCurrentMonth ? Math.max(today.getDate(), 1) : daysInMonth;
  const projectedEOMSpend = Math.round((totalSpent / daysPassed) * daysInMonth);

  // Find day of week with highest average spend
  const peakDow = [...dowStats].sort((a, b) => (b.count ? b.totalSpend / b.count : 0) - (a.count ? a.totalSpend / a.count : 0))[0];
  const peakDowAvg = peakDow && peakDow.count > 0 ? Math.round(peakDow.totalSpend / peakDow.count) : 0;

  const selectedDateTransactions = selectedDay
    ? filteredTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.transactionDate);
        const isSelectedDate = transactionDate.getFullYear() === year && transactionDate.getMonth() === month && transactionDate.getDate() === selectedDay;
        const isIncomeOrExpense = ['EXPENSE', 'INCOME'].includes(transaction.type);
        return isSelectedDate && isIncomeOrExpense;
      })
    : [];

  const selectedDayDatum = selectedDay ? chartData.find((d) => d.day === selectedDay) : null;

  const changeMonth = (monthOffset: number) => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + monthOffset, 1));
    setSelectedDay(null);
  };

  const handleAddExpenseForDay = (dayNumber: number) => {
    const datum = chartData.find((d) => d.day === dayNumber);
    if (!datum) return;
    if (onAddTransactionForDate) {
      onAddTransactionForDate(datum.isoDate);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-sm">
      {/* Header with Title and Month Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-700/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Daily Spending Activity</h3>
            <p className="text-xs text-slate-400">Income, expenses, and daily velocity</p>
          </div>
        </div>
        <div className="flex items-center self-start rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-1 sm:self-auto">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-lg p-1.5 text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-xs font-semibold text-cyan-100">
            {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            className="rounded-lg p-1.5 text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters and Toggles Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="h-3.5 w-3.5 text-cyan-400" />
            <span>Filters:</span>
          </div>
          <ClearableSelect
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            defaultValue="ALL"
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </ClearableSelect>

          <ClearableSelect
            value={selectedAccount}
            onValueChange={setSelectedAccount}
            defaultValue="ALL"
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </ClearableSelect>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Feature 3: Net Cash Flow Toggle */}
          <button
            type="button"
            onClick={() => setShowNetFlow(!showNetFlow)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors ${
              showNetFlow
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Net Flow</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBudgetLine(!showBudgetLine)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors ${
              showBudgetLine
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Daily Limit</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrevMonth(!showPrevMonth)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors ${
              showPrevMonth
                ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>vs Prev Month</span>
          </button>

          {/* Feature 2 Toggle: Day-of-Week Heatmap */}
          <button
            type="button"
            onClick={() => setShowDistribution(!showDistribution)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors ${
              showDistribution
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Day Heatmap</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Includes Feature 1 Anomaly Badge & Feature 4 Projected EOM) */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <Metric label="Spent" value={formatCurrency(totalSpent)} color="text-rose-300" />
        <Metric label="Income" value={formatCurrency(totalIncome)} color="text-emerald-300" />
        <Metric label="Highest Day" value={formatCurrency(highestSpend)} color="text-amber-300" />
        <Metric label="Avg Weekday" value={formatCurrency(avgWeekdaySpend)} color="text-cyan-300" />
        <Metric label="Avg Weekend" value={formatCurrency(avgWeekendSpend)} color="text-indigo-300" />
        {/* Feature 4 Metric Card: Projected EOM Spend */}
        <Metric
          label="Projected EOM"
          value={formatCurrency(projectedEOMSpend)}
          color={projectedEOMSpend > (totalIncome || totalSpent * 1.1) ? 'text-amber-400' : 'text-slate-200'}
        />
      </div>

      {/* Anomaly / Spike Alert Banner (Feature 1) */}
      {spikeDaysCount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0 text-rose-400 fill-rose-400/20" />
            <span>
              <strong className="font-semibold text-rose-200">{spikeDaysCount} High-Spend Spike Day{spikeDaysCount > 1 ? 's' : ''}</strong> detected (spending exceeding {formatCurrency(Math.round(spikeThreshold))}).
            </span>
          </div>
          <span className="text-[11px] text-rose-400/80 hidden sm:inline">Click spike bars for breakdown</span>
        </div>
      )}

      {/* Feature 2: Day-of-Week Distribution Heatmap Card */}
      {showDistribution && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <BarChart2 className="h-4 w-4 text-cyan-400" />
              <span>Day-of-Week Spending Heatmap</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Peak day: <strong className="text-cyan-300">{peakDow?.label}s</strong> (avg {formatCurrency(peakDowAvg)})
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dowStats.map((d) => {
              const avgSpend = d.count > 0 ? Math.round(d.totalSpend / d.count) : 0;
              const maxAvg = Math.max(...dowStats.map((s) => (s.count ? s.totalSpend / s.count : 0)), 1);
              const pct = Math.min(100, Math.round((avgSpend / maxAvg) * 100));

              return (
                <div key={d.dow} className="flex flex-col items-center rounded-lg border border-slate-700/40 bg-slate-950/40 p-2">
                  <span className="text-[10px] font-semibold text-slate-400">{d.label}</span>
                  <div className="my-2 flex h-16 w-full items-end justify-center rounded bg-slate-800/50 p-1">
                    <div
                      style={{ height: `${Math.max(pct, 8)}%` }}
                      className={`w-full rounded-sm transition-all ${
                        d.label === peakDow?.label ? 'bg-cyan-400' : 'bg-rose-400/80'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-200">{formatCompactCurrency(avgSpend)}</span>
                  <span className="text-[9px] text-slate-500">avg</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="mt-5 h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            barCategoryGap="12%"
            barGap={1}
            className="cursor-pointer"
            onClick={(state) => {
              if (state && state.activeLabel !== undefined) {
                setSelectedDay(Number(state.activeLabel));
              }
            }}
          >
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              tickFormatter={(dayNum) => {
                const item = chartData.find((d) => d.day === Number(dayNum));
                return item ? `${item.day} ${item.dayName}` : `${dayNum}`;
              }}
              interval={Math.max(0, Math.ceil(daysInMonth / 8) - 1)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              tickFormatter={formatCompactCurrency}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              cursor={{ fill: '#334155', opacity: 0.35 }}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.day === Number(label));
                return item ? `${item.date} ${item.isSpike ? '⚡ High Spike' : ''}` : '';
              }}
              formatter={(value: number, name: string) => {
                const labelName =
                  name === 'income'
                    ? 'Income'
                    : name === 'spending'
                    ? 'Spent'
                    : name === 'netFlow'
                    ? 'Net Cash Flow'
                    : name === 'prevSpending'
                    ? 'Prev Month Spent'
                    : name;
                return [formatCurrency(Number(value)), labelName];
              }}
            />
            {/* Feature 1: Daily Budget Velocity Limit Reference Line */}
            {showBudgetLine && dailyBudgetLimit > 0 && (
              <ReferenceLine
                y={dailyBudgetLimit}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `Limit: ${formatCompactCurrency(dailyBudgetLimit)}`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
              />
            )}
            <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={24} shape={<VisibleBarShape />} />
            <Bar dataKey="spending" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={24} shape={<VisibleBarShape />} />
            {/* Feature 3: Net Flow Trend Line */}
            {showNetFlow && (
              <Line type="monotone" dataKey="netFlow" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} />
            )}
            {/* MoM Line */}
            {showPrevMonth && (
              <Line type="monotone" dataKey="prevSpending" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />Income</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" />Spent</span>
        {showNetFlow && (
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-emerald-400" />Net Cash Flow</span>
        )}
        {showBudgetLine && (
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-amber-400 border border-dashed border-amber-400" />Daily Limit ({formatCompactCurrency(dailyBudgetLimit)})</span>
        )}
        {showPrevMonth && (
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-purple-400 border border-dashed border-purple-400" />Prev Month</span>
        )}
        <span className="text-slate-500">{activeDays} active days. Select a bar for details.</span>
      </div>

      {/* Selected Day Details Panel + Feature 5 Quick Action */}
      {selectedDay && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-slate-200">
                Activity on {new Date(year, month, selectedDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h4>
              {selectedDayDatum?.isSpike && (
                <span className="flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                  <Zap className="h-3 w-3 text-rose-400" />
                  Spike Day
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Feature 5: Instant "+ Add Expense for This Day" Quick Action */}
              {onAddTransactionForDate && (
                <button
                  type="button"
                  onClick={() => handleAddExpenseForDay(selectedDay)}
                  className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/25 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Expense</span>
                </button>
              )}
              <button type="button" onClick={() => setSelectedDay(null)} className="text-xs text-slate-400 hover:text-white">Clear</button>
            </div>
          </div>

          {selectedDateTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <p className="text-xs text-slate-500">No income or expense was recorded on this day.</p>
              {onAddTransactionForDate && (
                <button
                  type="button"
                  onClick={() => handleAddExpenseForDay(selectedDay)}
                  className="mt-2 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Transaction for {new Date(year, month, selectedDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {selectedDateTransactions.map((transaction) => {
                const isIncome = transaction.type === 'INCOME';
                return (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      {isIncome ? <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 shrink-0 text-rose-400" />}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-200">{transaction.merchant || transaction.description || transaction.category?.name || 'Transaction'}</p>
                        <p className="truncate text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>{transaction.category?.name || (isIncome ? 'Income' : 'Expense')}</span>
                          {(transaction.subcategory || transaction.itemTag) && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-semibold">
                              {transaction.subcategory ? transaction.subcategory.name.replace(/^.*?>\s*/, '') : transaction.itemTag}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Metric = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2">
    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    <span className={`mt-0.5 block truncate text-sm font-bold ${color}`}>{value}</span>
  </div>
);
