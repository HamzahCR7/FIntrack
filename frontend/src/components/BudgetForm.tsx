import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client';

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingBudget?: any;
  categories: any[];
}

const BudgetForm: React.FC<BudgetFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingBudget,
  categories,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    categoryIds: [] as string[],
    amount: '',
    alertThreshold: '80',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const rawIds = editingBudget?.categoryIds || (editingBudget?.categoryId ? [editingBudget.categoryId] : []);
    const selectedIds = Array.isArray(rawIds)
      ? rawIds.flatMap((id: string) => String(id).split(',')).map((id: string) => id.trim()).filter(Boolean)
      : String(rawIds).split(',').map((id: string) => id.trim()).filter(Boolean);

    if (editingBudget) {
      setFormData({
        name: editingBudget.name,
        categoryIds: selectedIds,
        amount: editingBudget.amount.toString(),
        alertThreshold: (editingBudget.alertThreshold ?? 80).toString(),
      });
    } else {
      setFormData({
        name: '',
        categoryIds: [],
        amount: '',
        alertThreshold: '80',
      });
    }
    setError('');
  }, [editingBudget, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const displayCategories = React.useMemo(() => {
    const rootCategories = categories.filter((cat) => !cat.parentId && !cat.name.includes(' > '));

    if (rootCategories.length > 0) {
      return rootCategories;
    }

    return categories.map((cat) => ({
      ...cat,
      name: cat.name.includes(' > ') ? cat.name.split(' > ')[0].trim() : cat.name,
    }));
  }, [categories]);

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => {
      const isSelected = prev.categoryIds.includes(categoryId);
      const nextCategoryIds = isSelected
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId];

      return { ...prev, categoryIds: nextCategoryIds };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.amount) {
      setError('Name and amount are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        categoryId: formData.categoryIds.length > 0 ? formData.categoryIds.join(',') : null,
        categoryIds: formData.categoryIds,
        amount: parseFloat(formData.amount),
        alertThreshold: parseFloat(formData.alertThreshold),
      };

      if (editingBudget) {
        await api.updateBudget(editingBudget.id, payload);
      } else {
        await api.createBudget(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-visible shadow-2xl space-y-6">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-base font-bold text-white">
            {editingBudget ? 'Edit Budget' : 'Create Budget'}
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 pt-0 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Budget Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Monthly Food"
              className="fintrack-input p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Categories (Optional)</label>
            <div className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-2.5">
              {displayCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                  {displayCategories.map((cat) => {
                    const isSelected = formData.categoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100'
                            : 'border-slate-600 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No categories available.</p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Select one or more categories. The budget will automatically track all spending from those categories so far.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Monthly Budget (₹)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="5000"
                min="0"
                step="0.01"
                className="fintrack-input p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Alert Threshold (%)</label>
              <input
                type="number"
                name="alertThreshold"
                value={formData.alertThreshold}
                onChange={handleChange}
                placeholder="80"
                min="0"
                max="100"
                className="fintrack-input p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingBudget ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { BudgetForm };
export default BudgetForm;
