import React, { useState } from 'react';
import { Account, Debt, DebtRecordKind, DebtType } from '../types';
import { formatCurrency } from './SummaryCards';
import { DatePicker } from './DatePicker';
import { ClearableSelect } from './ClearableSelect';
import { api } from '../api/client';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';

interface DebtsSectionProps {
  debts: {
    totalOwedToMe: number;
    totalIOwe: number;
    netOutstanding: number;
    activeDebtsCount: number;
    activeDebts: Debt[];
  };
  accounts?: Account[];
  onRefresh: () => void;
}

export const DebtsSection: React.FC<DebtsSectionProps> = ({ debts, accounts = [], onRefresh }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [settleDebtItem, setSettleDebtItem] = useState<Debt | null>(null);
  const [activeDebtTab, setActiveDebtTab] = useState<'LOANS' | DebtType>('LOANS');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [debtPage, setDebtPage] = useState(1);
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<DebtType>('OWED_TO_ME');
  const [recordKind, setRecordKind] = useState<DebtRecordKind>('PERSONAL');
  const [loanCategory, setLoanCategory] = useState('EDUCATION');
  const [loanItem, setLoanItem] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [amount, setAmount] = useState('');
  const [addAccountId, setAddAccountId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleAccountId, setSettleAccountId] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debtsPerPage = 4;
  const tabDebts = debts.activeDebts.filter((debt) => {
    if (activeDebtTab === 'LOANS') return debt.recordKind === 'LOAN';
    return debt.type === activeDebtTab && debt.recordKind !== 'LOAN';
  });
  const totalDebtPages = Math.max(1, Math.ceil(tabDebts.length / debtsPerPage));
  const currentDebtPage = Math.min(debtPage, totalDebtPages);
  const paginatedDebts = tabDebts.slice(
    (currentDebtPage - 1) * debtsPerPage,
    currentDebtPage * debtsPerPage
  );
  const loanCount = debts.activeDebts.filter((debt) => debt.recordKind === 'LOAN').length;
  const iOweCount = debts.activeDebts.filter((debt) => debt.type === 'I_OWE' && debt.recordKind !== 'LOAN').length;
  const owedToMeCount = debts.activeDebts.filter((debt) => debt.type === 'OWED_TO_ME').length;

  const resetDebtForm = () => {
    setEditingDebt(null);
    setPersonName('');
    setType('OWED_TO_ME');
    setRecordKind('PERSONAL');
    setLoanCategory('EDUCATION');
    setLoanItem('');
    setEmiAmount('');
    setAmount('');
    setAddAccountId('');
    setDueDate('');
    setNotes('');
    setError(null);
  };

  const openAddModal = (debtToEdit?: Debt) => {
    if (debtToEdit) {
      setEditingDebt(debtToEdit);
      setPersonName(debtToEdit.personName);
      setType(debtToEdit.type);
      setRecordKind(debtToEdit.recordKind || 'PERSONAL');
      setLoanCategory(debtToEdit.loanCategory || 'EDUCATION');
      setLoanItem(debtToEdit.loanItem || '');
      setEmiAmount(debtToEdit.emiAmount?.toString() || '');
      setAmount(debtToEdit.amount.toString());
      setDueDate(debtToEdit.dueDate ? new Date(debtToEdit.dueDate).toISOString().split('T')[0] : '');
      setNotes(debtToEdit.notes || '');
      setAddAccountId('');
      setError(null);
    } else {
      resetDebtForm();
    }
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    resetDebtForm();
  };

  const handleDebtTabChange = (tab: 'LOANS' | DebtType) => {
    setActiveDebtTab(tab);
    setDebtPage(1);
    setExpandedDebtId(null);
  };

  const handleAddDebt = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      if (editingDebt) {
        await api.updateDebt(editingDebt.id, {
          personName,
          type,
          recordKind,
          loanCategory: recordKind === 'LOAN' ? loanCategory : undefined,
          loanItem: recordKind === 'LOAN' && loanItem ? loanItem : undefined,
          emiAmount: recordKind === 'LOAN' && emiAmount ? parseFloat(emiAmount) : undefined,
          amount: numericAmount,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
        });
      } else {
        await api.createDebt({
          personName,
          type,
          recordKind,
          loanCategory: recordKind === 'LOAN' ? loanCategory : undefined,
          loanItem: recordKind === 'LOAN' && loanItem ? loanItem : undefined,
          emiAmount: recordKind === 'LOAN' && emiAmount ? parseFloat(emiAmount) : undefined,
          amount: numericAmount,
          accountId: addAccountId || undefined,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
        });
      }
      closeAddModal();
      onRefresh();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to save debt record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settleDebtItem) return;

    const numericAmount = parseFloat(settleAmount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive settlement amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.settleDebt(settleDebtItem.id, numericAmount, settleAccountId || undefined, settleDate || undefined);
      setSettleDebtItem(null);
      setSettleAmount('');
      setSettleAccountId('');
      setSettleDate(new Date().toISOString().split('T')[0]);
      onRefresh();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to settle debt record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this debt record?')) return;

    try {
      await api.deleteDebt(id);
      onRefresh();
    } catch (requestError) {
      console.error(requestError);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-700/60 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Money Owed & Borrowed</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">Track loans, repayments, and money lent to others</p>
        </div>
        <button
          type="button"
          onClick={() => openAddModal()}
          className="flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-500 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Record Debt / Loan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="They Owe Me" amount={debts.totalOwedToMe} color="emerald" icon={ArrowUpRight} />
        <SummaryCard label="I Owe" amount={debts.totalIOwe} color="rose" icon={ArrowDownRight} />
        <SummaryCard
          label="Net Owed Balance"
          amount={debts.netOutstanding}
          color={debts.netOutstanding >= 0 ? 'blue' : 'amber'}
          icon={UserCheck}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Debt Records</h4>
          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-400">
            {debts.activeDebtsCount} {debts.activeDebtsCount === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="grid grid-cols-3 border-b border-slate-700">
          <button
            type="button"
            onClick={() => handleDebtTabChange('LOANS')}
            className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeDebtTab === 'LOANS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Loans ({loanCount})
          </button>
          <button
            type="button"
            onClick={() => handleDebtTabChange('I_OWE')}
            className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeDebtTab === 'I_OWE'
                ? 'border-rose-400 text-rose-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Borrowed ({iOweCount})
          </button>
          <button
            type="button"
            onClick={() => handleDebtTabChange('OWED_TO_ME')}
            className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeDebtTab === 'OWED_TO_ME'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Lent ({owedToMeCount})
          </button>
        </div>

        {tabDebts.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center text-xs italic text-slate-400">
            No active {activeDebtTab === 'LOANS' ? 'loan' : activeDebtTab === 'I_OWE' ? 'borrowed money' : 'money lent'} records.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedDebts.map((debt) => {
                const isOwedToMe = debt.type === 'OWED_TO_ME';
                const isLoan = debt.recordKind === 'LOAN';
                const isExpanded = expandedDebtId === debt.id;
                const dueDateFormatted = debt.dueDate
                  ? new Date(debt.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;

                return (
                  <div
                    key={debt.id}
                    className={`rounded-xl border transition-colors ${
                      isLoan
                        ? 'border-amber-500/30 bg-slate-900/60 hover:border-amber-500/60'
                        : isOwedToMe
                        ? 'border-emerald-500/30 bg-slate-900/60 hover:border-emerald-500/60'
                        : 'border-rose-500/30 bg-slate-900/60 hover:border-rose-500/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                      className="flex w-full items-center justify-between gap-4 p-3.5 text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-white">{debt.personName}</span>
                          <span
                            className={`shrink-0 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isLoan
                                ? 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                                : isOwedToMe
                                ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                                : 'border-rose-500/30 bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {isLoan ? `${debt.loanCategory || 'Loan'} Loan` : isOwedToMe ? 'Lent' : 'Borrowed'}
                          </span>
                        </div>
                        {dueDateFormatted && <p className="mt-1 text-[11px] text-slate-400">Due {dueDateFormatted}</p>}
                        {isLoan && debt.loanItem && <p className="mt-1 text-[11px] text-slate-400">Item: {debt.loanItem}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="text-right">
                          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Remaining</span>
                          <span className={`text-base font-bold ${isOwedToMe ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(debt.remainingAmount)}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-800 px-3.5 py-3">
                        <div className="mb-3 space-y-1 text-xs text-slate-400">
                          <p>
                            Total: <span className="font-medium text-slate-200">{formatCurrency(debt.amount)}</span> | Settled:{' '}
                            <span className="font-medium text-emerald-400">{formatCurrency(debt.settledAmount)}</span>
                          </p>
                          {isLoan && debt.emiAmount && <p>Monthly EMI: <span className="font-medium text-amber-300">{formatCurrency(debt.emiAmount)}</span></p>}
                          {dueDateFormatted && (
                            <p className="flex items-center gap-1 text-[11px]">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              Due: {dueDateFormatted}
                            </p>
                          )}
                          {debt.notes && <p className="text-[11px] italic">"{debt.notes}"</p>}
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <IconButton title="Edit record" onClick={() => openAddModal(debt)} icon={<Pencil className="h-3.5 w-3.5" />} />
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                              setSettleDebtItem(debt);
                              setSettleAmount(debt.remainingAmount.toString());
                              setSettleAccountId('');
                              setSettleDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-600/20 px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 transition-colors hover:bg-blue-600/30"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Settle
                          </button>
                          <IconButton
                            title="Delete record"
                            onClick={() => handleDelete(debt.id)}
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                            danger
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalDebtPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="text-xs text-slate-400">Page {currentDebtPage} of {totalDebtPages}</span>
                <div className="flex items-center gap-1.5">
                  <PageButton
                    title="Previous debt records page"
                    disabled={currentDebtPage === 1}
                    onClick={() => setDebtPage((page) => Math.max(1, page - 1))}
                    icon={<ChevronLeft className="h-4 w-4" />}
                  />
                  <PageButton
                    title="Next debt records page"
                    disabled={currentDebtPage === totalDebtPages}
                    onClick={() => setDebtPage((page) => Math.min(totalDebtPages, page + 1))}
                    icon={<ChevronRight className="h-4 w-4" />}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {isAddModalOpen && (
        <Modal title={editingDebt ? 'Edit Debt Record' : 'Record Money Owed / Borrowed'} onClose={closeAddModal}>
          <form onSubmit={handleAddDebt} className="space-y-4 text-xs">
            {error && <ErrorMessage message={error} />}
            <FormInput label={recordKind === 'LOAN' ? 'Lender Name' : 'Person Name'} value={personName} onChange={setPersonName} placeholder={recordKind === 'LOAN' ? 'e.g. Gramin Bank / SBI' : 'e.g. Rahul / John Doe'} required />
            <RecordKindSelector
              type={type}
              recordKind={recordKind}
              onChange={(nextType, nextRecordKind) => {
                setType(nextType);
                setRecordKind(nextRecordKind);
              }}
            />
            <FormInput label="Amount (INR)" value={amount} onChange={setAmount} placeholder="e.g. 2500" type="number" required />
            {recordKind === 'LOAN' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">Loan Type</label>
                  <ClearableSelect value={loanCategory} onValueChange={setLoanCategory} defaultValue="EDUCATION" className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-amber-500">
                    <option value="EDUCATION">Education</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="VEHICLE">Vehicle</option>
                    <option value="HOME">Home</option>
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="OTHER">Other</option>
                  </ClearableSelect>
                </div>
                <FormInput label="Item (Optional)" value={loanItem} onChange={setLoanItem} placeholder="e.g. Laptop / Mobile" />
                <FormInput label="Monthly EMI (Optional)" value={emiAmount} onChange={setEmiAmount} placeholder="e.g. 5000" type="number" />
              </div>
            )}
            {!editingDebt && accounts.length > 0 && (
              <AccountSelect
                label={type === 'OWED_TO_ME' ? 'Payment Account (Optional)' : 'Account to Credit (Only for New Loan Money)'}
                value={addAccountId}
                onChange={setAddAccountId}
                accounts={accounts}
              />
            )}
            <div>
              <label className="mb-1 block font-semibold text-slate-300">Due Date (Optional)</label>
              <DatePicker value={dueDate} onChange={setDueDate} accent="blue" />
            </div>
            <FormInput label="Notes (Optional)" value={notes} onChange={setNotes} placeholder="e.g. Education loan repayment" />
            <ModalActions onCancel={closeAddModal} isSubmitting={isSubmitting} submitLabel={editingDebt ? 'Update Record' : 'Save Record'} />
          </form>
        </Modal>
      )}

      {settleDebtItem && (
        <Modal title={`Settle Debt - ${settleDebtItem.personName}`} onClose={() => setSettleDebtItem(null)}>
          <form onSubmit={handleSettle} className="space-y-4 text-xs">
            {error && <ErrorMessage message={error} />}
            <p className="rounded-lg bg-slate-800 p-3 text-slate-300">
              Remaining balance: <span className="font-bold text-white">{formatCurrency(settleDebtItem.remainingAmount)}</span>
            </p>
            <FormInput label="Payment Amount (INR)" value={settleAmount} onChange={setSettleAmount} type="number" required />
            <div>
              <label className="mb-1 block font-semibold text-slate-300">Settlement Date</label>
              <DatePicker value={settleDate} onChange={setSettleDate} accent="blue" />
            </div>
            {accounts.length > 0 && <AccountSelect label="Payment Account (Optional)" value={settleAccountId} onChange={setSettleAccountId} accounts={accounts} />}
            <ModalActions onCancel={() => setSettleDebtItem(null)} isSubmitting={isSubmitting} submitLabel="Record Payment" />
          </form>
        </Modal>
      )}
    </div>
  );
};

type SummaryColor = 'emerald' | 'rose' | 'blue' | 'amber';

const summaryCardColors: Record<SummaryColor, { container: string; label: string; amount: string; icon: string }> = {
  emerald: { container: 'border-emerald-500/20 bg-emerald-500/10', label: 'text-emerald-400', amount: 'text-emerald-300', icon: 'bg-emerald-500/20 text-emerald-300' },
  rose: { container: 'border-rose-500/20 bg-rose-500/10', label: 'text-rose-400', amount: 'text-rose-300', icon: 'bg-rose-500/20 text-rose-300' },
  blue: { container: 'border-blue-500/20 bg-blue-500/10', label: 'text-blue-400', amount: 'text-blue-300', icon: 'bg-blue-500/20 text-blue-300' },
  amber: { container: 'border-amber-500/20 bg-amber-500/10', label: 'text-amber-400', amount: 'text-amber-300', icon: 'bg-amber-500/20 text-amber-300' },
};

const SummaryCard = ({ label, amount, color, icon: Icon }: { label: string; amount: number; color: SummaryColor; icon: React.ComponentType<{ className?: string }> }) => {
  const styles = summaryCardColors[color];

  return (
  <div className={`flex items-center justify-between rounded-xl border p-4 ${styles.container}`}>
    <div>
      <span className={`block text-[11px] font-semibold uppercase tracking-wider ${styles.label}`}>{label}</span>
      <span className={`mt-0.5 block text-xl font-bold ${styles.amount}`}>{formatCurrency(amount)}</span>
    </div>
    <div className={`rounded-xl p-2.5 ${styles.icon}`}><Icon className="h-5 w-5" /></div>
  </div>
  );
};

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}
    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-6 backdrop-blur-sm"
  >
    <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 p-5">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 space-y-4 overflow-y-auto p-5 pt-0 text-xs">
        {children}
      </div>
    </div>
  </div>
);

const FormInput = ({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) => (
  <div>
    <label className="mb-1 block font-semibold text-slate-300">{label}</label>
    <input type={type} step={type === 'number' ? '0.01' : undefined} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-blue-500" />
  </div>
);

const RecordKindSelector = ({ type, recordKind, onChange }: { type: DebtType; recordKind: DebtRecordKind; onChange: (type: DebtType, recordKind: DebtRecordKind) => void }) => (
  <div>
    <label className="mb-1 block font-semibold text-slate-300">What are you tracking?</label>
    <div className="grid grid-cols-3 gap-2">
      <button type="button" onClick={() => onChange('OWED_TO_ME', 'PERSONAL')} className={`rounded-xl border py-2 font-semibold ${type === 'OWED_TO_ME' && recordKind === 'PERSONAL' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>Lent</button>
      <button type="button" onClick={() => onChange('I_OWE', 'PERSONAL')} className={`rounded-xl border py-2 font-semibold ${type === 'I_OWE' && recordKind === 'PERSONAL' ? 'border-rose-500 bg-rose-600 text-white' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>Borrowed</button>
      <button type="button" onClick={() => onChange('I_OWE', 'LOAN')} className={`rounded-xl border py-2 font-semibold ${recordKind === 'LOAN' ? 'border-amber-500 bg-amber-600 text-white' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>Loan</button>
    </div>
  </div>
);

const AccountSelect = ({ label, value, onChange, accounts }: { label: string; value: string; onChange: (value: string) => void; accounts: Account[] }) => (
  <div>
    <label className="mb-1 block font-semibold text-slate-300">{label}</label>
    <ClearableSelect value={value} onValueChange={onChange} defaultValue="" className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-blue-500">
      <option value="">Do not update account balance</option>
      {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.type})</option>)}
    </ClearableSelect>
  </div>
);

const ModalActions = ({ onCancel, isSubmitting, submitLabel }: { onCancel: () => void; isSubmitting: boolean; submitLabel: string }) => (
  <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
    <button type="button" onClick={onCancel} className="rounded-xl bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700">Cancel</button>
    <button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50">{isSubmitting ? 'Saving...' : submitLabel}</button>
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 font-medium text-rose-400">{message}</div>;

const IconButton = ({ title, onClick, icon, danger = false }: { title: string; onClick: () => void; icon: React.ReactNode; danger?: boolean }) => (
  <button type="button" onClick={onClick} title={title} className={`rounded-lg p-1.5 transition-colors ${danger ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}>{icon}</button>
);

const PageButton = ({ title, disabled, onClick, icon }: { title: string; disabled: boolean; onClick: () => void; icon: React.ReactNode }) => (
  <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 disabled:cursor-not-allowed disabled:opacity-40">{icon}</button>
);
