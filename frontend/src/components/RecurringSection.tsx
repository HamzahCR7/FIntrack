import React, { useState } from 'react';
import { Debt, Subscription } from '../types';
import { formatCurrency } from './SummaryCards';
import { usePrivacyMode } from '../utils/privacyStore';
import { Calendar, Repeat, Plus, Play, X } from 'lucide-react';
import axios from 'axios';
import { api } from '../api/client';
import { DatePicker } from './DatePicker';

const toDateInputValue = (value: string) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface RecurringSectionProps {
  recurring: {
    monthlySubscriptionCost: number;
    activeSubscriptionsCount: number;
    upcomingSubscriptions: Subscription[];
  };
  debts?: Debt[];
  onAddSubscription?: () => void;
  onManageDebt?: () => void;
  onRefresh?: () => void;
}

export const RecurringSection: React.FC<RecurringSectionProps> = ({ recurring, debts = [], onAddSubscription, onManageDebt, onRefresh }) => {
  usePrivacyMode();
  const [paymentSubscription, setPaymentSubscription] = useState<Subscription | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentBillingDate, setPaymentBillingDate] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const recurringLoans = debts.filter((debt) => debt.recordKind === 'LOAN' && debt.type === 'I_OWE' && debt.status !== 'SETTLED');
  const monthlyLoanCost = recurringLoans.reduce((sum, debt) => sum + (debt.emiAmount || debt.remainingAmount), 0);
  const openPayment = (subscription: Subscription) => {
    setPaymentSubscription(subscription);
    setPaymentAmount(subscription.amount.toString());
    setPaymentBillingDate(toDateInputValue(subscription.nextBillingDate));
    setPaymentError(null);
  };

  const handleProcessPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentSubscription) return;

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Please enter a valid positive amount.');
      return;
    }
    if (!paymentBillingDate) {
      setPaymentError('Please select the billing date.');
      return;
    }

    try {
      setIsProcessingPayment(true);
      setPaymentError(null);
      const currentBillingDate = toDateInputValue(paymentSubscription.nextBillingDate);
      if (amount !== paymentSubscription.amount || paymentBillingDate !== currentBillingDate) {
        await api.updateSubscription(paymentSubscription.id, {
          amount,
          nextBillingDate: new Date(`${paymentBillingDate}T12:00:00`).toISOString(),
        });
      }
      await api.processSubscriptionPayment(
        paymentSubscription.id,
        new Date(`${paymentBillingDate}T12:00:00`).toISOString()
      );
      setPaymentSubscription(null);
      onRefresh?.();
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error ? err.message : 'Failed to process payment';
      setPaymentError(message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!paymentSubscription) return;

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Please enter a valid positive amount.');
      return;
    }
    if (!paymentBillingDate) {
      setPaymentError('Please select the billing date.');
      return;
    }

    try {
      setIsProcessingPayment(true);
      setPaymentError(null);
      await api.updateSubscription(paymentSubscription.id, {
        amount,
        nextBillingDate: new Date(`${paymentBillingDate}T12:00:00`).toISOString(),
        status: 'ACTIVE',
      });
      setPaymentSubscription(null);
      onRefresh?.();
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error ? err.message : 'Failed to update recurring payment';
      setPaymentError(message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-4">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Recurring Payments</h3>
            <p className="text-xs text-slate-400">Track subscriptions, loan EMIs and upcoming billing dates</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-700/50 px-4 py-2 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Monthly Total</span>
              <span className="text-base font-bold text-indigo-400">{formatCurrency(recurring.monthlySubscriptionCost + monthlyLoanCost)}</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Active</span>
              <span className="text-base font-bold text-slate-200">{recurring.activeSubscriptionsCount + recurringLoans.length} Payments</span>
            </div>
          </div>

          {onAddSubscription && (
            <button
              onClick={onAddSubscription}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subscription</span>
            </button>
          )}
        </div>
      </div>

      {recurringLoans.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Loan EMIs</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recurringLoans.map((debt) => (
              <div key={debt.id} className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="space-y-1">
                  <span className="block text-sm font-semibold text-white">{debt.personName}</span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 font-semibold uppercase text-amber-300">{debt.loanCategory || 'Loan'} EMI</span>
                    {debt.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(debt.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold text-white">{formatCurrency(debt.emiAmount || debt.remainingAmount)}</span>
                  {onManageDebt && <button onClick={onManageDebt} className="mt-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200">Manage loan</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Upcoming Renewals</h4>
        {recurring.upcomingSubscriptions.length === 0 ? (
          <p className="text-xs text-slate-400 italic bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-center">
            No active subscriptions added yet. Click "Add Subscription" to track recurring commitments!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recurring.upcomingSubscriptions.map((sub) => {
              const billingDate = new Date(sub.nextBillingDate);
              const formattedDate = billingDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

              return (
                <div key={sub.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 flex items-center justify-between hover:border-slate-600 transition-all">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-white block">{sub.name}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] uppercase tracking-wider font-semibold text-indigo-300">
                        {sub.billingCycle}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1.5">
                    <span className="text-sm font-bold text-white block">{formatCurrency(sub.amount)}</span>
                    <button
                      onClick={() => openPayment(sub)}
                      className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 ml-auto"
                      title="Process recurring payment now"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>Pay Now</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {paymentSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={handleProcessPayment} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Pay {paymentSubscription.name}</h3>
                <p className="text-xs text-slate-400">Record this payment and advance its next billing date.</p>
              </div>
              <button type="button" onClick={() => setPaymentSubscription(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close payment dialog"><X className="h-5 w-5" /></button>
            </div>
            {paymentError && <div className="rounded-xl border border-rose-500/40 bg-rose-500/20 p-3 text-xs font-medium text-rose-400">{paymentError}</div>}
            <label className="block text-xs font-semibold text-slate-300">
              Payment amount (₹)
              <input autoFocus type="number" min="0.01" step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white outline-none focus:border-indigo-500" />
            </label>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Billing date</label>
              <DatePicker value={paymentBillingDate} onChange={setPaymentBillingDate} required accent="indigo" />
            </div>
            <p className="text-[11px] text-slate-400">Changing the amount updates future payments. The next cycle is calculated from the billing date selected here.</p>
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button type="button" onClick={() => setPaymentSubscription(null)} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700">Cancel</button>
              <button type="button" onClick={handleSaveChanges} disabled={isProcessingPayment} className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50">Save changes</button>
              <button type="submit" disabled={isProcessingPayment} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{isProcessingPayment ? 'Processing...' : 'Confirm payment'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
