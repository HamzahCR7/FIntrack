import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BudgetCard } from './BudgetCard';
import BudgetForm from './BudgetForm';
import { Target, Plus, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../utils/privacyStore';
import { Budget } from '../types';

interface BudgetsSectionProps {
  categories: any[];
  budgets?: Budget[];
  onRefresh?: () => void;
}

const BudgetsSection: React.FC<BudgetsSectionProps> = ({ categories, budgets: parentBudgets, onRefresh }) => {
  const [budgets, setBudgets] = useState<Budget[]>(parentBudgets || []);
  const [loading, setLoading] = useState(!parentBudgets);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  useEffect(() => {
    if (parentBudgets) {
      setBudgets(parentBudgets);
      setLoading(false);
    } else {
      fetchBudgets();
    }
  }, [parentBudgets]);

  const fetchBudgets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getBudgets();
      setBudgets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (budgetId: string) => {
    const budget = budgets.find((b: any) => b.id === budgetId);
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  const handleDelete = async (budgetId: string) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await api.deleteBudget(budgetId);
        if (onRefresh) onRefresh();
        fetchBudgets();
      } catch (err: any) {
        setError('Failed to delete budget');
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBudget(null);
  };

  const handleFormSuccess = () => {
    if (onRefresh) onRefresh();
    fetchBudgets();
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalBudgeted - totalSpent);

  const alertBudgets = budgets.filter((b) => b.status === 'WARNING' || b.status === 'EXCEEDED');

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Target className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Monthly Budgets</h2>
          </div>
          <p className="text-xs text-slate-400">
            Category-level spending limits that automatically track all expenses since 1st of the month
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Budget
        </button>
      </div>

      {/* Aggregate Overview Metrics */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Allocated</span>
            <span className="text-xl font-bold text-white mt-1 block">{formatCurrency(totalBudgeted)}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Spent So Far</span>
            <span className="text-xl font-bold text-rose-400 mt-1 block">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Available to Spend</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{formatCurrency(totalRemaining)}</span>
          </div>
        </div>
      )}

      {/* Alerts banner if any budget is nearing or exceeding limit */}
      {alertBudgets.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-rose-300">Budget Warning</h4>
            <ul className="mt-1 space-y-1 text-rose-200">
              {alertBudgets.map((b) => (
                <li key={b.id}>
                  <strong>{b.name}:</strong> {b.status === 'EXCEEDED' ? 'Exceeded budget limit' : 'Spent over alert threshold'} ({b.percentageUsed.toFixed(1)}% used • {formatCurrency(b.spentAmount)} of {formatCurrency(b.amount)})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-500 rounded-2xl bg-slate-900/40 border border-slate-800">
          Loading budgets...
        </div>
      ) : error ? (
        <div className="p-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
          {error}
        </div>
      ) : budgets.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No active budgets yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Set up monthly budget targets for Food, Utilities, Transport or custom categories to monitor your real-time expenses.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/25 transition"
          >
            + Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <BudgetForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingBudget={editingBudget}
        categories={categories}
      />
    </div>
  );
};

export { BudgetsSection };
export default BudgetsSection;
