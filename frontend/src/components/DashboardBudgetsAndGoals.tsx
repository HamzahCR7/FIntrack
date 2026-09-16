import React, { useState } from 'react';
import { Target, Flag, ArrowRight, Plus, AlertTriangle, CheckCircle2, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/privacyStore';
import { Budget, Goal } from '../types';

interface DashboardBudgetsAndGoalsProps {
  budgets: Budget[];
  goals: Goal[];
  onNavigateTab: (tabId: 'budgets' | 'goals') => void;
  onOpenBudgetModal?: () => void;
  onOpenGoalModal?: () => void;
}

export const DashboardBudgetsAndGoals: React.FC<DashboardBudgetsAndGoalsProps> = ({
  budgets,
  goals,
  onNavigateTab,
  onOpenBudgetModal,
  onOpenGoalModal,
}) => {
  const [activeView, setActiveView] = useState<'ALL' | 'BUDGETS' | 'GOALS'>('ALL');

  // Budget calculations
  const totalBudgetAmount = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
  const totalBudgetRemaining = Math.max(0, totalBudgetAmount - totalBudgetSpent);
  const budgetPercentage = totalBudgetAmount > 0 ? (totalBudgetSpent / totalBudgetAmount) * 100 : 0;

  // Goals calculations
  const activeGoals = goals.filter((g) => g.status !== 'COMPLETED');
  const totalGoalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const totalGoalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const goalsAverageProgress = goals.length > 0
    ? goals.reduce((sum, g) => sum + (g.progressPercentage || 0), 0) / goals.length
    : 0;

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950 p-5 sm:p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Targets & Commitments
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Budgets & Financial Goals
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time monthly expense caps & long-term savings targets
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800/90 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveView('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'ALL'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Combined View
          </button>
          <button
            type="button"
            onClick={() => setActiveView('BUDGETS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'BUDGETS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Budgets ({budgets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('GOALS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'GOALS'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Goals ({goals.length})
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* 1. BUDGETS CARD / COLUMN */}
        {(activeView === 'ALL' || activeView === 'BUDGETS') && (
          <div className="flex flex-col justify-between rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 sm:p-5 hover:border-slate-700/80 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Monthly Budgets</h4>
                    <span className="text-[11px] text-slate-400">
                      Auto-synced with live ledger
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('budgets')}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  Manage <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Aggregated Quick Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 mb-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Allocated</span>
                  <span className="font-bold text-white text-xs sm:text-sm block truncate">{formatCurrency(totalBudgetAmount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Spent</span>
                  <span className="font-bold text-rose-400 text-xs sm:text-sm block truncate">{formatCurrency(totalBudgetSpent)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Remaining</span>
                  <span className={`font-bold text-xs sm:text-sm block truncate ${totalBudgetRemaining > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(totalBudgetRemaining)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
                  <span>Overall Budget Usage</span>
                  <span className={budgetPercentage >= 100 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                    {budgetPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      budgetPercentage >= 100
                        ? 'bg-rose-500'
                        : budgetPercentage >= 80
                        ? 'bg-amber-400'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Budgets List Preview */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {budgets.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No active budgets yet. Set up one to track monthly expenses.
                  </p>
                ) : (
                  budgets.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-200 truncate">{b.name}</span>
                        <span className="font-semibold text-white shrink-0">
                          {formatCurrency(b.spentAmount)} <span className="text-slate-500 font-normal">/ {formatCurrency(b.amount)}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="text-emerald-400 font-medium">
                          {formatCurrency(b.remainingAmount)} left
                        </span>
                        <span className={b.status === 'EXCEEDED' ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                          {b.percentageUsed.toFixed(0)}% used
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                {budgets.length} active budget{budgets.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('budgets')}
                className="font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition"
              >
                View budget breakdown <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 2. GOALS CARD / COLUMN */}
        {(activeView === 'ALL' || activeView === 'GOALS') && (
          <div className="flex flex-col justify-between rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 sm:p-5 hover:border-slate-700/80 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Financial Goals</h4>
                    <span className="text-[11px] text-slate-400">
                      Target savings milestones
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('goals')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  Manage <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Aggregated Quick Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 mb-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Total Target</span>
                  <span className="font-bold text-white text-xs sm:text-sm block truncate">{formatCurrency(totalGoalTarget)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Saved</span>
                  <span className="font-bold text-emerald-400 text-xs sm:text-sm block truncate">{formatCurrency(totalGoalSaved)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Avg Progress</span>
                  <span className="font-bold text-cyan-400 text-xs sm:text-sm block truncate">
                    {goalsAverageProgress.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
                  <span>Overall Goals Completion</span>
                  <span className="text-emerald-400 font-bold">
                    {goalsAverageProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm"
                    style={{ width: `${Math.min(goalsAverageProgress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Goals List Preview */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {goals.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No financial goals created yet. Set a savings goal to start tracking.
                  </p>
                ) : (
                  goals.map((g) => (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-200 truncate">{g.name}</span>
                        <span className="font-semibold text-white shrink-0">
                          {formatCurrency(g.currentAmount)} <span className="text-slate-500 font-normal">/ {formatCurrency(g.targetAmount)}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="text-cyan-400 font-medium">
                          {formatCurrency(Math.max(0, g.targetAmount - g.currentAmount))} remaining
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          {(g.progressPercentage || 0).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                {goals.length} active goal{goals.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('goals')}
                className="font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition"
              >
                View all goals <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default DashboardBudgetsAndGoals;
