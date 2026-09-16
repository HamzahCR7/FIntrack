import React, { useState } from 'react';
import { Account, Transaction } from '../types';
import { formatCurrency } from './SummaryCards';
import { usePrivacyMode } from '../utils/privacyStore';
import { Landmark, CreditCard as CardIcon, Wallet, Smartphone, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface AccountsSectionProps {
  accounts: {
    bankBalances: number;
    cashBalances: number;
    upiBalances: number;
    creditOutstanding: number;
    breakdown: Record<string, Account[]>;
  };
  transactions: Transaction[];
}

export const AccountsSection: React.FC<AccountsSectionProps> = ({ accounts, transactions }) => {
  usePrivacyMode();
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const bankAccounts = accounts.breakdown.BANK_ACCOUNT || [];
  const creditCards = accounts.breakdown.CREDIT_CARD || [];
  const cashAccounts = accounts.breakdown.CASH || [];
  const upiAccounts = [
    ...(accounts.breakdown.UPI || []),
    ...(accounts.breakdown.AMAZON_PAY || []),
  ];
  const isAllMonths = selectedMonth === null;
  const selectedMonthTransactions = transactions.filter((transaction) => {
    if (!selectedMonth) return true;

    const transactionDate = new Date(transaction.transactionDate);
    const isInSelectedMonth =
      transactionDate.getFullYear() === selectedMonth.getFullYear() &&
      transactionDate.getMonth() === selectedMonth.getMonth();

    return isInSelectedMonth;
  });
  const monthlyIncome = selectedMonthTransactions
    .filter((transaction) => transaction.type === 'INCOME')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const monthlyExpenses = selectedMonthTransactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const getAccountActivity = (accountId: string) => {
    return selectedMonthTransactions.reduce(
      (activity, transaction) => ({
        incoming: activity.incoming + (transaction.destinationAccountId === accountId ? transaction.amount : 0),
        outgoing: activity.outgoing + (transaction.sourceAccountId === accountId ? transaction.amount : 0),
      }),
      { incoming: 0, outgoing: 0 }
    );
  };
  const getDisplayedAccountValue = (account: Account) => {
    if (isAllMonths) return account.currentBalance;

    const activity = getAccountActivity(account.id);
    return activity.incoming - activity.outgoing;
  };
  const getDisplayedTotal = (accountList: Account[], allMonthsTotal: number) => {
    if (isAllMonths) return allMonthsTotal;

    return accountList.reduce((total, account) => total + getDisplayedAccountValue(account), 0);
  };
  const accountValueLabel = isAllMonths ? 'Live balance' : 'Net activity';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Accounts & Financial Channels</h2>
          <p className="text-xs text-slate-400">Live balances with activity for the selected month</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setSelectedMonth((month) => {
              const baseMonth = month || new Date();
              return new Date(baseMonth.getFullYear(), baseMonth.getMonth() - 1, 1);
            })}
            className="rounded-lg p-1.5 text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7.5rem] text-center text-xs font-semibold text-cyan-100">
            {selectedMonth ? selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' }) : 'All months'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedMonth((month) => {
              const baseMonth = month || new Date();
              return new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 1);
            })}
            className="rounded-lg p-1.5 text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="rounded-lg border border-cyan-400/30 px-2 py-1 text-[10px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20"
          >
            All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Transactions</span>
          <span className="text-sm font-bold text-white">{selectedMonthTransactions.length}</span>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Income</span>
          <span className="text-sm font-bold text-emerald-300">{formatCurrency(monthlyIncome)}</span>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-rose-300">Expenses</span>
          <span className="text-sm font-bold text-rose-300">{formatCurrency(monthlyExpenses)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Bank Accounts */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Bank Accounts</h3>
                <span className="text-[11px] text-slate-400">{bankAccounts.length} Connected</span>
              </div>
            </div>
            <span className="text-sm font-bold text-blue-400">{formatCurrency(getDisplayedTotal(bankAccounts, accounts.bankBalances))}</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {bankAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No bank accounts added.</p>
            ) : (
              bankAccounts.map((acc) => {
                const activity = getAccountActivity(acc.id);
                return (
                <div key={acc.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 space-y-2">
                  <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{acc.name}</span>
                    <span className="text-[10px] text-slate-400">{acc.institution || 'Bank'}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">{formatCurrency(getDisplayedAccountValue(acc))}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">{accountValueLabel}</span>
                    <span className="text-emerald-300">In {formatCurrency(activity.incoming)}</span>
                    <span className="text-rose-300">Out {formatCurrency(activity.outgoing)}</span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Credit Cards */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <CardIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Credit Cards</h3>
                <span className="text-[11px] text-slate-400">{creditCards.length} Active</span>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-400">{formatCurrency(accounts.creditOutstanding)}</span>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto">
            {creditCards.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No credit cards added.</p>
            ) : (
              creditCards.map((card) => {
                const limit = card.creditLimit || 0;
                const debt = card.currentBalance ?? card.currentOutstanding ?? 0;
                const avail = Math.max(0, limit - debt);
                const util = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;

                return (
                  <div key={card.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">{card.name}</span>
                      <span className="text-xs font-bold text-amber-400">{formatCurrency(debt)} debt</span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${util > 75 ? 'bg-rose-500' : util > 40 ? 'bg-amber-500' : 'bg-purple-500'}`}
                        style={{ width: `${util}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Limit: {formatCurrency(limit)}</span>
                      <span>Avail: {formatCurrency(avail)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Payment Due Date:</span>
                      </div>
                      <span className="font-bold text-white">
                        {card.paymentDueDay ? `${card.paymentDueDay}th of month` : '9th of month'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. Cash */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Cash Balance</h3>
                <span className="text-[11px] text-slate-400">Physical Holdings</span>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-400">{formatCurrency(getDisplayedTotal(cashAccounts, accounts.cashBalances))}</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {cashAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No cash accounts setup.</p>
            ) : (
              cashAccounts.map((acc) => {
                const activity = getAccountActivity(acc.id);
                return (
                <div key={acc.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 space-y-2">
                  <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{acc.name}</span>
                  <span className="text-xs font-bold text-emerald-400">{formatCurrency(getDisplayedAccountValue(acc))}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">{accountValueLabel}</span>
                    <span className="text-emerald-300">In {formatCurrency(activity.incoming)}</span>
                    <span className="text-rose-300">Out {formatCurrency(activity.outgoing)}</span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. UPI Wallets */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">UPI & Wallets</h3>
                <span className="text-[11px] text-slate-400">Digital Payment Channels</span>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-400">{formatCurrency(getDisplayedTotal(upiAccounts, accounts.upiBalances))}</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {upiAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No UPI accounts linked.</p>
            ) : (
              upiAccounts.map((acc) => {
                const activity = getAccountActivity(acc.id);
                return (
                <div key={acc.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 space-y-2">
                  <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{acc.name}</span>
                    <span className="text-[10px] text-slate-400">{acc.institution || 'UPI'}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400">{formatCurrency(getDisplayedAccountValue(acc))}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">{accountValueLabel}</span>
                    <span className="text-emerald-300">In {formatCurrency(activity.incoming)}</span>
                    <span className="text-rose-300">Out {formatCurrency(activity.outgoing)}</span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
