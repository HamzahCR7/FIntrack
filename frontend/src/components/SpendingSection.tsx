import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatCurrency } from './SummaryCards';
import { usePrivacyMode } from '../utils/privacyStore';
import {
  CreditCard,
  Landmark,
  Wallet,
  Smartphone,
  PieChart as PieIcon,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Calendar,
  ExternalLink,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Transaction } from '../types';
import { SpendingDetailsModal } from './SpendingDetailsModal';

interface SpendingSectionProps {
  spendingThisMonth: number;
  spendingByCategory: Array<{
    id: string;
    name: string;
    icon?: string;
    color?: string;
    amount: number;
    percentage: number;
  }>;
  spendingByPaymentMethod: Array<{
    paymentMethod: string;
    amount: number;
    percentage: number;
  }>;
  totalIncome: number;
  totalExpenses: number;
  incomeThisMonth?: number;
  savingsThisMonth?: number;
  monthlyTrends?: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  transactions?: Transaction[];
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

const paymentMethodIcons: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  BANK_TRANSFER: { label: 'Bank Account', icon: <Landmark className="w-4 h-4 text-blue-400" />, color: '#3b82f6' },
  CREDIT_CARD: { label: 'Credit Card', icon: <CreditCard className="w-4 h-4 text-purple-400" />, color: '#8b5cf6' },
  CASH: { label: 'Cash', icon: <Wallet className="w-4 h-4 text-emerald-400" />, color: '#10b981' },
  UPI: { label: 'UPI Wallet', icon: <Smartphone className="w-4 h-4 text-amber-400" />, color: '#f59e0b' },
};

