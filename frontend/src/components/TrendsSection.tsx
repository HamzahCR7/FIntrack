import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from './SummaryCards';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Transaction } from '../types';

interface TrendsSectionProps {
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  transactions: Transaction[];
}

export const TrendsSection: React.FC<TrendsSectionProps> = ({ monthlyTrends, transactions }) => {
  const [view, setView] = useState<'monthly' | 'daily'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const dailyTrends = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const rows = Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      income: 0,
      expenses: 0,
      savings: 0,
    }));

    transactions.forEach((transaction) => {
      const date = new Date(transaction.transactionDate);
      if (date.getFullYear() !== year || date.getMonth() !== month) return;
      const row = rows[date.getDate() - 1];
      if (transaction.type === 'INCOME') row.income += transaction.amount;
      if (transaction.type === 'EXPENSE') row.expenses += transaction.amount;
    });
    return rows.map((row) => ({ ...row, savings: row.income - row.expenses }));
  }, [selectedMonth, transactions]);

  const isCurrentMonth = selectedMonth.getFullYear() === new Date().getFullYear()
    && selectedMonth.getMonth() === new Date().getMonth();
  const changeMonth = (offset: number) => setSelectedMonth((current) =>
    new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">{view === 'monthly' ? '6-Month Financial Trends' : 'Daily Financial Trends'}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex rounded-lg border border-slate-700 bg-slate-900/70 p-0.5">
            <button type="button" onClick={() => setView('monthly')} className={`rounded-md px-2.5 py-1 font-semibold ${view === 'monthly' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400'}`}>6 Months</button>
            <button type="button" onClick={() => setView('daily')} className={`rounded-md px-2.5 py-1 font-semibold ${view === 'daily' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400'}`}>Daily</button>
          </div>
          {view === 'daily' && (
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900/70 p-0.5">
              <button type="button" onClick={() => changeMonth(-1)} className="rounded p-1 text-slate-300 hover:bg-slate-700" aria-label="Previous month"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <span className="min-w-[6.5rem] text-center font-semibold text-slate-200">{selectedMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
              <button type="button" onClick={() => changeMonth(1)} disabled={isCurrentMonth} className="rounded p-1 text-slate-300 hover:bg-slate-700 disabled:opacity-30" aria-label="Next month"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-slate-300">Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-300">Net Savings</span>
          </div>
        </div>
      </div>

      {view === 'monthly' ? <div className="mt-6 h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
              formatter={(val: number) => formatCurrency(val)}
            />
            <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fillOpacity={1} fill="url(#incomeGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fillOpacity={1} fill="url(#expenseGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="savings" name="Savings" stroke="#3b82f6" fillOpacity={1} fill="url(#savingsGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div> : (
        <div className="mt-6 touch-pan-x overflow-x-auto pb-2">
          <div className="h-64 sm:h-72" style={{ minWidth: `${Math.max(980, dailyTrends.length * 38)}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dailyIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dailyExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dailySavingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={0} tickLine={false} />
                <YAxis stroke="#94a3b8" width={42} tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  labelFormatter={(day) => `${selectedMonth.toLocaleString('default', { month: 'short' })} ${day}`}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#dailyIncomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="url(#dailyExpenseGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="savings" name="Savings" stroke="#3b82f6" fill="url(#dailySavingsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
