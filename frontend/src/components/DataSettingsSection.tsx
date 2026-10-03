import React, { useMemo, useState } from 'react';
import { Account, AccountType, Category, Transaction } from '../types';
import { api } from '../api/client';
import { CreditCard, Landmark, Pencil, Plus, Tags, Trash2, WalletCards, X } from 'lucide-react';
import { DEFAULT_PAYMENT_METHODS, getCustomPaymentMethods, paymentMethodLabel, paymentMethodValue, saveCustomPaymentMethods } from '../utils/paymentMethods';

type Section = 'accounts' | 'methods' | 'categories';
const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'BANK_ACCOUNT', label: 'Bank account' }, { value: 'CREDIT_CARD', label: 'Credit card' }, { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / wallet' }, { value: 'AMAZON_PAY', label: 'Amazon Pay' },
];
const fieldClass = 'rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm';

interface Props { categories: Category[]; accounts: Account[]; transactions: Transaction[]; onRefresh: () => void }

export const DataSettingsSection: React.FC<Props> = ({ categories, accounts, transactions, onRefresh }) => {
  const [section, setSection] = useState<Section>('accounts');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('BANK_ACCOUNT');
  const [institution, setInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [includeInTotalBalance, setIncludeInTotalBalance] = useState(true);
  const [customMethods, setCustomMethods] = useState(getCustomPaymentMethods);
  const [methodName, setMethodName] = useState('');
  const knownMethods = useMemo(() => Array.from(new Set([...DEFAULT_PAYMENT_METHODS.map(paymentMethodValue), ...customMethods, ...transactions.map((item) => item.paymentMethod)].filter(Boolean))), [customMethods, transactions]);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await work(); onRefresh(); } catch (reason: any) { setError(reason.response?.data?.message || reason.message || 'Could not save changes.'); }
    finally { setBusy(false); }
  };
  const openAccount = (account?: Account) => {
    setEditingAccount(account || null); setAccountName(account?.name || ''); setAccountType(account?.type || 'BANK_ACCOUNT');
    setInstitution(account?.institution || ''); setInitialBalance(account ? String(account.currentBalance) : '0');
    setIncludeInTotalBalance(account?.includeInTotalBalance !== false); setShowAccountForm(true); setError('');
  };
  const openNewWallet = () => {
    openAccount();
    setAccountType('UPI');
    setIncludeInTotalBalance(false);
  };
  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault(); if (!accountName.trim()) return;
    await run(async () => {
      if (editingAccount) await api.updateAccount(editingAccount.id, { name: accountName.trim(), type: accountType, institution: institution.trim() || undefined, includeInTotalBalance });
      else await api.createAccount({ name: accountName.trim(), type: accountType, institution: institution.trim() || undefined, initialBalance: Number(initialBalance) || 0, includeInTotalBalance } as any);
      setShowAccountForm(false);
    });
  };
  const addMethod = (event: React.FormEvent) => {
    event.preventDefault(); const value = paymentMethodValue(methodName); if (!value) return;
    const next = Array.from(new Set([...customMethods, value])); setCustomMethods(next); saveCustomPaymentMethods(next); setMethodName('');
  };
  const tabs: { id: Section; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'accounts', label: 'Accounts', icon: Landmark, count: accounts.length }, { id: 'methods', label: 'Payment methods', icon: CreditCard, count: knownMethods.length },
    { id: 'categories', label: 'Categories', icon: Tags, count: categories.length },
  ];

  return <div className="space-y-5">
    <div className="grid gap-2 sm:grid-cols-3">{tabs.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${section === id ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'}`}><span className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4" />{label}</span><span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px]">{count}</span></button>)}</div>
    {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

    {section === 'accounts' && <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-white">Money sources</h2><p className="text-xs text-slate-400">These appear in the From and To account fields.</p></div><div className="flex gap-2"><button onClick={openNewWallet} className="flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200"><WalletCards className="h-4 w-4" />Add wallet</button><button onClick={() => openAccount()} className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold"><Plus className="h-4 w-4" />Add account</button></div></div>
      {showAccountForm && <form onSubmit={saveAccount} className="grid gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-4 sm:grid-cols-2">
        <div className="flex items-center justify-between sm:col-span-2"><h3 className="text-sm font-semibold text-white">{editingAccount ? 'Edit account' : 'New account'}</h3><button type="button" onClick={() => setShowAccountForm(false)}><X className="h-4 w-4 text-slate-400" /></button></div>
        <input required value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account name" className={fieldClass} />
        <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className={fieldClass}>{ACCOUNT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Institution (optional)" className={fieldClass} />
        {!editingAccount && <input type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="Opening balance" className={fieldClass} />}
        <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-slate-300 sm:col-span-2">
          <input type="checkbox" checked={includeInTotalBalance} onChange={(e) => setIncludeInTotalBalance(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-500" />
          <span><strong className="block text-slate-100">Include in total balance</strong><span className="text-[10px] text-slate-500">Turn this off for wallets or accounts you want to track separately.</span></span>
        </label>
        <button disabled={busy} className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50 sm:col-span-2">{editingAccount ? 'Save changes' : 'Create account'}</button>
      </form>}
      <div className="grid gap-2 sm:grid-cols-2">{accounts.map((account) => <div key={account.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-100">{account.name}</p><p className="text-[10px] text-slate-500">{ACCOUNT_TYPES.find((type) => type.value === account.type)?.label || account.type}{account.institution ? ` · ${account.institution}` : ''}</p><p className={`mt-1 text-[10px] ${account.includeInTotalBalance === false ? 'text-amber-300' : 'text-emerald-400'}`}>{account.includeInTotalBalance === false ? 'Tracked separately' : 'Included in total'}</p></div><div className="flex gap-1"><button onClick={() => openAccount(account)} className="rounded-lg p-2 text-cyan-300 hover:bg-slate-800" aria-label={`Edit ${account.name}`}><Pencil className="h-4 w-4" /></button><button onClick={() => { if (confirm(`Archive “${account.name}”? Existing transactions remain unchanged.`)) void run(() => api.deleteAccount(account.id)); }} className="rounded-lg p-2 text-amber-300 hover:bg-slate-800" aria-label={`Archive ${account.name}`}><Trash2 className="h-4 w-4" /></button></div></div>)}</div>
    </div>}

    {section === 'methods' && <div className="space-y-4"><div><h2 className="font-bold text-white">Payment methods</h2><p className="text-xs text-slate-400">Create reusable labels, or type a new method while recording a transaction.</p></div><form onSubmit={addMethod} className="flex gap-2"><input value={methodName} onChange={(e) => setMethodName(e.target.value)} placeholder="e.g. Visa debit, Apple Pay, Cheque" className={`min-w-0 flex-1 ${fieldClass}`} /><button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold">Add</button></form><div className="flex flex-wrap gap-2">{knownMethods.map((method) => { const removable = customMethods.includes(method); return <span key={method} className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200"><WalletCards className="h-3.5 w-3.5 text-cyan-300" />{paymentMethodLabel(method)}{removable && <button onClick={() => { const next = customMethods.filter((item) => item !== method); setCustomMethods(next); saveCustomPaymentMethods(next); }} className="ml-1 text-slate-500 hover:text-rose-300" aria-label={`Remove ${paymentMethodLabel(method)}`}><X className="h-3.5 w-3.5" /></button>}</span>; })}</div></div>}

    {section === 'categories' && <div className="space-y-4"><div><h2 className="font-bold text-white">Categories</h2><p className="text-xs text-slate-400">Rename inline or archive safely without changing old transactions.</p></div><form onSubmit={(event) => { event.preventDefault(); if (categoryName.trim()) void run(async () => { await api.createCategory({ name: categoryName.trim(), icon: 'tag', color: '#64748b' }); setCategoryName(''); }); }} className="flex gap-2"><input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="New category" className={`min-w-0 flex-1 ${fieldClass}`} /><button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold">Add</button></form><div className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">{categories.map((category) => <div key={category.id} className="flex items-center gap-3 px-4 py-3">{editingCategory?.id === category.id ? <input autoFocus value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-cyan-400/40 bg-slate-950 px-2 py-1 text-sm" /> : <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{category.icon || '•'} {category.name}</span>}<div className="flex gap-2">{editingCategory?.id === category.id ? <><button onClick={() => void run(async () => { await api.updateCategory(category.id, { name: editingCategory.name.trim() }); setEditingCategory(null); })} className="text-xs text-cyan-300">Save</button><button onClick={() => setEditingCategory(null)} className="text-xs text-slate-400">Cancel</button></> : <><button onClick={() => setEditingCategory({ ...category })} className="text-xs text-cyan-300">Rename</button><button onClick={() => { if (confirm(`Archive “${category.name}”? Existing transactions keep their category.`)) void run(() => api.archiveCategory(category.id)); }} className="text-xs text-amber-300">Archive</button></>}</div></div>)}</div></div>}
  </div>;
};