export const SpendingSection: React.FC<SpendingSectionProps> = ({
  spendingThisMonth,
  spendingByCategory: initialSpendingByCategory,
  spendingByPaymentMethod: initialSpendingByPaymentMethod,
  totalIncome,
  totalExpenses,
  incomeThisMonth,
  savingsThisMonth,
  monthlyTrends = [],
  transactions = [],
}) => {
  usePrivacyMode();

  // Selected Month State (Default to current month)
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [isAllTime, setIsAllTime] = useState<boolean>(false);

  const [activeModal, setActiveModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'paymentMethod' | null;
    selectedCategory?: any;
    selectedPaymentMethod?: string | null;
  }>({
    isOpen: false,
    type: null,
    selectedCategory: null,
    selectedPaymentMethod: null,
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const selYear = selectedMonth.getFullYear();
  const selMonth = selectedMonth.getMonth();

  const isCurrentMonthSelected = !isAllTime && selYear === currentYear && selMonth === currentMonth;
  const isPreviousMonthSelected =
    !isAllTime &&
    ((currentMonth === 0 && selMonth === 11 && selYear === currentYear - 1) ||
      (selYear === currentYear && selMonth === currentMonth - 1));

  const periodLabel = isAllTime
    ? 'All Time'
    : selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter transactions according to selected month
  const periodTransactions = useMemo(() => {
    if (isAllTime) return transactions;
    return transactions.filter((tx) => {
      const txDate = new Date(tx.transactionDate);
      return txDate.getFullYear() === selYear && txDate.getMonth() === selMonth;
    });
  }, [transactions, isAllTime, selYear, selMonth]);

  // Compute category breakdown for the selected period
  const computedCategorySpending = useMemo(() => {
    if (periodTransactions.length === 0 && isCurrentMonthSelected && initialSpendingByCategory.length > 0) {
      return initialSpendingByCategory;
    }

    const expenses = periodTransactions.filter((tx) => tx.type === 'EXPENSE');
    const periodTotalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0);

    const catMap: Record<string, { id: string; name: string; icon?: string; color?: string; amount: number }> = {};
    expenses.forEach((tx) => {
      const catId = tx.categoryId || 'uncategorized';
      const catName = tx.category?.name || 'Uncategorized';
      const icon = tx.category?.icon || 'tag';
      const color = tx.category?.color || '#94A3B8';

      if (!catMap[catId]) {
        catMap[catId] = { id: catId, name: catName, icon, color, amount: 0 };
      }
      catMap[catId].amount += tx.amount;
    });

    return Object.values(catMap)
      .map((cat, idx) => ({
        ...cat,
        color: cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        amount: Number(cat.amount.toFixed(2)),
        percentage: periodTotalExpense > 0 ? Number(((cat.amount / periodTotalExpense) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, isCurrentMonthSelected, initialSpendingByCategory]);

  // Compute payment method breakdown for the selected period
  const computedPaymentMethodSpending = useMemo(() => {
    if (periodTransactions.length === 0 && isCurrentMonthSelected && initialSpendingByPaymentMethod.length > 0) {
      return initialSpendingByPaymentMethod;
    }

    const expenses = periodTransactions.filter((tx) => tx.type === 'EXPENSE');
    const periodTotalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0);

    const payMap: Record<string, number> = {
      BANK_TRANSFER: 0,
      CREDIT_CARD: 0,
      CASH: 0,
      UPI: 0,
    };

    expenses.forEach((tx) => {
      const method = tx.paymentMethod || 'BANK_TRANSFER';
      payMap[method] = (payMap[method] || 0) + tx.amount;
    });

    return Object.entries(payMap)
      .map(([method, amount]) => ({
        paymentMethod: method,
        amount: Number(amount.toFixed(2)),
        percentage: periodTotalExpense > 0 ? Number(((amount / periodTotalExpense) * 100).toFixed(1)) : 0,
      }))
      .filter((item) => item.amount > 0 || isCurrentMonthSelected);
  }, [periodTransactions, isCurrentMonthSelected, initialSpendingByPaymentMethod]);

  // Compute Income vs Expenses for the selected period
  const { periodIncome, periodExpenses } = useMemo(() => {
    if (isAllTime) {
      return { periodIncome: totalIncome, periodExpenses: totalExpenses };
    }
    if (isCurrentMonthSelected && incomeThisMonth !== undefined && spendingThisMonth !== undefined) {
      const inc = periodTransactions.filter((tx) => tx.type === 'INCOME').reduce((s, tx) => s + tx.amount, 0);
      const exp = periodTransactions.filter((tx) => tx.type === 'EXPENSE').reduce((s, tx) => s + tx.amount, 0);
      return {
        periodIncome: inc > 0 ? inc : incomeThisMonth,
        periodExpenses: exp > 0 ? exp : spendingThisMonth,
      };
    }
    const inc = periodTransactions.filter((tx) => tx.type === 'INCOME').reduce((s, tx) => s + tx.amount, 0);
    const exp = periodTransactions.filter((tx) => tx.type === 'EXPENSE').reduce((s, tx) => s + tx.amount, 0);
    return {
      periodIncome: Number(inc.toFixed(2)),
      periodExpenses: Number(exp.toFixed(2)),
    };
  }, [isAllTime, isCurrentMonthSelected, periodTransactions, totalIncome, totalExpenses, incomeThisMonth, spendingThisMonth]);

  const periodSavings = periodIncome - periodExpenses;

  const comparisonData = [
    { name: isAllTime ? 'All-Time' : selectedMonth.toLocaleString('default', { month: 'short', year: '2-digit' }), Income: periodIncome, Expense: periodExpenses },
  ];

  const handleCategoryClick = (category: any) => {
    if (!category) return;
    setActiveModal({
      isOpen: true,
      type: 'category',
      selectedCategory: category,
      selectedPaymentMethod: null,
    });
  };

  const handlePaymentMethodClick = (paymentMethod: string, percentage?: number) => {
    setActiveModal({
      isOpen: true,
      type: 'paymentMethod',
      selectedCategory: { percentage: percentage || 0 },
      selectedPaymentMethod: paymentMethod,
    });
  };

  const closeModal = () => {
    setActiveModal({
      isOpen: false,
      type: null,
      selectedCategory: null,
      selectedPaymentMethod: null,
    });
  };

  const changeMonth = (monthOffset: number) => {
    setIsAllTime(false);
    setSelectedMonth((curr) => new Date(curr.getFullYear(), curr.getMonth() + monthOffset, 1));
  };

  const selectCurrentMonth = () => {
    setIsAllTime(false);
    setSelectedMonth(new Date(currentYear, currentMonth, 1));
  };

  const selectPreviousMonth = () => {
    setIsAllTime(false);
    setSelectedMonth(new Date(currentYear, currentMonth - 1, 1));
  };

  const selectAllTime = () => {
    setIsAllTime(true);
  };

  return (
    <div className="space-y-4">
      {/* 0. Period Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-700/60 rounded-2xl">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-300 font-semibold">Viewing Period:</span>
          <span className="text-xs font-bold text-white px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            {periodLabel}
          </span>
          {isCurrentMonthSelected && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium">
              Current Month (Default)
            </span>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Filter Buttons */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={selectCurrentMonth}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                isCurrentMonthSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={selectPreviousMonth}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                isPreviousMonthSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Previous Month
            </button>
            <button
              type="button"
              onClick={selectAllTime}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                isAllTime
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Stepper Buttons for navigating any past month */}
          <div className="flex items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-lg p-1 text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[6.5rem] text-center text-xs font-semibold text-cyan-100">
              {isAllTime ? 'All Time' : selectedMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              disabled={isCurrentMonthSelected || isAllTime}
              className="rounded-lg p-1 text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Spending by Category (Pie Chart) */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-slate-600/60 transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-base font-semibold text-white">Spending by Category</h3>
                <span className="text-[11px] text-slate-400">{periodLabel}</span>
              </div>
            </div>
            <span className="text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-lg font-medium flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Click for details
            </span>
          </div>

          {computedCategorySpending.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
              No expenses recorded for {periodLabel}.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 items-center">
              <div className="h-56 cursor-pointer" title="Click slice for details">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={computedCategorySpending}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="amount"
                      onClick={(entry) => handleCategoryClick(entry)}
                      className="cursor-pointer"
                    >
                      {computedCategorySpending.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      formatter={(val: number) => formatCurrency(val)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {computedCategorySpending.map((cat, idx) => (
                  <div
                    key={cat.id || idx}
                    onClick={() => handleCategoryClick(cat)}
                    className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-700/60 cursor-pointer transition-all border border-transparent hover:border-slate-600/50 group"
                    title={`Click to view details for ${cat.name}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                        style={{ backgroundColor: cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length] }}
                      />
                      <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 group-hover:text-slate-300">{cat.percentage}%</span>
                      <span className="text-white font-semibold">{formatCurrency(cat.amount)}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Spending by Payment Method */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-slate-600/60 transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-base font-semibold text-white">Payment Method</h3>
                <span className="text-[11px] text-slate-400">{periodLabel}</span>
              </div>
            </div>
            <span className="text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg font-medium flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Click for details
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {computedPaymentMethodSpending.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No payment records for {periodLabel}.</p>
            ) : (
              computedPaymentMethodSpending.map((item) => {
                const config = paymentMethodIcons[item.paymentMethod] || {
                  label: item.paymentMethod,
                  icon: <Wallet className="w-4 h-4 text-slate-400" />,
                  color: '#94a3b8',
                };
                return (
                  <div
                    key={item.paymentMethod}
                    onClick={() => handlePaymentMethodClick(item.paymentMethod, item.percentage)}
                    className="space-y-1.5 p-2 rounded-xl hover:bg-slate-700/60 cursor-pointer transition-all border border-transparent hover:border-slate-600/50 group"
                    title={`Click to view details for ${config.label}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span className="text-slate-200 font-medium group-hover:text-white transition-colors">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 group-hover:text-slate-300">{item.percentage}%</span>
                        <span className="text-white font-semibold">{formatCurrency(item.amount)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                        style={{ width: `${Math.min(100, item.percentage)}%`, backgroundColor: config.color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
            <span>Primary channel ({periodLabel}):</span>
            <span className="font-semibold text-slate-200">
              {computedPaymentMethodSpending.length > 0
                ? paymentMethodIcons[computedPaymentMethodSpending[0].paymentMethod]?.label || 'None'
                : 'None'}
            </span>
          </div>
        </div>

        {/* 3. Income vs Expenses Comparison */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
            <div>
              <h3 className="text-base font-semibold text-white">Income vs Expenses</h3>
              <span className="text-xs text-slate-400">{periodLabel}</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
              periodSavings >= 0
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}>
              {periodSavings >= 0 ? `+${formatCurrency(periodSavings)} Saved` : `-${formatCurrency(Math.abs(periodSavings))} Deficit`}
            </span>
          </div>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                <Bar dataKey="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-xs text-emerald-400 font-medium">Income Ratio</span>
              <p className="text-sm font-bold text-emerald-300 mt-0.5">
                {periodIncome + periodExpenses > 0
                  ? `${((periodIncome / (periodIncome + periodExpenses)) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <span className="text-xs text-rose-400 font-medium">Expense Ratio</span>
              <p className="text-sm font-bold text-rose-300 mt-0.5">
                {periodIncome + periodExpenses > 0
                  ? `${((periodExpenses / (periodIncome + periodExpenses)) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Drill-Down Details Modal */}
      <SpendingDetailsModal
        isOpen={activeModal.isOpen}
        onClose={closeModal}
        type={activeModal.type}
        selectedCategory={activeModal.selectedCategory}
        selectedPaymentMethod={activeModal.selectedPaymentMethod}
        transactions={periodTransactions}
        periodLabel={periodLabel}
      />
    </div>
  );
};
