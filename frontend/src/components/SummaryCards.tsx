import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, CreditCard, ArrowUpRight, ArrowDownRight, History, Gift, ExternalLink } from 'lucide-react';
import { formatCurrency, usePrivacyMode } from '../utils/privacyStore';
import { MetricDetailsModal, MetricType } from './MetricDetailsModal';
import { Transaction } from '../types';

export { formatCurrency };

interface SummaryCardsProps {
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
  isColumn?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  monthlyTrends = [],
  transactions = [],
  isColumn = false,
}) => {
  usePrivacyMode(); // Subscribe to privacy mode toggle events to force re-render
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const prevSavings = summary.previousMonthSavings || 0;

  const cardPadding = isColumn ? 'p-3.5' : 'p-3.5 sm:p-5';
  const headingSize = isColumn ? 'text-xl' : 'text-lg sm:text-2xl';

  return (
    <>
      <div className={`dashboard-summary grid gap-2 sm:gap-3 ${isColumn ? 'grid-cols-1 w-full' : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 md:gap-4'}`}>
        {/* 1. Total Balance */}
        <div className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl ${cardPadding} hover:border-slate-600 transition-all shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Balance</span>
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`${headingSize} font-bold text-white tracking-tight`}>{formatCurrency(summary.totalBalance)}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Liquid Bank, Cash & UPI assets
            </p>
          </div>
        </div>

        {/* 2. Prev. Month Saved */}
        <div className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl ${cardPadding} hover:border-slate-600 transition-all shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Prev. Month Saved</span>
            <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`${headingSize} font-bold tracking-tight ${prevSavings >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
              {formatCurrency(prevSavings)}
            </h3>
            <p className="text-[11px] text-teal-500/90 mt-0.5 flex items-center gap-1">
              <span>Carried over from prev month</span>
            </p>
          </div>
        </div>

        {/* 3. Income (This Month) - Clickable for details */}
        <div
          onClick={() => setSelectedMetric('INCOME')}
          className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl ${cardPadding} hover:border-emerald-500/50 hover:bg-slate-800/90 transition-all shadow-sm cursor-pointer group relative`}
          title="Click to view income breakdown and previous months"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                Income (This Month)
              </span>
            </div>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`${headingSize} font-bold text-emerald-400 tracking-tight`}>
              {formatCurrency(summary.incomeThisMonth)}
            </h3>
            <p className="text-[11px] text-emerald-500/90 mt-0.5 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>All-time: {formatCurrency(summary.totalIncome)}</span>
            </p>
          </div>
        </div>

        {/* 4. Expenses (This Month) - Clickable for details */}
        <div
          onClick={() => setSelectedMetric('EXPENSE')}
          className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl ${cardPadding} hover:border-rose-500/50 hover:bg-slate-800/90 transition-all shadow-sm cursor-pointer group relative`}
          title="Click to view expense breakdown and previous months"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                Expenses (This Month)
              </span>
            </div>
            <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-500/20 group-hover:scale-105 transition-all flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`${headingSize} font-bold text-rose-400 tracking-tight`}>
              {formatCurrency(summary.spendingThisMonth)}
            </h3>
            <p className="text-[11px] text-rose-500/90 mt-0.5 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              <span>All-time: {formatCurrency(summary.totalExpenses)}</span>
            </p>
          </div>
        </div>

        {/* 5. Net Savings (This Month) - Clickable for details */}
        <div
          onClick={() => setSelectedMetric('SAVINGS')}
          className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl ${cardPadding} hover:border-indigo-500/50 hover:bg-slate-800/90 transition-all shadow-sm cursor-pointer group relative`}
          title="Click to view net savings breakdown and previous months"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                Net Savings (This Month)
              </span>
            </div>
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all flex items-center gap-1">
              <PiggyBank className="w-4 h-4" />
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`${headingSize} font-bold tracking-tight ${summary.savingsThisMonth >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
              {formatCurrency(summary.savingsThisMonth)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <span>Previous month: {formatCurrency(prevSavings)}</span>
            </p>
          </div>
        </div>

        {/* 6. Credit Outstanding */}
        <div className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl ${cardPadding} hover:border-slate-600 transition-all shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Credit Outstanding</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`${headingSize} font-bold text-amber-400 tracking-tight`}>
              {formatCurrency(summary.creditOutstanding)}
            </h3>
            <p className="text-[11px] text-amber-500/90 mt-0.5">
              Total active card debt
            </p>
          </div>
        </div>

        {/* 7. Pocket allowance */}
        <div className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl ${cardPadding} hover:border-slate-600 transition-all shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Pocket Allowance</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`${headingSize} font-bold text-amber-400 tracking-tight`}>
              {formatCurrency(summary.pocketAllowanceBalance)}
            </h3>
            <p className="text-[11px] text-amber-500/90 mt-0.5">
              {formatCurrency(summary.pocketAllowanceThisMonth)} received this month
            </p>
          </div>
        </div>
      </div>

      {/* Metric Breakdown & Multi-Month Details Modal */}
      <MetricDetailsModal
        isOpen={selectedMetric !== null}
        onClose={() => setSelectedMetric(null)}
        type={selectedMetric}
        summary={summary}
        monthlyTrends={monthlyTrends}
        transactions={transactions}
      />
    </>
  );
};
