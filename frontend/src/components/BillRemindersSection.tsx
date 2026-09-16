import React, { useState } from 'react';
import { Account, Subscription, Debt } from '../types';
import { formatCurrency } from './SummaryCards';
import { usePrivacyMode } from '../utils/privacyStore';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CreditCard as CardIcon,
  Repeat,
  HandCoins,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  BellRing,
  Filter,
} from 'lucide-react';

export interface BillItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'CREDIT_CARD' | 'SUBSCRIPTION' | 'DEBT';
  amount: number;
  dueDate: Date;
  daysRemaining: number;
  status: 'OVERDUE' | 'DUE_TODAY' | 'URGENT' | 'DUE_SOON' | 'UPCOMING';
  rawObject: Account | Subscription | Debt;
}

interface BillRemindersSectionProps {
  creditCards?: Account[];
  subscriptions?: Subscription[];
  debts?: Debt[];
  onPayCreditCard?: (card: Account) => void;
  onPaySubscription?: (subscription: Subscription) => void;
  onPayDebt?: (debt: Debt) => void;
}

export const BillRemindersSection: React.FC<BillRemindersSectionProps> = ({
  creditCards = [],
  subscriptions = [],
  debts = [],
  onPayCreditCard,
  onPaySubscription,
  onPayDebt,
}) => {
  usePrivacyMode();
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT_CARD' | 'SUBSCRIPTION' | 'DEBT'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const billItems: BillItem[] = [];

  // 1. Process Credit Cards
  creditCards.forEach((card) => {
    const debtAmount = card.currentBalance ?? card.currentOutstanding ?? 0;
    if (debtAmount > 0) {
      let dueDay = card.paymentDueDay || 9;
      let dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      if (dueDate < now) {
        dueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
      }

      const diffTime = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: BillItem['status'] = 'UPCOMING';
      if (daysRemaining < 0) status = 'OVERDUE';
      else if (daysRemaining === 0) status = 'DUE_TODAY';
      else if (daysRemaining <= 3) status = 'URGENT';
      else if (daysRemaining <= 7) status = 'DUE_SOON';

      billItems.push({
        id: `card-${card.id}`,
        title: card.name,
        subtitle: `${card.institution || 'Credit Card'} Outstanding`,
        category: 'CREDIT_CARD',
        amount: debtAmount,
        dueDate,
        daysRemaining,
        status,
        rawObject: card,
      });
    }
  });

  // 2. Process Subscriptions
  subscriptions.forEach((sub) => {
    if (sub.status !== 'CANCELLED') {
      const dueDate = new Date(sub.nextBillingDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: BillItem['status'] = 'UPCOMING';
      if (daysRemaining < 0) status = 'OVERDUE';
      else if (daysRemaining === 0) status = 'DUE_TODAY';
      else if (daysRemaining <= 3) status = 'URGENT';
      else if (daysRemaining <= 7) status = 'DUE_SOON';

      billItems.push({
        id: `sub-${sub.id}`,
        title: sub.name,
        subtitle: `Subscription (${sub.billingCycle})`,
        category: 'SUBSCRIPTION',
        amount: sub.amount,
        dueDate,
        daysRemaining,
        status,
        rawObject: sub,
      });
    }
  });

  // 3. Process Debts (I_OWE)
  debts.forEach((debt) => {
    if (debt.type === 'I_OWE' && debt.status !== 'SETTLED' && debt.remainingAmount > 0) {
      const isLoan = debt.recordKind === 'LOAN';
      let dueDate = debt.dueDate ? new Date(debt.dueDate) : new Date(now.getFullYear(), now.getMonth(), 28);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: BillItem['status'] = 'UPCOMING';
      if (daysRemaining < 0) status = 'OVERDUE';
      else if (daysRemaining === 0) status = 'DUE_TODAY';
      else if (daysRemaining <= 3) status = 'URGENT';
      else if (daysRemaining <= 7) status = 'DUE_SOON';

      billItems.push({
        id: `debt-${debt.id}`,
        title: isLoan ? `${debt.loanCategory || 'Loan'} Loan - ${debt.personName}` : `Borrowed from ${debt.personName}`,
        subtitle: isLoan ? `Loan repayment (${debt.status})` : `Personal borrowing (${debt.status})`,
        category: 'DEBT',
        amount: isLoan && debt.emiAmount ? debt.emiAmount : debt.remainingAmount,
        dueDate,
        daysRemaining,
        status,
        rawObject: debt,
      });
    }
  });

  // Sort by urgency / days remaining
  billItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Filtered List
  const filteredItems = billItems.filter((item) => {
    if (filterType === 'ALL') return true;
    return item.category === filterType;
  });
  const remindersPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / remindersPerPage));
  const page = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((page - 1) * remindersPerPage, page * remindersPerPage);

  const handleFilterChange = (nextFilter: typeof filterType) => {
    setFilterType(nextFilter);
    setCurrentPage(1);
  };

  // Summary Metrics
  const urgentCount = billItems.filter((i) => i.status === 'OVERDUE' || i.status === 'DUE_TODAY' || i.status === 'URGENT').length;
  const totalDueAmount = billItems.reduce((acc, i) => acc + i.amount, 0);
  const nextImmediate = billItems.length > 0 ? billItems[0] : null;

  const renderBadge = (status: BillItem['status'], days: number) => {
    switch (status) {
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Overdue by {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''}
          </span>
        );
      case 'DUE_TODAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <BellRing className="w-3 h-3 text-amber-400" />
            Due Today
          </span>
        );
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <Clock className="w-3 h-3" />
            Due in {days} day{days !== 1 ? 's' : ''}
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <Calendar className="w-3 h-3" />
            Due in {days} days
          </span>
        );
      case 'UPCOMING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-700/60 text-slate-300 border border-slate-600/50">
            <Calendar className="w-3 h-3 text-slate-400" />
            Due in {days} days
          </span>
        );
    }
  };

  const renderIcon = (category: BillItem['category']) => {
    switch (category) {
      case 'CREDIT_CARD':
        return <CardIcon className="w-4 h-4 text-purple-400" />;
      case 'SUBSCRIPTION':
        return <Repeat className="w-4 h-4 text-indigo-400" />;
      case 'DEBT':
        return <HandCoins className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Bill Payment Reminders & Due Timeline
            </h3>
            <p className="text-xs text-slate-400">
              Unified schedule of upcoming credit cards, subscriptions, and loan obligations
            </p>
          </div>
        </div>

        {/* Summary Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/80 border border-slate-700/60 px-3.5 py-2 rounded-xl text-xs flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Obligations</span>
              <span className="font-bold text-white">{formatCurrency(totalDueAmount)}</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Urgent Bills</span>
              <span className={`font-bold ${urgentCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {urgentCount} Bill{urgentCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Bills ({billItems.length})
          </button>
          <button
            onClick={() => handleFilterChange('CREDIT_CARD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterType === 'CREDIT_CARD'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CardIcon className="w-3.5 h-3.5" />
            <span>Credit Cards</span>
          </button>
          <button
            onClick={() => handleFilterChange('SUBSCRIPTION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterType === 'SUBSCRIPTION'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Subscriptions</span>
          </button>
          <button
            onClick={() => handleFilterChange('DEBT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterType === 'DEBT'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>Loans / Debts</span>
          </button>
        </div>

        {nextImmediate && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="font-semibold text-slate-300">Next Due:</span>
            <span className="text-white font-medium">{nextImmediate.title}</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400 font-bold">{formatCurrency(nextImmediate.amount)}</span>
          </div>
        )}
      </div>

      {/* Bill List Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-xs">
          No upcoming bill obligations found for this filter. All payments are clear!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map((item) => {
            const formattedDueDate = item.dueDate.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={item.id}
                className="p-4 bg-slate-900/70 border border-slate-700/60 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-600 transition-all shadow-sm group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 group-hover:scale-105 transition-transform">
                        {renderIcon(item.category)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">{item.title}</h4>
                        <span className="text-[11px] text-slate-400 block">{item.subtitle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-700/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-slate-400 font-medium">Due Date:</span>
                      <span className="text-white font-bold text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/30">
                        {formattedDueDate}
                      </span>
                    </div>
                    {renderBadge(item.status, item.daysRemaining)}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Amount Due</span>
                    <span className="text-base font-bold text-white">{formatCurrency(item.amount)}</span>
                  </div>

                  {/* Quick Action Button */}
                  {item.category === 'CREDIT_CARD' && onPayCreditCard && (
                    <button
                      onClick={() => onPayCreditCard(item.rawObject as Account)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Pay Card</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {item.category === 'SUBSCRIPTION' && onPaySubscription && (
                    <button
                      onClick={() => onPaySubscription(item.rawObject as Subscription)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Renew</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {item.category === 'DEBT' && onPayDebt && (
                    <button
                      onClick={() => onPayDebt(item.rawObject as Debt)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Settle</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredItems.length > remindersPerPage && (
        <div className="flex items-center justify-between border-t border-slate-700/60 pt-4">
          <span className="text-xs text-slate-400">
            Showing {(page - 1) * remindersPerPage + 1}-{Math.min(page * remindersPerPage, filteredItems.length)} of {filteredItems.length} reminders
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 transition-colors hover:border-blue-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous reminders page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4.5rem] text-center text-xs font-semibold text-slate-300">Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 transition-colors hover:border-blue-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next reminders page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
