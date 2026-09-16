import React, { useState, useEffect } from 'react';
import { DebtType, DebtRecordKind, Account } from '../types';
import { X, HandCoins } from 'lucide-react';
import { api } from '../api/client';
import { DatePicker } from './DatePicker';
import { ClearableSelect } from './ClearableSelect';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts?: Account[];
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({ isOpen, onClose, onSuccess, accounts = [] }) => {
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<DebtType>('OWED_TO_ME');
  const [recordKind, setRecordKind] = useState<DebtRecordKind>('PERSONAL');
  const [loanCategory, setLoanCategory] = useState('EDUCATION');
  const [loanItem, setLoanItem] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPersonName('');
      setType('OWED_TO_ME');
      setRecordKind('PERSONAL');
      setLoanCategory('EDUCATION');
      setLoanItem('');
      setEmiAmount('');
      setAmount('');
      setDueDate('');
      setNotes('');
      setError(null);
      setIsSubmitting(false);
      setAccountId('');
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createDebt({
        personName,
        type,
        recordKind,
        loanCategory: recordKind === 'LOAN' ? loanCategory : undefined,
        loanItem: recordKind === 'LOAN' && loanItem ? loanItem : undefined,
        emiAmount: recordKind === 'LOAN' && emiAmount ? parseFloat(emiAmount) : undefined,
        amount: numAmount,
        accountId: accountId || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });
      setIsSubmitting(false);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.response?.data?.message || err.message || 'Failed to add debt record');
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
            <HandCoins className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Record Money Owed / Borrowed</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAddDebt} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-slate-300 font-semibold block mb-1">{recordKind === 'LOAN' ? 'Lender Name' : 'Person Name'}</label>
            <input
              type="text"
              required
              placeholder={recordKind === 'LOAN' ? 'e.g. Gramin Bank / SBI' : 'e.g. Rahul / John Doe'}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">What are you tracking?</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('OWED_TO_ME');
                  setRecordKind('PERSONAL');
                }}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  type === 'OWED_TO_ME'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Lent
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('I_OWE');
                  setRecordKind('PERSONAL');
                }}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  type === 'I_OWE'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Borrowed
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('I_OWE');
                  setRecordKind('LOAN');
                }}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  recordKind === 'LOAN'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Loan
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="e.g. 2500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {recordKind === 'LOAN' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Loan Type</label>
                <ClearableSelect
                  value={loanCategory}
                  onValueChange={setLoanCategory}
                  defaultValue="EDUCATION"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="EDUCATION">Education</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="VEHICLE">Vehicle</option>
                  <option value="HOME">Home</option>
                  <option value="ELECTRONICS">Electronics</option>
                  <option value="OTHER">Other</option>
                </ClearableSelect>
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Item (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Laptop / Mobile"
                  value={loanItem}
                  onChange={(e) => setLoanItem(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Monthly EMI (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={emiAmount}
                  onChange={(e) => setEmiAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {accounts.length > 0 && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                {type === 'OWED_TO_ME'
                  ? 'Payment Account (Deducted from Balance)'
                  : 'Account to Credit (Only for Newly Received Loan Money)'}
              </label>
              <ClearableSelect
                value={accountId}
                onValueChange={setAccountId}
                defaultValue=""
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Do not update account balance</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </ClearableSelect>
            </div>
          )}

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Due Date (Required for Bill Reminders)</label>
            <DatePicker value={dueDate} onChange={setDueDate} accent="emerald" />
            <p className="text-[10px] text-slate-400 mt-1">
              💡 Setting a due date displays this bill in the <strong>Bill Due Reminders & Countdown Timeline</strong>.
            </p>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Notes / Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Dinner bill split / Emergency cash"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Debt Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
