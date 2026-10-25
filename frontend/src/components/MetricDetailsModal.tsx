import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Gift,
  CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Transaction } from '../types';
import { formatCurrency, usePrivacyMode } from '../utils/privacyStore';

export type MetricType = 'INCOME' | 'EXPENSE' | 'SAVINGS' | 'POCKET' | 'CREDIT';

type TrendSortKey = 'month' | 'income' | 'expenses' | 'savings' | 'rate';
type TxSortKey = 'date' | 'category' | 'details' | 'account' | 'amount';
type SortDirection = 'asc' | 'desc';

interface MetricDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: MetricType | null;
  summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    savings: number;
    creditOutstanding: number;
    spendingThisMonth: number;
    incomeThisMonth: number;
    savingsThisMonth: number;
    previousMonthSavings?: number;
    previousMonthIncome?: number;
    previousMonthExpenses?: number;
    pocketAllowanceBalance: number;
    pocketAllowanceThisMonth: number;
  };
  monthlyTrends?: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  transactions?: Transaction[];
}

export const MetricDetailsModal: React.FC<MetricDetailsModalProps> = ({
  isOpen,
  onClose,
  type,
  summary,
  monthlyTrends = [],
  transactions = [],
}) => {
  usePrivacyMode();
  const activeType: MetricType = type ?? 'EXPENSE';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [trendSortKey, setTrendSortKey] = useState<TrendSortKey>('month');
  const [trendSortDirection, setTrendSortDirection] = useState<SortDirection>('desc');
  const [txSortKey, setTxSortKey] = useState<TxSortKey>('date');
  const [txSortDirection, setTxSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const isPocketTransaction = (tx: Transaction) => /pockets?/.test(
    `${tx.sourceAccount?.name || ''} ${tx.sourceAccount?.institution || ''} ${tx.destinationAccount?.name || ''} ${tx.destinationAccount?.institution || ''}`.toLowerCase()
  );
  const isPocketCredit = (tx: Transaction) => /pockets?/.test(
    `${tx.destinationAccount?.name || ''} ${tx.destinationAccount?.institution || ''}`.toLowerCase()
  );
  const previousPocketAllowance = transactions.reduce((total, tx) => {
    const date = new Date(tx.transactionDate);
    return tx.type === 'INCOME' && isPocketCredit(tx)
      && date.getFullYear() === prevMonthDate.getFullYear()
      && date.getMonth() === prevMonthDate.getMonth()
      ? total + tx.amount
      : total;
  }, 0);
  const allTimePocketAllowance = transactions.reduce(
    (total, tx) => tx.type === 'INCOME' && isPocketCredit(tx) ? total + tx.amount : total,
    0
  );
  const isCreditCardAccount = (account: Transaction['sourceAccount']) => account?.type === 'CREDIT_CARD';
  const isCreditCardPurchase = (tx: Transaction) => tx.type === 'EXPENSE'
    && (isCreditCardAccount(tx.sourceAccount) || tx.paymentMethod === 'CREDIT_CARD');
  const isCreditCardPayment = (tx: Transaction) => tx.type === 'TRANSFER' && isCreditCardAccount(tx.destinationAccount);
  const isCreditCardTransaction = (tx: Transaction) => isCreditCardPurchase(tx) || isCreditCardPayment(tx);
  const cardSpendingForMonth = (date: Date) => transactions.reduce((total, tx) => {
    const txDate = new Date(tx.transactionDate);
    return isCreditCardPurchase(tx)
      && txDate.getFullYear() === date.getFullYear()
      && txDate.getMonth() === date.getMonth()
      ? total + tx.amount
      : total;
  }, 0);
  const currentCardSpending = cardSpendingForMonth(new Date());
  const previousCardSpending = cardSpendingForMonth(prevMonthDate);

  // Config based on metric type
  const config = {
    INCOME: {
      title: 'Monthly Income Breakdown & History',
      subtitle: `Detailed view for ${currentMonthName} vs previous months`,
      currentValue: summary.incomeThisMonth,
      prevValue: summary.previousMonthIncome || 0,
      totalValue: summary.totalIncome,
      currentLabel: 'This Month Income',
      prevLabel: 'Prev Month Income',
      allTimeLabel: 'All-Time Total Income',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      themeColor: '#10b981',
      icon: <TrendingUp className="w-6 h-6 text-emerald-400" />,
      txType: 'INCOME' as const,
      chartDataKey: 'income',
    },
    EXPENSE: {
      title: 'Monthly Expenses Breakdown & History',
      subtitle: `Detailed view for ${currentMonthName} vs previous months`,
      currentValue: summary.spendingThisMonth,
      prevValue: summary.previousMonthExpenses || 0,
      totalValue: summary.totalExpenses,
      currentLabel: 'This Month Spending',
      prevLabel: 'Prev Month Spending',
      allTimeLabel: 'All-Time Total Expenses',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      themeColor: '#f43f5e',
      icon: <TrendingDown className="w-6 h-6 text-rose-400" />,
      txType: 'EXPENSE' as const,
      chartDataKey: 'expenses',
    },
    SAVINGS: {
      title: 'Net Savings Breakdown & History',
      subtitle: `Detailed view for ${currentMonthName} vs previous months`,
      currentValue: summary.savingsThisMonth,
      prevValue: summary.previousMonthSavings || 0,
      totalValue: summary.savings,
      currentLabel: 'This Month Net Savings',
      prevLabel: 'Prev Month Net Savings',
      allTimeLabel: 'All-Time Net Savings',
      badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      themeColor: '#6366f1',
      icon: <PiggyBank className="w-6 h-6 text-indigo-400" />,
      txType: null,
      chartDataKey: 'savings',
    },
    POCKET: {
      title: 'Pocket App History',
      subtitle: `Pocket App activity for ${currentMonthName} and previous months`,
      currentValue: summary.pocketAllowanceThisMonth,
      prevValue: previousPocketAllowance,
      totalValue: allTimePocketAllowance,
      currentLabel: 'Received This Month',
      prevLabel: 'Received Prev Month',
      allTimeLabel: 'All-Time Allowance Received',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      themeColor: '#f59e0b',
      icon: <Gift className="w-6 h-6 text-amber-400" />,
      txType: null,
      chartDataKey: 'income',
    },
    CREDIT: {
      title: 'Credit Card Outstanding & History',
      subtitle: `Card purchases and payments for ${currentMonthName} and previous months`,
      currentValue: currentCardSpending,
      prevValue: previousCardSpending,
      totalValue: summary.creditOutstanding,
      currentLabel: 'Card Spend This Month',
      prevLabel: 'Card Spend Prev Month',
      allTimeLabel: 'Current Outstanding',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      themeColor: '#f59e0b',
      icon: <CreditCard className="w-6 h-6 text-amber-400" />,
      txType: null,
      chartDataKey: 'expenses',
    },
  }[activeType];

  // Month-over-month calculation
  const momDiff = config.currentValue - config.prevValue;
  const momPercent = config.prevValue !== 0
    ? ((momDiff / Math.abs(config.prevValue)) * 100).toFixed(1)
    : config.currentValue > 0 ? '100' : '0';

  // Savings rate
  const currentSavingsRate = summary.incomeThisMonth > 0
    ? ((summary.savingsThisMonth / summary.incomeThisMonth) * 100).toFixed(1)
    : '0';

  // Filter transactions
  const matchingTransactions = transactions.filter((tx) => {
    if (activeType === 'CREDIT') return isCreditCardTransaction(tx);
    if (activeType === 'POCKET') return isPocketTransaction(tx);
    if (activeType === 'INCOME') return tx.type === 'INCOME' && !tx.isDebtPayment;
    if (activeType === 'EXPENSE') return tx.type === 'EXPENSE' && !tx.isDebtPayment;
    return (tx.type === 'INCOME' || tx.type === 'EXPENSE') && !tx.isDebtPayment;
  });

  const transactionMonths = Array.from(new Set(
    matchingTransactions.map((tx) => {
      const date = new Date(tx.transactionDate);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort().reverse();

  useEffect(() => {
    if (!isOpen) return;
    const today = new Date();
    setSelectedHistoryMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    setSearchTerm('');
  }, [isOpen, type]);

  const filteredTransactions = matchingTransactions.filter((tx) => {
    const date = new Date(tx.transactionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (selectedHistoryMonth !== 'ALL' && monthKey !== selectedHistoryMonth) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const desc = (tx.description || '').toLowerCase();
    const merchant = (tx.merchant || '').toLowerCase();
    const cat = (tx.category?.name || '').toLowerCase();
    const srcAcc = (tx.sourceAccount?.name || '').toLowerCase();
    const dstAcc = (tx.destinationAccount?.name || '').toLowerCase();

    return desc.includes(term) || merchant.includes(term) || cat.includes(term) || srcAcc.includes(term) || dstAcc.includes(term);
  });

  const monthToTime = (label: string) => {
    const parsed = Date.parse(`${label} 1`);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const pocketMonthlyTrends = useMemo(() => {
    const totals = new Map<string, { month: string; income: number; expenses: number; savings: number }>();
    matchingTransactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const item = totals.get(key) || {
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income: 0,
        expenses: 0,
        savings: 0,
      };
      if (isPocketCredit(tx)) item.income += tx.amount;
      else item.expenses += tx.amount;
      item.savings = item.income - item.expenses;
      totals.set(key, item);
    });
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [transactions, activeType]);
  const transactionMonthlyTrends = useMemo(() => {
    const totals = new Map<string, { month: string; income: number; expenses: number; savings: number }>();
    transactions.forEach((tx) => {
      if (tx.type !== 'INCOME' && tx.type !== 'EXPENSE') return;
      const date = new Date(tx.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const item = totals.get(key) || {
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income: 0,
        expenses: 0,
        savings: 0,
      };
      const isReturnedPersonalDebt = tx.description?.startsWith('Returned money / Debt settlement from ');
      const isLentPersonalDebt = tx.description?.startsWith('Lent money to ');
      if (tx.type === 'INCOME' && !isReturnedPersonalDebt) item.income += tx.amount;
      else if (tx.type === 'EXPENSE' && !isLentPersonalDebt) item.expenses += tx.amount;
      item.savings = item.income - item.expenses;
      totals.set(key, item);
    });
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [transactions]);
  const creditCardMonthlyTrends = useMemo(() => {
    const totals = new Map<string, { month: string; income: number; expenses: number; savings: number }>();
    matchingTransactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const item = totals.get(key) || {
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income: 0,
        expenses: 0,
        savings: 0,
      };
      if (isCreditCardPayment(tx)) item.income += tx.amount;
      if (isCreditCardPurchase(tx)) item.expenses += tx.amount;
      item.savings = item.income - item.expenses;
      totals.set(key, item);
    });
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [transactions, activeType]);
  const currentMonthLabel = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
  const savingsMonthlyTrends = transactionMonthlyTrends.map((trend) => {
    return trend.month === currentMonthLabel
      ? { ...trend, savings: summary.savingsThisMonth, expenses: trend.income - summary.savingsThisMonth }
      : trend;
  });
  const historyTrends = activeType === 'POCKET'
    ? pocketMonthlyTrends
    : activeType === 'CREDIT'
      ? creditCardMonthlyTrends
      : activeType === 'SAVINGS'
        ? savingsMonthlyTrends
        : transactionMonthlyTrends.length > 0 ? transactionMonthlyTrends : monthlyTrends;

  const sortedMonthlyTrends = useMemo(() => {
    const sorted = [...historyTrends].reverse();
    sorted.sort((a, b) => {
      const rateA = a.income > 0 ? (a.savings / a.income) * 100 : 0;
      const rateB = b.income > 0 ? (b.savings / b.income) * 100 : 0;

      let compareValue = 0;
      if (trendSortKey === 'month') {
        compareValue = monthToTime(a.month) - monthToTime(b.month);
      } else if (trendSortKey === 'income') {
        compareValue = a.income - b.income;
      } else if (trendSortKey === 'expenses') {
        compareValue = a.expenses - b.expenses;
      } else if (trendSortKey === 'savings') {
        compareValue = a.savings - b.savings;
      } else {
        compareValue = rateA - rateB;
      }

      return trendSortDirection === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  }, [historyTrends, trendSortDirection, trendSortKey]);

  const sortedFilteredTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      const categoryA = (a.category?.name || '').toLowerCase();
      const categoryB = (b.category?.name || '').toLowerCase();
      const detailsA = (a.merchant || a.description || '').toLowerCase();
      const detailsB = (b.merchant || b.description || '').toLowerCase();
      const accountA = `${a.sourceAccount?.name || ''} ${a.destinationAccount?.name || ''}`.toLowerCase();
      const accountB = `${b.sourceAccount?.name || ''} ${b.destinationAccount?.name || ''}`.toLowerCase();

      let compareValue = 0;
      if (txSortKey === 'date') {
        compareValue = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      } else if (txSortKey === 'amount') {
        compareValue = a.amount - b.amount;
      } else if (txSortKey === 'category') {
        compareValue = categoryA.localeCompare(categoryB);
      } else if (txSortKey === 'details') {
        compareValue = detailsA.localeCompare(detailsB);
      } else {
        compareValue = accountA.localeCompare(accountB);
      }

      return txSortDirection === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  }, [filteredTransactions, txSortDirection, txSortKey]);

  const toggleTrendSort = (nextKey: TrendSortKey) => {
    if (trendSortKey === nextKey) {
      setTrendSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setTrendSortKey(nextKey);
    setTrendSortDirection(nextKey === 'month' ? 'desc' : 'asc');
  };

  const toggleTxSort = (nextKey: TxSortKey) => {
    if (txSortKey === nextKey) {
      setTxSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setTxSortKey(nextKey);
    setTxSortDirection(nextKey === 'date' || nextKey === 'amount' ? 'desc' : 'asc');
  };

  const sortIndicator = (isActive: boolean, direction: SortDirection) => {
    if (!isActive) {
      return '↕';
    }
    return direction === 'asc' ? '↑' : '↓';
  };

  const trendTotals = sortedMonthlyTrends.reduce(
    (acc, item) => {
      return {
        income: acc.income + item.income,
        expenses: acc.expenses + item.expenses,
        savings: acc.savings + item.savings,
      };
    },
    { income: 0, expenses: 0, savings: 0 }
  );
  const latestTrackedMonth = [...historyTrends].reverse()[0]?.month;

  const txIncomeTotal = sortedFilteredTransactions.reduce(
    (sum, tx) => (activeType === 'CREDIT' ? isCreditCardPayment(tx) : tx.type === 'INCOME' && !tx.isDebtPayment) ? sum + tx.amount : sum,
    0
  );
  const txExpenseTotal = sortedFilteredTransactions.reduce(
    (sum, tx) => (activeType === 'CREDIT' ? isCreditCardPurchase(tx) : tx.type === 'EXPENSE' && !tx.isDebtPayment) ? sum + tx.amount : sum,
    0
  );

  if (!isOpen || !type) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center shadow-inner">
              {config.icon}
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {config.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{config.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* 1. Metric Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Current Month */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                  {config.currentLabel}
                </span>
                <span className="text-[10px] text-blue-400 font-medium">({currentMonthName})</span>
              </div>
              <p className="text-xl font-bold text-white mt-2">
                {formatCurrency(config.currentValue)}
              </p>
            </div>

            {/* Previous Month */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                  {config.prevLabel}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">({prevMonthName})</span>
              </div>
              <p className="text-xl font-bold text-slate-200 mt-2">
                {formatCurrency(config.prevValue)}
              </p>
            </div>

            {/* MoM Change */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Month-over-Month Change
                </span>
                <span className="text-[10px] text-slate-400 font-medium">vs {prevMonthName}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {momDiff >= 0 ? (
                  <ArrowUpRight className={`w-5 h-5 ${activeType === 'EXPENSE' ? 'text-rose-400' : 'text-emerald-400'}`} />
                ) : (
                  <ArrowDownRight className={`w-5 h-5 ${activeType === 'EXPENSE' ? 'text-emerald-400' : 'text-rose-400'}`} />
                )}
                <span className={`text-base font-bold ${
                  activeType === 'EXPENSE'
                    ? momDiff > 0 ? 'text-rose-400' : 'text-emerald-400'
                    : momDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {momDiff >= 0 ? `+${formatCurrency(momDiff)}` : `-${formatCurrency(Math.abs(momDiff))}`}
                  <span className="text-xs font-normal ml-1">({momPercent}%)</span>
                </span>
              </div>
            </div>

            {/* All Time Total or Savings Rate */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                  {activeType === 'SAVINGS' ? 'Savings Rate' : config.allTimeLabel}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {activeType === 'SAVINGS' ? `${currentMonthName}` : activeType === 'CREDIT' ? 'Across active cards' : 'Lifetime Total'}
                </span>
              </div>
              <p className="text-xl font-bold text-slate-200 mt-2">
                {activeType === 'SAVINGS' ? `${currentSavingsRate}% of income` : formatCurrency(config.totalValue)}
              </p>
            </div>
          </div>

          {/* 2. Monthly Trends Visualization */}
          {historyTrends.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/60 p-3 sm:p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Monthly History</h3>
                </div>
                <span className="text-[11px] text-slate-400">Current & Previous Months</span>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  {type === 'SAVINGS' ? (
                    <AreaChart data={historyTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                        formatter={(val: number) => formatCurrency(val)}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="savings" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#savingsGrad)" name="Net Savings" />
                    </AreaChart>
                  ) : (
                    <BarChart data={historyTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                        formatter={(val: number) => formatCurrency(val)}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                      <Bar
                        dataKey={activeType === 'INCOME' || activeType === 'POCKET' ? 'income' : 'expenses'}
                        fill={config.themeColor}
                        name={activeType === 'POCKET' ? 'Pocket Allowance Received' : activeType === 'INCOME' ? 'Monthly Income' : activeType === 'CREDIT' ? 'Card Purchases' : 'Monthly Expenses'}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Month-by-month Table */}
              <div className="border border-slate-700/60 rounded-xl overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-slate-800/80 border-b border-slate-700/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTrendSort('month')} className="flex items-center gap-1 hover:text-cyan-300">
                          Month <span className="text-[10px]">{sortIndicator(trendSortKey === 'month', trendSortDirection)}</span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTrendSort('income')} className="flex items-center gap-1 hover:text-cyan-300">
                          {activeType === 'CREDIT' ? 'Payments' : 'Income'} <span className="text-[10px]">{sortIndicator(trendSortKey === 'income', trendSortDirection)}</span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTrendSort('expenses')} className="flex items-center gap-1 hover:text-cyan-300">
                          {activeType === 'CREDIT' ? 'Purchases' : 'Expenses'} <span className="text-[10px]">{sortIndicator(trendSortKey === 'expenses', trendSortDirection)}</span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTrendSort('savings')} className="flex items-center gap-1 hover:text-cyan-300">
                          Net Savings <span className="text-[10px]">{sortIndicator(trendSortKey === 'savings', trendSortDirection)}</span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTrendSort('rate')} className="flex items-center gap-1 hover:text-cyan-300">
                          Savings Rate <span className="text-[10px]">{sortIndicator(trendSortKey === 'rate', trendSortDirection)}</span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedMonthlyTrends.map((item) => {
                      const rate = item.income > 0 ? ((item.savings / item.income) * 100).toFixed(1) : '0';
                      const isCurrent = item.month === latestTrackedMonth;
                      return (
                        <tr key={item.month} className={`hover:bg-slate-800/40 transition-colors ${isCurrent ? 'bg-blue-500/5' : ''}`}>
                          <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
                            {item.month}
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-normal">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-medium">{formatCurrency(item.income)}</td>
                          <td className="py-2.5 px-3 text-rose-400 font-medium">{formatCurrency(item.expenses)}</td>
                          <td className={`py-2.5 px-3 font-bold ${item.savings >= 0 ? 'text-indigo-300' : 'text-amber-400'}`}>
                            {formatCurrency(item.savings)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-400">
                  <span>Months: {sortedMonthlyTrends.length}</span>
                  <span className="text-emerald-300">Income: {formatCurrency(trendTotals.income)}</span>
                  <span className="text-rose-400">Expense: {formatCurrency(trendTotals.expenses)}</span>
                  <span className="font-semibold text-indigo-200">Net: {formatCurrency(trendTotals.savings)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Filterable Transactions List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Transactions ({filteredTransactions.length})
              </h3>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <select
                  value={selectedHistoryMonth}
                  onChange={(event) => setSelectedHistoryMonth(event.target.value)}
                  aria-label="Transaction month"
                  className="rounded-xl border border-cyan-400/30 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-cyan-300 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="ALL">All months</option>
                  {transactionMonths.map((month) => (
                    <option key={month} value={month}>
                      {new Date(`${month}-01T00:00:00`).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </option>
                  ))}
                </select>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search this month..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/30 border border-slate-700/40 rounded-2xl text-slate-400 text-xs">
                No matching transactions recorded.
              </div>
            ) : (
              <div className="border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-900/60 max-h-96 overflow-y-auto">
                <div className="divide-y divide-slate-800 sm:hidden">
                  {sortedFilteredTransactions.map((tx) => {
                    const isIncoming = activeType === 'CREDIT'
                      ? isCreditCardPayment(tx)
                      : activeType === 'POCKET' ? isPocketCredit(tx) : tx.type === 'INCOME';
                    const accountName = isIncoming
                      ? tx.destinationAccount?.name || 'Account'
                      : tx.sourceAccount?.name || 'Account';

                    return (
                      <div key={tx.id} className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-100">
                              {tx.merchant || tx.description || tx.category?.name || (tx.type === 'TRANSFER' ? 'Card payment' : 'Transaction')}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {new Date(tx.transactionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <span className={`shrink-0 text-sm font-bold ${isIncoming ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncoming ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-300">
                            {tx.category?.name || (tx.type === 'TRANSFER' ? 'Transfer' : 'Uncategorized')}
                          </span>
                          <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-400">{accountName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <table className="hidden w-full text-left text-xs sm:table">
                  <thead className="bg-slate-800/80 border-b border-slate-700/80 text-slate-400 font-semibold uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTxSort('date')} className="flex items-center gap-1 hover:text-cyan-300">
                          Date <span className="text-[10px]">{sortIndicator(txSortKey === 'date', txSortDirection)}</span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTxSort('category')} className="flex items-center gap-1 hover:text-cyan-300">
                          Category <span className="text-[10px]">{sortIndicator(txSortKey === 'category', txSortDirection)}</span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTxSort('details')} className="flex items-center gap-1 hover:text-cyan-300">
                          Details / Merchant <span className="text-[10px]">{sortIndicator(txSortKey === 'details', txSortDirection)}</span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button type="button" onClick={() => toggleTxSort('account')} className="flex items-center gap-1 hover:text-cyan-300">
                          Account <span className="text-[10px]">{sortIndicator(txSortKey === 'account', txSortDirection)}</span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        <button type="button" onClick={() => toggleTxSort('amount')} className="ml-auto flex items-center gap-1 hover:text-cyan-300">
                          Amount <span className="text-[10px]">{sortIndicator(txSortKey === 'amount', txSortDirection)}</span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedFilteredTransactions.map((tx) => {
                      const isIncome = activeType === 'CREDIT'
                        ? isCreditCardPayment(tx)
                        : activeType === 'POCKET' ? isPocketCredit(tx) : tx.type === 'INCOME';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            {new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-slate-200 font-medium">
                            {tx.category?.name || (tx.type === 'TRANSFER' ? 'Transfer' : 'Uncategorized')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 truncate max-w-[200px]">
                            {tx.merchant || tx.description || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {isIncome
                              ? tx.destinationAccount?.name || 'Account'
                              : tx.sourceAccount?.name || 'Account'}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncome ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/70 bg-slate-900/95 px-3 py-2 text-[11px] text-slate-400">
                  <span>Rows: {sortedFilteredTransactions.length}</span>
                  <span className="text-emerald-300">{activeType === 'CREDIT' ? 'Payments' : 'Income'}: +{formatCurrency(txIncomeTotal)}</span>
                  <span className="text-rose-400">{activeType === 'CREDIT' ? 'Purchases' : 'Expense'}: -{formatCurrency(txExpenseTotal)}</span>
                  <span className="font-semibold text-slate-200">Net: {formatCurrency(txIncomeTotal - txExpenseTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
