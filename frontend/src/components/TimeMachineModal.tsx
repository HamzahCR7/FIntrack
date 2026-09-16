import React, { useState } from 'react';
import {
  History,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency, usePrivacyMode } from '../utils/privacyStore';
import { DashboardData } from '../types';
import { ClearableSelect } from './ClearableSelect';

interface TimeMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: DashboardData | null;
}

export const TimeMachineModal: React.FC<TimeMachineModalProps> = ({ isOpen, onClose, dashboardData }) => {
  usePrivacyMode();

  const [simulatedCategory, setSimulatedCategory] = useState<string>('Food & Dining');
  const [reductionPercent, setReductionPercent] = useState<number>(20);
  const [monthsAhead, setMonthsAhead] = useState<number>(12);

  if (!isOpen) return null;

  const categories = dashboardData?.spendingByCategory || [];
  const defaultSimulatedCategory = categories[0]?.name || 'Food & Dining';
  const currentCategoryObj = categories.find((c) => c.name.toLowerCase() === simulatedCategory.toLowerCase()) || categories[0];
  const monthlyCategorySpend = currentCategoryObj ? currentCategoryObj.amount : 5000;

  const monthlySavingsAmount = Math.round(monthlyCategorySpend * (reductionPercent / 100));
  const totalProjectedSavings = monthlySavingsAmount * monthsAhead;

  const currentTotalSavings = dashboardData?.summary?.savings || 0;
  const projectedTotalSavings = currentTotalSavings + totalProjectedSavings;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Financial Time Machine
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Future Simulator
                </span>
              </h3>
              <p className="text-xs text-slate-400">See how small lifestyle habits change your future wealth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Target Category</label>
              <ClearableSelect
                value={simulatedCategory}
                onValueChange={setSimulatedCategory}
                defaultValue={defaultSimulatedCategory}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name} ({formatCurrency(cat.amount)}/mo)
                  </option>
                ))}
              </ClearableSelect>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Reduce Spending By</label>
              <ClearableSelect
                value={String(reductionPercent)}
                onValueChange={(value) => setReductionPercent(Number(value))}
                defaultValue="20"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              >
                <option value={10}>10% Reduction</option>
                <option value={20}>20% Reduction</option>
                <option value={30}>30% Reduction</option>
                <option value={50}>50% Half Spend</option>
              </ClearableSelect>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Time Horizon</label>
              <ClearableSelect
                value={String(monthsAhead)}
                onValueChange={(value) => setMonthsAhead(Number(value))}
                defaultValue="12"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              >
                <option value={6}>6 Months</option>
                <option value={12}>1 Year (12 mos)</option>
                <option value={36}>3 Years (36 mos)</option>
                <option value={60}>5 Years (60 mos)</option>
              </ClearableSelect>
            </div>
          </div>

          {/* Time Machine Result Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-tr from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Time Travel Projection Output
              </span>
              <span className="text-xs font-bold text-white bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                +{monthsAhead} Months Ahead
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Monthly Extra Savings</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(monthlySavingsAmount)}/mo</p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Projected Wealth</span>
                <p className="text-lg font-bold text-purple-300 mt-1">{formatCurrency(projectedTotalSavings)}</p>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-300 space-y-1.5">
              <p className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Cutting <strong>{simulatedCategory}</strong> by {reductionPercent}% saves{' '}
                  <strong className="text-emerald-300">{formatCurrency(totalProjectedSavings)}</strong> over {monthsAhead} months!
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Equivalent to getting a <strong>{((monthlySavingsAmount / Math.max(1, monthlyCategorySpend)) * 100).toFixed(0)}% salary boost</strong> on that category!</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
