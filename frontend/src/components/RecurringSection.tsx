import React from 'react';
import { Subscription } from '../types';
import { formatCurrency } from './SummaryCards';
import { usePrivacyMode } from '../utils/privacyStore';
import { Calendar, Repeat, Plus, Play } from 'lucide-react';
import axios from 'axios';

interface RecurringSectionProps {
  recurring: {
    monthlySubscriptionCost: number;
    activeSubscriptionsCount: number;
    upcomingSubscriptions: Subscription[];
  };
  onAddSubscription?: () => void;
  onRefresh?: () => void;
}

export const RecurringSection: React.FC<RecurringSectionProps> = ({ recurring, onAddSubscription, onRefresh }) => {
  usePrivacyMode();
  const handleProcessPayment = async (id: string, name: string) => {
    if (confirm(`Process recurring payment for '${name}'? This will record an expense and advance the next billing date.`)) {
      try {
        await axios.post(`/api/v1/subscriptions/${id}/process-payment`);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'Failed to process payment');
      }
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-4">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Recurring Subscriptions</h3>
            <p className="text-xs text-slate-400">Track monthly commitments and upcoming billing dates</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-700/50 px-4 py-2 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Monthly Total</span>
              <span className="text-base font-bold text-indigo-400">{formatCurrency(recurring.monthlySubscriptionCost)}</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Active</span>
              <span className="text-base font-bold text-slate-200">{recurring.activeSubscriptionsCount} Subscriptions</span>
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
                      onClick={() => handleProcessPayment(sub.id, sub.name)}
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
    </div>
  );
};
