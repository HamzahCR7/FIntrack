import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client';
import { ClearableSelect } from './ClearableSelect';

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingGoal?: any;
}

const GoalForm: React.FC<GoalFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingGoal,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'SAVINGS',
    targetAmount: '',
    deadline: '',
    priority: 'MEDIUM',
    category: '',
    autoContribute: false,
    monthlyTarget: '',
    emiMonths: '',
    emiAmount: '',
    downPayment: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingGoal) {
      const deadline = editingGoal.deadline
        ? new Date(editingGoal.deadline).toISOString().split('T')[0]
        : '';

      setFormData({
        name: editingGoal.name,
        description: editingGoal.description || '',
        type: editingGoal.type,
        targetAmount: editingGoal.targetAmount.toString(),
        deadline,
        priority: editingGoal.priority,
        category: editingGoal.category || '',
        autoContribute: editingGoal.autoContribute,
        monthlyTarget: editingGoal.monthlyTarget?.toString() || '',
        emiMonths: editingGoal.emiMonths?.toString() || '',
        emiAmount: editingGoal.emiAmount?.toString() || '',
        downPayment: editingGoal.downPayment?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'SAVINGS',
        targetAmount: '',
        deadline: '',
        priority: 'MEDIUM',
        category: '',
        autoContribute: false,
        monthlyTarget: '',
        emiMonths: '',
        emiAmount: '',
        downPayment: '',
      });
    }
    setError('');
  }, [editingGoal, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.targetAmount || !formData.deadline) {
      setError('Name, target amount, and deadline are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const deadline = new Date(formData.deadline);
      deadline.setHours(23, 59, 59, 999);

      const payload = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: deadline.toISOString(),
        priority: formData.priority,
        category: formData.category || null,
        autoContribute: formData.autoContribute,
        monthlyTarget: formData.monthlyTarget ? parseFloat(formData.monthlyTarget) : null,
        emiMonths: formData.type === 'EMI' && formData.emiMonths ? parseInt(formData.emiMonths, 10) : null,
        emiAmount: formData.type === 'EMI' && formData.emiAmount ? parseFloat(formData.emiAmount) : null,
        downPayment: formData.type === 'EMI' && formData.downPayment ? parseFloat(formData.downPayment) : null,
      };

      if (editingGoal) {
        await api.updateGoal(editingGoal.id, payload);
      } else {
        await api.createGoal(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save goal');
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
            {editingGoal ? 'Edit Goal' : 'Create Goal'}
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
            <label className="text-slate-300 font-semibold block mb-1">Goal Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Vacation Fund"
              className="fintrack-input p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Why this goal matters..."
              rows={2}
              className="fintrack-input p-2.5 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Goal Type *</label>
              <ClearableSelect
                name="type"
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: value,
                  }))
                }
                defaultValue="SAVINGS"
                className="fintrack-select p-2.5 text-sm"
              >
                <option value="SAVINGS">Savings</option>
                <option value="INVESTMENT">Investment</option>
                <option value="EXPENSE_REDUCTION">Expense Reduction</option>
                <option value="EMI">EMI</option>
              </ClearableSelect>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Priority</label>
              <ClearableSelect
                name="priority"
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: value,
                  }))
                }
                defaultValue="MEDIUM"
                className="fintrack-select p-2.5 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </ClearableSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Target Amount (₹) *</label>
              <input
                type="number"
                name="targetAmount"
                value={formData.targetAmount}
                onChange={handleChange}
                placeholder="50000"
                min="0"
                step="0.01"
                className="fintrack-input p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Deadline *</label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="fintrack-input p-2.5 text-sm date-field"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Category (Optional)</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Travel, Education"
              className="fintrack-input p-2.5 text-sm"
            />
          </div>

          {formData.type === 'EMI' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">EMI Months</label>
                <input
                  type="number"
                  name="emiMonths"
                  value={formData.emiMonths}
                  onChange={handleChange}
                  placeholder="12"
                  className="fintrack-input p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">EMI Amount</label>
                <input
                  type="number"
                  name="emiAmount"
                  value={formData.emiAmount}
                  onChange={handleChange}
                  placeholder="5000"
                  min="0"
                  step="0.01"
                  className="fintrack-input p-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {formData.type === 'EMI' && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Down Payment</label>
              <input
                type="number"
                name="downPayment"
                value={formData.downPayment}
                onChange={handleChange}
                placeholder="20000"
                min="0"
                step="0.01"
                className="fintrack-input p-2.5 text-sm"
              />
            </div>
          )}

          {!['EMI'].includes(formData.type) && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Monthly Target</label>
              <input
                type="number"
                name="monthlyTarget"
                value={formData.monthlyTarget}
                onChange={handleChange}
                placeholder="5000"
                min="0"
                step="0.01"
                className="fintrack-input p-2.5 text-sm"
              />
            </div>
          )}

          <label className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2 text-slate-200">
            <span className="text-sm font-medium">Auto Contribute</span>
            <input
              type="checkbox"
              name="autoContribute"
              checked={formData.autoContribute}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
            />
          </label>

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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/25 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingGoal ? 'Update Goal' : 'Save Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { GoalForm };
export default GoalForm;
