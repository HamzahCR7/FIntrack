import React, { useEffect, useMemo, useState } from 'react';
import { Account, DashboardData, Transaction } from '../types';
import { formatCurrency } from '../utils/privacyStore';
import { getTransactionOutbox, OutboxOperation, syncTransactionOutbox } from '../utils/transactionOutbox';

type HubTab = 'sync' | 'net-worth' | 'recurring' | 'review' | 'household';
type HouseholdState = { members: string[]; allocations: Record<string, { member: string; percent: number }>; settled: Record<string, number> };

const HOUSEHOLD_KEY = 'fintrack_household_v1';
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const cleanLabel = (transaction: Transaction) =>
  (transaction.merchant || transaction.description || transaction.category?.name || 'Transaction').trim();

const readHousehold = (): HouseholdState => {
  try {
    const value = JSON.parse(localStorage.getItem(HOUSEHOLD_KEY) || '') as HouseholdState;
    return { ...value, settled: value.settled || {} };
  } catch {
    return { members: [], allocations: {}, settled: {} };
  }
};

export const FinancialIntelligenceHub: React.FC<{
  transactions: Transaction[];
  accounts: Account[];
  dashboardData: DashboardData;
}> = ({ transactions, accounts, dashboardData }) => {
  const [tab, setTab] = useState<HubTab>('sync');
  const [outbox, setOutbox] = useState<OutboxOperation[]>([]);
  const [household, setHousehold] = useState<HouseholdState>(readHousehold);
  const [memberName, setMemberName] = useState('');

  const refreshOutbox = () => void getTransactionOutbox().then(setOutbox);
  useEffect(() => {
    refreshOutbox();
    window.addEventListener('fintrack-outbox-change', refreshOutbox);
    return () => window.removeEventListener('fintrack-outbox-change', refreshOutbox);
  }, []);

  useEffect(() => localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(household)), [household]);

  const netWorth = useMemo(() => {
    const liquidAssets = accounts.filter((account) => account.type !== 'CREDIT_CARD').reduce((sum, account) => sum + account.currentBalance, 0);
    const investments = accounts.filter((account) => /invest|demat|mutual|stock|fund/i.test(`${account.name} ${account.institution || ''}`)).reduce((sum, account) => sum + account.currentBalance, 0);
    const liabilities = dashboardData.summary.creditOutstanding + dashboardData.debts.totalIOwe;
    const current = liquidAssets + dashboardData.debts.totalOwedToMe - liabilities;
    const monthlyFlows = new Map<string, number>();
    transactions.forEach((transaction) => {
      const key = monthKey(new Date(transaction.transactionDate));
      const flow = transaction.type === 'INCOME' ? transaction.amount : transaction.type === 'EXPENSE' ? -transaction.amount : 0;
      monthlyFlows.set(key, (monthlyFlows.get(key) || 0) + flow);
    });
    let cursor = current;
    const timeline = Array.from({ length: 12 }, (_, offset) => {
      const date = new Date();
      date.setMonth(date.getMonth() - offset);
      const key = monthKey(date);
      const point = { key, label: date.toLocaleString(undefined, { month: 'short', year: '2-digit' }), value: cursor };
      cursor -= monthlyFlows.get(key) || 0;
      return point;
    }).reverse();
    return { liquidAssets, investments, liabilities, current, timeline };
  }, [accounts, dashboardData, transactions]);

  const recurring = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    transactions.forEach((transaction) => {
      if (transaction.type === 'TRANSFER') return;
      const label = cleanLabel(transaction).toLowerCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
      const key = `${transaction.type}:${label}:${Math.round(transaction.amount)}`;
      groups.set(key, [...(groups.get(key) || []), transaction]);
    });
    return [...groups.values()].filter((items) => items.length >= 2).map((items) => {
      const sorted = [...items].sort((a, b) => +new Date(a.transactionDate) - +new Date(b.transactionDate));
      const gaps = sorted.slice(1).map((item, index) => (+new Date(item.transactionDate) - +new Date(sorted[index].transactionDate)) / 86400000);
      const cadence = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      const label = cleanLabel(items[0]);
      const text = `${label} ${items[0].description || ''}`;
      const kind = items[0].type === 'INCOME' ? 'Salary / income' : /emi|loan/i.test(text) ? 'EMI' : /rent/i.test(text) ? 'Rent' : 'Subscription / recurring';
      return { label, amount: items[0].amount, count: items.length, cadence: Math.round(cadence), kind };
    }).sort((a, b) => b.count - a.count);
  }, [transactions]);

  const review = useMemo(() => {
    const now = new Date();
    const currentKey = monthKey(now);
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousKey = monthKey(previousDate);
    const summarize = (key: string) => transactions.filter((transaction) => monthKey(new Date(transaction.transactionDate)) === key).reduce((result, transaction) => {
      if (transaction.type === 'INCOME') result.income += transaction.amount;
      if (transaction.type === 'EXPENSE') result.expenses += transaction.amount;
      return result;
    }, { income: 0, expenses: 0 });
    const current = summarize(currentKey);
    const previous = summarize(previousKey);
    const expenses = transactions.filter((transaction) => transaction.type === 'EXPENSE' && monthKey(new Date(transaction.transactionDate)) === currentKey);
    const average = expenses.length ? expenses.reduce((sum, transaction) => sum + transaction.amount, 0) / expenses.length : 0;
    const unusual = expenses.filter((transaction) => transaction.amount > average * 2 && transaction.amount > 500).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const savings = current.income - current.expenses;
    const savingsRate = current.income ? (savings / current.income) * 100 : 0;
    const expenseChange = previous.expenses ? ((current.expenses - previous.expenses) / previous.expenses) * 100 : 0;
    const actions = [
      expenseChange > 10 ? `Spending is ${expenseChange.toFixed(0)}% above last month; review the largest categories.` : 'Spending is stable versus last month.',
      savingsRate < 20 ? 'Aim to move at least 20% of income toward savings next month.' : 'Your savings rate is above the 20% baseline—keep it up.',
      unusual.length ? `Review ${unusual.length} unusually large expense${unusual.length > 1 ? 's' : ''}.` : 'No unusual large expenses were detected.',
    ];
    return { current, previous, savings, savingsRate, expenseChange, unusual, actions };
  }, [transactions]);

  const householdBalances = useMemo(() => household.members.map((member) => ({
    member,
    amount: transactions.reduce((sum, transaction) => {
      const allocation = household.allocations[transaction.id];
      return allocation?.member === member && transaction.type === 'EXPENSE' ? sum + transaction.amount * allocation.percent / 100 : sum;
    }, 0) - (household.settled[member] || 0),
  })), [household, transactions]);

  const tabs: Array<[HubTab, string]> = [['sync', 'Sync status'], ['net-worth', 'Net worth'], ['recurring', 'Recurring'], ['review', 'Monthly review'], ['household', 'Household']];
  return (
    <section className="space-y-5 rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4 sm:p-6">
      <div><h2 className="text-xl font-bold text-white">Money Lab</h2><p className="text-xs text-slate-400">Automation, reviews, net worth, and shared spending in one place.</p></div>
      <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${tab === id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{label}</button>)}</div>

      {tab === 'sync' && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
          ['Pending', outbox.filter((item) => !item.status || item.status === 'pending').length],
          ['Retrying', outbox.filter((item) => item.status === 'retrying').length],
          ['Failed', outbox.filter((item) => item.status === 'failed').length],
          ['Synced ledger', transactions.filter((item) => !item.syncStatus).length],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></div>)}</div>
        <button onClick={() => void syncTransactionOutbox().then(refreshOutbox)} className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950">Retry sync now</button>
        {outbox.map((item) => <div key={item.id} className="rounded-xl border border-slate-700 p-3 text-xs"><div className="flex justify-between"><span className="font-semibold text-white">{item.type.toUpperCase()} transaction</span><span className="text-amber-300">{item.status || 'pending'}</span></div>{item.lastError && <p className="mt-1 text-rose-300">{item.lastError}</p>}<p className="mt-1 text-slate-500">Attempts: {item.attempts || 0}</p></div>)}
      </div>}

      {tab === 'net-worth' && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-4">{[['Net worth', netWorth.current], ['Liquid assets', netWorth.liquidAssets], ['Investments', netWorth.investments], ['Liabilities', netWorth.liabilities]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-950/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-white">{formatCurrency(Number(value))}</p></div>)}</div><div className="flex h-48 items-end gap-2 rounded-2xl bg-slate-950/50 p-4">{netWorth.timeline.map((point) => { const max = Math.max(...netWorth.timeline.map((item) => Math.abs(item.value)), 1); return <div key={point.key} className="flex h-full flex-1 flex-col justify-end gap-1" title={`${point.label}: ${formatCurrency(point.value)}`}><div className="rounded-t bg-emerald-400/80" style={{ height: `${Math.max(4, Math.abs(point.value) / max * 100)}%` }} /><span className="truncate text-center text-[9px] text-slate-500">{point.label}</span></div>; })}</div><p className="text-[11px] text-slate-500">Historical values are reconstructed from current balances and recorded cashflows.</p></div>}

      {tab === 'recurring' && <div className="grid gap-3 sm:grid-cols-2">{recurring.length ? recurring.map((item) => <div key={`${item.label}-${item.amount}`} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4"><div className="flex justify-between"><span className="font-semibold text-white">{item.label}</span><span className="text-cyan-300">{formatCurrency(item.amount)}</span></div><p className="mt-2 text-xs text-slate-400">{item.kind} · approximately every {item.cadence} days · {item.count} occurrences</p></div>) : <p className="text-sm text-slate-400">More transaction history is needed to detect recurring patterns.</p>}</div>}

      {tab === 'review' && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3">{[['Income', review.current.income], ['Expenses', review.current.expenses], ['Savings', review.savings]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-950/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="text-lg font-bold text-white">{formatCurrency(Number(value))}</p></div>)}</div><p className="text-sm text-cyan-200">Savings rate: {review.savingsRate.toFixed(1)}% · Expense change: {review.expenseChange.toFixed(1)}%</p><div className="space-y-2">{review.actions.map((action) => <p key={action} className="rounded-xl border border-slate-700 p-3 text-sm text-slate-300">{action}</p>)}</div>{review.unusual.map((transaction) => <div key={transaction.id} className="flex justify-between text-xs text-slate-400"><span>{cleanLabel(transaction)}</span><span>{formatCurrency(transaction.amount)}</span></div>)}</div>}

      {tab === 'household' && <div className="space-y-4"><form onSubmit={(event) => { event.preventDefault(); const name = memberName.trim(); if (name && !household.members.includes(name)) setHousehold((current) => ({ ...current, members: [...current.members, name] })); setMemberName(''); }} className="flex gap-2"><input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Household member name" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /><button className="rounded-xl bg-emerald-500 px-4 text-xs font-bold text-emerald-950">Add</button></form><div className="grid gap-3 sm:grid-cols-2">{householdBalances.map((balance) => <div key={balance.member} className="rounded-xl bg-slate-950/60 p-4"><p className="font-semibold text-white">{balance.member}</p><p className="text-xs text-slate-400">Outstanding share: {formatCurrency(balance.amount)}</p>{balance.amount > 0 && <button onClick={() => setHousehold((current) => ({ ...current, settled: { ...current.settled, [balance.member]: (current.settled[balance.member] || 0) + balance.amount } }))} className="mt-2 rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-300">Mark settled</button>}</div>)}</div><div className="max-h-80 space-y-2 overflow-y-auto">{transactions.filter((transaction) => transaction.type === 'EXPENSE').slice(0, 30).map((transaction) => { const allocation = household.allocations[transaction.id]; return <div key={transaction.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border border-slate-800 p-2 text-xs"><span className="truncate text-slate-300">{cleanLabel(transaction)} · {formatCurrency(transaction.amount)}</span><select value={allocation?.member || ''} onChange={(event) => setHousehold((current) => ({ ...current, allocations: { ...current.allocations, [transaction.id]: { member: event.target.value, percent: allocation?.percent || 50 } } }))} className="rounded-lg bg-slate-800 p-2 text-white"><option value="">Personal</option>{household.members.map((member) => <option key={member}>{member}</option>)}</select><input type="number" min="1" max="100" value={allocation?.percent || 50} onChange={(event) => setHousehold((current) => ({ ...current, allocations: { ...current.allocations, [transaction.id]: { member: allocation?.member || '', percent: Number(event.target.value) } } }))} className="w-16 rounded-lg bg-slate-800 p-2 text-white" /></div>; })}</div></div>}
    </section>
  );
};
