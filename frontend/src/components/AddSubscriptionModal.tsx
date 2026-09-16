import React, { useState, useEffect } from 'react';
import { Account, Category, BillingCycle } from '../types';
import { X, Repeat } from 'lucide-react';
import { api } from '../api/client';
import { DatePicker } from './DatePicker';
import axios from 'axios';
import { ClearableSelect } from './ClearableSelect';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
}

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [nextBillingDate, setNextBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultSourceAccountId = accounts.length > 0 ? accounts[0].id : '';
  const defaultCategoryId =
    categories.find((c) => c.name.toLowerCase().includes('sub') || c.name.toLowerCase().includes('util'))?.id ||
    categories[0]?.id ||
    '';

  useEffect(() => {
    if (isOpen) {
      setName('');
      setAmount('');
      setBillingCycle('MONTHLY');
      setNextBillingDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError(null);
      setIsSubmitting(false);

      setSourceAccountId(defaultSourceAccountId);
      setCategoryId(defaultCategoryId);
    }
  }, [isOpen, defaultSourceAccountId, defaultCategoryId]);

  if (!isOpen) return null;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (!sourceAccountId) {
      setError('Please select a payment account.');
      return;
    }

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.post('/api/v1/subscriptions', {
        name,
        amount: numAmount,
        billingCycle,
        sourceAccountId,
        categoryId,
        nextBillingDate: new Date(nextBillingDate).toISOString(),
        notes: notes || undefined,
      });
      setIsSubmitting(false);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.response?.data?.message || err.message || 'Failed to create subscription commitment');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Add Recurring Subscription</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Subscription Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Netflix / Spotify / ChatGPT Plus"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 649"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Billing Cycle</label>
              <ClearableSelect
                value={billingCycle}
                onValueChange={(value) => setBillingCycle(value as BillingCycle)}
                defaultValue="MONTHLY"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="EVERY_28_DAYS">Every 28 Days</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </ClearableSelect>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Payment Account</label>
            <ClearableSelect
              value={sourceAccountId}
              onValueChange={setSourceAccountId}
              defaultValue={defaultSourceAccountId}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </ClearableSelect>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Category</label>
            <ClearableSelect
              value={categoryId}
              onValueChange={setCategoryId}
              defaultValue={defaultCategoryId}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </ClearableSelect>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Next Billing Date</label>
            <DatePicker value={nextBillingDate} onChange={setNextBillingDate} required accent="indigo" />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Shared family plan / Annual auto-renew"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
