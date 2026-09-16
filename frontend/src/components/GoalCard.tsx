import React, { useState } from 'react';
import { Flag, Edit3, Trash2, CheckCircle2, Clock, Plus, Zap, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/privacyStore';

interface GoalCardProps {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  daysRemaining: number;
  monthlyProgressNeeded: number;
  status: string;
  priority: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onIncrement: (id: string, amount: number) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
  id,
  name,
  type,
  targetAmount,
  currentAmount,
  progressPercentage,
  daysRemaining,
  monthlyProgressNeeded,
  status,
  priority,
  onEdit,
  onDelete,
  onIncrement,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const remainingTarget = Math.max(0, targetAmount - currentAmount);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'HIGH':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'LOW':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Completed
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Paused
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Failed
          </span>
        );
      case 'ACTIVE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            In Progress ({progressPercentage.toFixed(1)}%)
          </span>
        );
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'from-emerald-400 to-emerald-500 shadow-emerald-500/30';
    if (percentage >= 75) return 'from-cyan-400 to-blue-500 shadow-cyan-500/30';
    if (percentage >= 50) return 'from-amber-400 to-amber-500 shadow-amber-500/30';
    return 'from-purple-400 to-indigo-500 shadow-purple-500/30';
  };

  const handleQuickAdd = async (amount: number) => {
    if (isUpdating || amount <= 0) return;
    setIsUpdating(true);
    try {
      await onIncrement(id, amount);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/90 rounded-2xl p-5 shadow-xl transition-all backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">{name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getPriorityBadge(priority)}`}>
                {priority}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {type}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {getStatusBadge(status)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onEdit(id)}
            className="p-1.5 px-3 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            title="Edit Goal"
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-400" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDelete(id)}
            className="p-1.5 px-3 text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/20 transition flex items-center gap-1.5"
            title="Delete Goal"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span>{progressPercentage.toFixed(1)}% Achieved</span>
          <span>{remainingTarget <= 0 ? 'Goal Reached!' : `${formatCurrency(remainingTarget)} remaining`}</span>
        </div>
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-full h-3 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r shadow-sm ${getProgressBarColor(progressPercentage)}`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4 text-xs">
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Target Amount</span>
          <span className="font-bold text-white text-sm mt-0.5 block">{formatCurrency(targetAmount)}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Current Saved</span>
          <span className="font-bold text-purple-400 text-sm mt-0.5 block">{formatCurrency(currentAmount)}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Remaining</span>
          <span className={`font-bold text-sm mt-0.5 block ${remainingTarget === 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
            {formatCurrency(remainingTarget)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Days Left</span>
          <span className={`font-bold text-sm mt-0.5 block ${daysRemaining < 30 && daysRemaining > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {daysRemaining > 0 ? `${daysRemaining} days` : 'Due / Passed'}
          </span>
        </div>
      </div>

      {/* Action / Quick Save Section */}
      {status !== 'COMPLETED' && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <p className="text-slate-400">
            {type === 'EMI' ? (
              <span>Monthly EMI: <strong className="text-purple-300">{formatCurrency(monthlyProgressNeeded)}</strong></span>
            ) : (
              <span>Save <strong className="text-cyan-300">{formatCurrency(monthlyProgressNeeded)}</strong>/mo to reach target on schedule</span>
            )}
          </p>

          <div className="flex items-center gap-2">
            {monthlyProgressNeeded > 0 && remainingTarget > 0 && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleQuickAdd(monthlyProgressNeeded)}
                className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ {formatCurrency(monthlyProgressNeeded)}</span>
              </button>
            )}

            {remainingTarget > 0 && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleQuickAdd(remainingTarget)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Complete Goal</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { GoalCard };
export default GoalCard;
