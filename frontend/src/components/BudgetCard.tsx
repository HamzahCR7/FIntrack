import React, { useState } from 'react';
import { Target, ChevronDown, ChevronUp, Edit3, Trash2, CheckCircle2, AlertTriangle, XCircle, ShoppingBag, Calendar, Tag } from 'lucide-react';
import { formatCurrency } from '../utils/privacyStore';
import { Budget } from '../types';

interface BudgetCardProps {
  budget: Budget;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  budget,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    id,
    name,
    amount,
    spentAmount = 0,
    remainingAmount = 0,
    percentageUsed = 0,
    status = 'OK',
    spentTransactions = [],
    categoryBreakdown = [],
  } = budget;

  const getStatusBadge = () => {
    switch (status) {
      case 'EXCEEDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Budget Exceeded ({percentageUsed.toFixed(1)}%)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Near Limit ({percentageUsed.toFixed(1)}%)
          </span>
        );
      case 'OK':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            On Track ({percentageUsed.toFixed(1)}%)
          </span>
        );
    }
  };

  const getProgressBarColor = () => {
    if (percentageUsed >= 100) return 'from-rose-500 to-red-600 shadow-rose-500/30';
    if (percentageUsed >= 80) return 'from-amber-400 to-amber-500 shadow-amber-500/30';
    return 'from-emerald-400 to-cyan-500 shadow-emerald-500/30';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/90 rounded-2xl p-5 shadow-xl transition-all backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{name}</h3>
            <div className="mt-1 flex items-center gap-2">
              {getStatusBadge()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onEdit(id)}
            className="p-1.5 px-3 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            title="Edit Budget"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDelete(id)}
            className="p-1.5 px-3 text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/20 transition flex items-center gap-1.5"
            title="Delete Budget"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span>{percentageUsed.toFixed(1)}% Spent</span>
          <span>{percentageUsed >= 100 ? '0% Remaining' : `${(100 - percentageUsed).toFixed(1)}% Available`}</span>
        </div>
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-full h-3 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r shadow-sm ${getProgressBarColor()}`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4 text-xs">
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Budget Limit</span>
          <span className="font-bold text-white text-sm mt-0.5 block">{formatCurrency(amount)}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Total Spent</span>
          <span className="font-bold text-rose-400 text-sm mt-0.5 block">{formatCurrency(spentAmount)}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Remaining</span>
          <span className={`font-bold text-sm mt-0.5 block ${remainingAmount > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
            {formatCurrency(remainingAmount)}
          </span>
        </div>
      </div>

      {/* Category Distribution Pills (if any) */}
      {categoryBreakdown.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Categories:</span>
          {categoryBreakdown.map((cat, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 text-slate-200 border border-slate-700/60"
            >
              <span>{cat.categoryName}</span>
              <span className="text-cyan-300 font-semibold">{formatCurrency(cat.amount)}</span>
              <span className="text-slate-500 text-[10px]">({cat.percentage}%)</span>
            </span>
          ))}
        </div>
      )}

      {/* Collapsible Section: "Where I have spent all" */}
      <div className="mt-3 pt-3 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors py-1"
        >
          <span className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            Where I spent all ({spentTransactions.length} expenses • {formatCurrency(spentAmount)})
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
            {spentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-950/40 rounded-xl">
                No matching expense transactions found for this billing cycle yet.
              </p>
            ) : (
              spentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold text-slate-200 truncate">
                      {tx.description || tx.merchant || tx.categoryName || 'Expense'}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300 font-medium">
                        {tx.categoryName}
                        {tx.subcategoryName ? ` › ${tx.subcategoryName.replace(/^.*?>\s*/, '')}` : ''}
                      </span>
                      {tx.itemTag && (
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <Tag className="w-2.5 h-2.5" />
                          {tx.itemTag}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-rose-400 text-xs">
                      -{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetCard;
