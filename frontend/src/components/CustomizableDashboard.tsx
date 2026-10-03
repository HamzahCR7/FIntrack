import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, EyeOff, GripVertical, Maximize2, Minimize2, RotateCcw, Settings2, Sparkles, Trophy, X } from 'lucide-react';
import { Account, DashboardData, Subscription, Debt, Transaction } from '../types';
import { formatCurrency } from '../utils/privacyStore';
import { SpendingSection } from './SpendingSection';
import { BillRemindersSection } from './BillRemindersSection';
import { DailySpendingSection } from './DailySpendingSection';
import { TrendsSection } from './TrendsSection';
import { RunwaySimulatorCard } from './RunwaySimulatorCard';

type WidgetId = 'financial-highlights' | 'spending' | 'dues' | 'daily' | 'trends' | 'runway';
type DisplayMode = 'comfortable' | 'compact' | 'presentation';
type Layout = { order: WidgetId[]; hidden: WidgetId[]; wide: WidgetId[]; mode: DisplayMode };

const DEFAULT_LAYOUT: Layout = {
  order: ['financial-highlights', 'spending', 'dues', 'daily', 'trends', 'runway'],
  hidden: [],
  wide: ['financial-highlights', 'spending', 'daily'],
  mode: 'comfortable',
};
const LABELS: Record<WidgetId, string> = { 'financial-highlights': 'Financial highlights', spending: 'Spending analytics', dues: 'Upcoming dues', daily: 'Daily activity', trends: 'Financial trends', runway: 'Runway simulator' };

const loadLayout = (device: 'desktop' | 'mobile'): Layout => {
  try {
    const saved = JSON.parse(localStorage.getItem(`fintrack_dashboard_${device}_v1`) || '') as Partial<Layout>;
    const validWidgetIds = new Set(DEFAULT_LAYOUT.order);
    const savedOrder = (saved.order || []).filter((id) => validWidgetIds.has(id));
    return {
      ...DEFAULT_LAYOUT,
      ...saved,
      order: [...DEFAULT_LAYOUT.order.filter((id) => !savedOrder.includes(id)), ...savedOrder],
      hidden: (saved.hidden || []).filter((id) => validWidgetIds.has(id)),
      wide: Array.from(new Set([...DEFAULT_LAYOUT.wide, ...(saved.wide || []).filter((id) => validWidgetIds.has(id))])),
    };
  } catch { return DEFAULT_LAYOUT; }
};

const Heatmap: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const { days, max } = useMemo(() => {
    const totals = new Map<string, number>();
    transactions.filter((tx) => tx.type === 'EXPENSE').forEach((tx) => {
      const key = new Date(tx.transactionDate).toISOString().slice(0, 10);
      totals.set(key, (totals.get(key) || 0) + tx.amount);
    });
    const end = new Date();
    const start = new Date(end); start.setDate(end.getDate() - 364); start.setDate(start.getDate() - start.getDay());
    const values = Array.from({ length: 371 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); const key = date.toISOString().slice(0, 10); return { key, date, amount: totals.get(key) || 0 }; }).filter((item) => item.date <= end);
    return { days: values, max: Math.max(...values.map((item) => item.amount), 1) };
  }, [transactions]);
  const monthLabels = days.reduce<Array<{ label: string; weekIndex: number }>>((labels, day, index) => {
    if (day.date.getDate() === 1) {
      labels.push({
        label: day.date.toLocaleDateString(undefined, { month: 'short' }),
        weekIndex: Math.floor(index / 7),
      });
    }
    return labels;
  }, []);
  const selectedTransactions = selected ? transactions.filter((tx) => new Date(tx.transactionDate).toISOString().slice(0, 10) === selected) : [];
  const color = (amount: number) => amount === 0 ? 'bg-slate-800' : amount / max < .25 ? 'bg-emerald-900' : amount / max < .5 ? 'bg-emerald-700' : amount / max < .75 ? 'bg-emerald-500' : 'bg-emerald-300';
  return <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold text-white">A year of spending</h3><p className="text-xs text-slate-400">Tap a day to inspect its transactions.</p></div><div className="flex items-center gap-1 text-[10px] text-slate-500">Less {[0,.2,.45,.7,1].map((level) => <span key={level} className={`h-3 w-3 rounded-sm ${color(level * max)}`} />)} More</div></div><div className="overflow-x-auto pb-2"><div className="flex w-max"><div className="mr-2 grid grid-rows-7 gap-1 pt-5 text-[9px] text-slate-500">{['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, index) => <span key={index} className="flex h-3 items-center justify-end">{label}</span>)}</div><div className="relative w-max pt-5"><div className="absolute left-0 top-0 h-4 text-[10px] text-slate-400">{monthLabels.map((month) => <span key={`${month.label}-${month.weekIndex}`} className="absolute whitespace-nowrap" style={{ left: `${month.weekIndex * 16}px` }}>{month.label}</span>)}</div><div className="grid w-max grid-flow-col grid-rows-7 gap-1">{days.map((day) => <button key={day.key} onClick={() => setSelected(day.key)} title={`${day.key}: ${formatCurrency(day.amount)}`} className={`h-3 w-3 rounded-[3px] transition-transform hover:scale-150 ${color(day.amount)} ${selected === day.key ? 'ring-2 ring-cyan-300' : ''}`} />)}</div></div></div></div>{selected && <div className="mt-4 rounded-xl bg-slate-950/70 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-cyan-200">{new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' })}</span><button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-500" /></button></div>{selectedTransactions.length ? selectedTransactions.map((tx) => <div key={tx.id} className="flex justify-between border-t border-slate-800 py-2 text-xs"><span className="text-slate-300">{tx.merchant || tx.description || tx.category?.name || tx.type}</span><span className={tx.type === 'INCOME' ? 'text-emerald-300' : 'text-rose-400'}>{formatCurrency(tx.amount)}</span></div>) : <p className="text-xs text-slate-500">No transactions recorded.</p>}</div>}</div>;
};

const MoneyFlow: React.FC<{ dashboard: DashboardData }> = ({ dashboard }) => {
  const income = dashboard.summary.incomeThisMonth;
  const expenses = dashboard.summary.spendingThisMonth;
  const savings = dashboard.summary.savingsThisMonth;
  const balance = dashboard.summary.totalBalance;
  return <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900 to-slate-950 p-4"><div className="mb-2"><h3 className="font-semibold text-white">Animated money flow</h3><p className="text-xs text-slate-400">How this month’s income moves through your finances.</p></div><svg viewBox="0 0 800 250" className="min-h-52 w-full"><defs><linearGradient id="flow" x1="0" x2="1"><stop stopColor="#34d399"/><stop offset=".5" stopColor="#22d3ee"/><stop offset="1" stopColor="#a78bfa"/></linearGradient></defs>{[[145,125,330,65],[145,125,330,185],[470,65,655,65],[470,65,655,185]].map((line,index) => <path key={index} d={`M${line[0]} ${line[1]} C${line[0]+90} ${line[1]},${line[2]-90} ${line[3]},${line[2]} ${line[3]}`} fill="none" stroke="url(#flow)" strokeWidth="4" strokeDasharray="10 10"><animate attributeName="stroke-dashoffset" from="20" to="0" dur={`${1.2 + index * .2}s`} repeatCount="indefinite"/></path>)}{[
    [35,90,220,70,'Salary / income',income,'#34d399'],[330,30,180,70,'Accounts',balance,'#22d3ee'],[330,150,180,70,'Expenses',expenses,'#fb7185'],[590,30,180,70,'Savings',savings,'#a78bfa'],[590,150,180,70,'Available balance',balance,'#60a5fa'],
  ].map(([x,y,w,h,label,value,color]) => <g key={String(label)}><rect x={Number(x)} y={Number(y)} width={Number(w)} height={Number(h)} rx="18" fill="#0f172a" stroke={String(color)} strokeWidth="2"/><text x={Number(x)+14} y={Number(y)+27} fill="#94a3b8" fontSize="13">{label}</text><text x={Number(x)+14} y={Number(y)+51} fill="white" fontSize="18" fontWeight="700">{formatCurrency(Number(value))}</text></g>)}</svg></div>;
};

const MoneyWrapped: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const year = new Date().getFullYear();
  const stats = useMemo(() => {
    const monthly = Array.from({ length: 12 }, () => ({ income: 0, expenses: 0 }));
    const categories = new Map<string, number>();
    let biggestExpense: Transaction | undefined;

    transactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      if (date.getFullYear() !== year) return;
      const bucket = monthly[date.getMonth()];
      if (tx.type === 'INCOME') bucket.income += tx.amount;
      if (tx.type === 'EXPENSE') {
        bucket.expenses += tx.amount;
        const category = tx.category?.name || 'Uncategorized';
        categories.set(category, (categories.get(category) || 0) + tx.amount);
        if (!biggestExpense || tx.amount > biggestExpense.amount) biggestExpense = tx;
      }
    });

    const totalSpent = monthly.reduce((sum, item) => sum + item.expenses, 0);
    const totalSaved = monthly.reduce((sum, item) => sum + item.income - item.expenses, 0);
    const topCategory = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0];
    const bestMonthIndex = monthly.reduce((best, item, index, all) =>
      item.income - item.expenses > all[best].income - all[best].expenses ? index : best, 0);
    const maxMonthlySpend = Math.max(...monthly.map((item) => item.expenses), 1);

    return { monthly, totalSpent, totalSaved, topCategory, biggestExpense, bestMonthIndex, maxMonthlySpend };
  }, [transactions, year]);

  return <div className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/70 via-slate-900 to-cyan-950/60 p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-300"><Sparkles className="h-4 w-4"/>{year} Money Wrapped</div><h3 className="mt-2 text-2xl font-black text-white">Your year, told through money.</h3></div><Trophy className="h-8 w-8 text-amber-300"/></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
    ['Total spent', formatCurrency(stats.totalSpent)],
    ['Net saved', formatCurrency(stats.totalSaved)],
    ['Top category', stats.topCategory ? `${stats.topCategory[0]} · ${formatCurrency(stats.topCategory[1])}` : 'No spending yet'],
    ['Biggest purchase', stats.biggestExpense ? `${stats.biggestExpense.merchant || stats.biggestExpense.description || 'Expense'} · ${formatCurrency(stats.biggestExpense.amount)}` : 'No spending yet'],
  ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>)}</div><div className="mt-5"><div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">Monthly spending rhythm</span><span className="text-emerald-300">Best saving month: {new Date(year, stats.bestMonthIndex).toLocaleDateString(undefined, { month: 'long' })}</span></div><div className="flex h-28 items-end gap-1.5">{stats.monthly.map((item, index) => <div key={index} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><div title={`${new Date(year, index).toLocaleDateString(undefined, { month: 'long' })}: ${formatCurrency(item.expenses)}`} className="w-full rounded-t bg-gradient-to-t from-violet-600 to-cyan-400" style={{ height: `${Math.max(3, (item.expenses / stats.maxMonthlySpend) * 82)}px` }}/><span className="text-[8px] text-slate-500">{new Date(year, index).toLocaleDateString(undefined, { month: 'narrow' })}</span></div>)}</div></div></div>;
};

const FinancialHealthRings: React.FC<{ dashboard: DashboardData }> = ({ dashboard }) => {
  const income = dashboard.summary.incomeThisMonth;
  const spending = dashboard.summary.spendingThisMonth;
  const savingsRate = income > 0 ? (dashboard.summary.savingsThisMonth / income) * 100 : 0;
  const debts = dashboard.debts.activeDebts.filter((debt) => debt.type === 'I_OWE');
  const debtOriginal = debts.reduce((sum, debt) => sum + debt.settledAmount + debt.remainingAmount, 0);
  const debtSettled = debts.reduce((sum, debt) => sum + debt.settledAmount, 0);
  const rings = [
    { label: 'Budget control', value: income > 0 ? Math.max(0, Math.min(100, ((income - spending) / income + .75) * 100)) : 0, detail: `${formatCurrency(Math.max(0, income - spending))} headroom`, color: '#22d3ee' },
    { label: 'Savings target', value: Math.max(0, Math.min(100, (savingsRate / 20) * 100)), detail: `${savingsRate.toFixed(1)}% saved · 20% goal`, color: '#34d399' },
    { label: 'Debt repayment', value: debtOriginal > 0 ? (debtSettled / debtOriginal) * 100 : 100, detail: debtOriginal > 0 ? `${formatCurrency(debtSettled)} repaid` : 'No active debt', color: '#a78bfa' },
  ];

  return <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5"><h3 className="font-semibold text-white">Financial health rings</h3><p className="text-xs text-slate-400">Close all three rings for a healthier month.</p><div className="mt-5 grid grid-cols-3 gap-3">{rings.map((ring) => <div key={ring.label} className="text-center"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full" style={{ background: `conic-gradient(${ring.color} ${ring.value * 3.6}deg, #1e293b 0deg)` }}><div className="grid h-16 w-16 place-items-center rounded-full bg-slate-950 text-lg font-black text-white">{Math.round(ring.value)}%</div></div><p className="mt-3 text-xs font-semibold text-slate-200">{ring.label}</p><p className="mt-1 text-[10px] text-slate-500">{ring.detail}</p></div>)}</div></div>;
};

const BillTimeline: React.FC<{ dashboard: DashboardData }> = ({ dashboard }) => {
  const events = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const items: Array<{ id: string; date: Date; title: string; amount: number; kind: string; tone: string }> = [];
    dashboard.recurring.upcomingSubscriptions.forEach((subscription) => items.push({ id: `sub-${subscription.id}`, date: new Date(subscription.nextBillingDate), title: subscription.name, amount: subscription.amount, kind: 'Subscription', tone: 'bg-indigo-400' }));
    dashboard.debts.activeDebts.filter((debt) => debt.dueDate).forEach((debt) => items.push({ id: `debt-${debt.id}`, date: new Date(debt.dueDate!), title: debt.personName, amount: debt.remainingAmount, kind: debt.type === 'I_OWE' ? 'Debt payment' : 'Money expected', tone: debt.type === 'I_OWE' ? 'bg-rose-400' : 'bg-emerald-400' }));
    (dashboard.accounts.breakdown.CREDIT_CARD || []).filter((card) => card.paymentDueDay && (card.statementAmount || card.currentBalance) > 0).forEach((card) => {
      const date = new Date(today.getFullYear(), today.getMonth(), card.paymentDueDay!);
      if (date < today) date.setMonth(date.getMonth() + 1);
      items.push({ id: `card-${card.id}`, date, title: card.name, amount: card.statementAmount || card.currentBalance, kind: 'Credit card bill', tone: 'bg-amber-400' });
    });
    return items.filter((item) => !Number.isNaN(item.date.getTime()) && item.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 12);
  }, [dashboard]);

  return <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-cyan-300"/><div><h3 className="font-semibold text-white">Bill timeline</h3><p className="text-xs text-slate-400">Your upcoming payments in calendar order.</p></div></div><div className="mt-4 space-y-1">{events.length ? events.map((event, index) => <div key={event.id} className="grid grid-cols-[58px_16px_1fr_auto] items-center gap-2"><div className="text-right"><p className="text-[10px] uppercase text-slate-500">{event.date.toLocaleDateString(undefined, { month: 'short' })}</p><p className="text-sm font-bold text-slate-200">{event.date.getDate()}</p></div><div className="relative flex h-full justify-center"><span className={`z-10 mt-4 h-2.5 w-2.5 rounded-full ${event.tone}`}/>{index < events.length - 1 && <span className="absolute bottom-0 top-6 w-px bg-slate-700"/>}</div><div className="my-1 rounded-xl bg-slate-950/60 px-3 py-2"><p className="text-xs font-semibold text-slate-200">{event.title}</p><p className="text-[10px] text-slate-500">{event.kind} · {event.date.toLocaleDateString(undefined, { weekday: 'short' })}</p></div><span className="text-xs font-bold text-slate-200">{formatCurrency(event.amount)}</span></div>) : <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">No upcoming bills with dates.</div>}</div></div>;
};

const SpendingForYou: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const recommendations = useMemo(() => {
    const expenses = transactions.filter((tx) => tx.type === 'EXPENSE');
    const total = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const categories = new Map<string, number>();
    const merchants = new Map<string, { count: number; amount: number }>();
    let weekend = 0;
    let weekday = 0;

    expenses.forEach((tx) => {
      const category = tx.category?.name || 'Uncategorized';
      categories.set(category, (categories.get(category) || 0) + tx.amount);
      const merchant = tx.merchant || tx.description;
      if (merchant) {
        const current = merchants.get(merchant) || { count: 0, amount: 0 };
        merchants.set(merchant, { count: current.count + 1, amount: current.amount + tx.amount });
      }
      const day = new Date(tx.transactionDate).getDay();
      if (day === 0 || day === 6) weekend += tx.amount; else weekday += tx.amount;
    });

    const topCategory = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0];
    const frequentMerchant = Array.from(merchants.entries()).filter(([, value]) => value.count > 1).sort((a, b) => b[1].count - a[1].count)[0];
    const cards = [];
    if (topCategory) cards.push({ eyebrow: `Because you spend on ${topCategory[0]}`, title: `${Math.round((topCategory[1] / Math.max(total, 1)) * 100)}% of your expenses`, detail: `You spent ${formatCurrency(topCategory[1])} here. Try a category cap to keep it predictable.`, tone: 'from-fuchsia-600/30 to-violet-950/50' });
    if (frequentMerchant) cards.push({ eyebrow: 'A recurring favorite', title: frequentMerchant[0], detail: `${frequentMerchant[1].count} visits totaling ${formatCurrency(frequentMerchant[1].amount)}. Check whether a monthly limit would help.`, tone: 'from-cyan-600/30 to-blue-950/50' });
    cards.push(weekend > weekday
      ? { eyebrow: 'Your weekend pattern', title: 'Weekend spending is leading', detail: `${formatCurrency(weekend)} on weekends versus ${formatCurrency(weekday)} on weekdays. Consider a weekend guard.`, tone: 'from-amber-600/30 to-orange-950/50' }
      : { eyebrow: 'Your weekly pattern', title: 'Weekday spending is leading', detail: `${formatCurrency(weekday)} on weekdays versus ${formatCurrency(weekend)} on weekends. Review commute and workday purchases.`, tone: 'from-emerald-600/30 to-teal-950/50' });
    return cards;
  }, [transactions]);

  return <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">Personalized for you</p><h3 className="mt-1 text-xl font-bold text-white">Because of how you spend</h3><p className="text-xs text-slate-400">Recommendations generated from your own transaction patterns.</p></div><div className="mt-4 grid gap-3 md:grid-cols-3">{recommendations.map((item) => <div key={item.title} className={`min-h-40 rounded-2xl border border-white/10 bg-gradient-to-br ${item.tone} p-4`}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{item.eyebrow}</p><p className="mt-3 text-lg font-black text-white">{item.title}</p><p className="mt-2 text-xs leading-5 text-slate-300">{item.detail}</p></div>)}</div></div>;
};

type BoardStatus = 'planned' | 'due' | 'paid' | 'overdue';

const BudgetBoard: React.FC<{ dashboard: DashboardData }> = ({ dashboard }) => {
  const [draggedBill, setDraggedBill] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, BoardStatus>>(() => {
    try { return JSON.parse(localStorage.getItem('fintrack_bill_board_v1') || '{}'); } catch { return {}; }
  });
  const bills = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const items: Array<{ id: string; title: string; amount: number; dueDate: Date; kind: string }> = [];
    dashboard.recurring.upcomingSubscriptions.forEach((item) => items.push({ id: `sub-${item.id}`, title: item.name, amount: item.amount, dueDate: new Date(item.nextBillingDate), kind: 'Subscription' }));
    dashboard.debts.activeDebts.filter((item) => item.dueDate && item.type === 'I_OWE').forEach((item) => items.push({ id: `debt-${item.id}`, title: item.personName, amount: item.remainingAmount, dueDate: new Date(item.dueDate!), kind: 'Debt' }));
    (dashboard.accounts.breakdown.CREDIT_CARD || [])
      .filter((item) => item.paymentDueDay && (item.statementAmount || item.currentBalance) > 0)
      .forEach((item) => {
        const dueDate = new Date(today.getFullYear(), today.getMonth(), item.paymentDueDay!);
        if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1);
        items.push({ id: `card-${item.id}`, title: item.name, amount: item.statementAmount || item.currentBalance, dueDate, kind: 'Card' });
      });
    return items.filter((item) => !Number.isNaN(item.dueDate.getTime())).map((item) => {
      const daysUntilDue = Math.ceil((item.dueDate.getTime() - today.getTime()) / 86400000);
      const automaticStatus: BoardStatus = daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 7 ? 'due' : 'planned';
      return { ...item, status: overrides[item.id] || automaticStatus };
    });
  }, [dashboard, overrides]);
  const columns: Array<{ id: BoardStatus; label: string; color: string }> = [
    { id: 'planned', label: 'Planned', color: 'border-blue-400/30' },
    { id: 'due', label: 'Due soon', color: 'border-amber-400/30' },
    { id: 'paid', label: 'Paid', color: 'border-emerald-400/30' },
    { id: 'overdue', label: 'Overdue', color: 'border-rose-400/30' },
  ];
  const moveBill = (status: BoardStatus) => {
    if (!draggedBill) return;
    setOverrides((current) => {
      const next = { ...current, [draggedBill]: status };
      localStorage.setItem('fintrack_bill_board_v1', JSON.stringify(next));
      return next;
    });
    setDraggedBill(null);
  };

  return <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4"><h3 className="font-semibold text-white">Budget board</h3><p className="text-xs text-slate-400">Drag bills between columns as you plan and pay them.</p><div className="mt-4 grid gap-3 md:grid-cols-4">{columns.map((column) => <div key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => moveBill(column.id)} className={`min-h-44 rounded-xl border ${column.color} bg-slate-950/50 p-2`}><div className="mb-2 flex items-center justify-between px-1"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{column.label}</span><span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{bills.filter((bill) => bill.status === column.id).length}</span></div><div className="space-y-2">{bills.filter((bill) => bill.status === column.id).map((bill) => <div key={bill.id} draggable onDragStart={() => setDraggedBill(bill.id)} className="cursor-grab rounded-lg border border-slate-700 bg-slate-900 p-2 active:cursor-grabbing"><p className="truncate text-xs font-semibold text-white">{bill.title}</p><p className="mt-1 text-[10px] text-slate-500">{bill.kind} · {bill.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p><p className="mt-1 text-xs font-bold text-slate-300">{formatCurrency(bill.amount)}</p></div>)}</div></div>)}</div></div>;
};

const FinancialHighlights: React.FC<{ dashboard: DashboardData; transactions: Transaction[] }> = ({ dashboard, transactions }) => {
  const [view, setView] = useState<'wrapped' | 'health' | 'timeline' | 'year' | 'flow' | 'for-you' | 'board'>('wrapped');
  const views = [
    { id: 'wrapped' as const, label: 'Money Wrapped' },
    { id: 'health' as const, label: 'Health rings' },
    { id: 'timeline' as const, label: 'Bill timeline' },
    { id: 'year' as const, label: 'Year of spending' },
    { id: 'flow' as const, label: 'Money flow' },
    { id: 'for-you' as const, label: 'For you' },
    { id: 'board' as const, label: 'Budget board' },
  ];

  return <div><div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-2">{views.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`min-w-[130px] flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${view === item.id ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950/60 text-slate-400 hover:text-white'}`}>{item.label}</button>)}</div>{view === 'wrapped' && <MoneyWrapped transactions={transactions}/>} {view === 'health' && <FinancialHealthRings dashboard={dashboard}/>} {view === 'timeline' && <BillTimeline dashboard={dashboard}/>} {view === 'year' && <Heatmap transactions={transactions}/>} {view === 'flow' && <MoneyFlow dashboard={dashboard}/>} {view === 'for-you' && <SpendingForYou transactions={transactions}/>} {view === 'board' && <BudgetBoard dashboard={dashboard}/>}</div>;
};

export const CustomizableDashboard: React.FC<{
  dashboardData: DashboardData; transactions: Transaction[];
  onAddTransactionForDate: (date: string) => void;
  onPayCreditCard: (card: Account) => void;
  onPaySubscription: (subscription: Subscription) => void;
  onPayDebt: (debt: Debt) => void;
}> = ({ dashboardData, transactions, onAddTransactionForDate, onPayCreditCard, onPaySubscription, onPayDebt }) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>(() => innerWidth < 768 ? 'mobile' : 'desktop');
  const [layout, setLayout] = useState<Layout>(() => loadLayout(innerWidth < 768 ? 'mobile' : 'desktop'));
  const [customizing, setCustomizing] = useState(false);
  const [dragged, setDragged] = useState<WidgetId | null>(null);
  const [mobileWidget, setMobileWidget] = useState<WidgetId>('financial-highlights');
  useEffect(() => { const resize = () => { const next = innerWidth < 768 ? 'mobile' : 'desktop'; if (next !== device) { setDevice(next); setLayout(loadLayout(next)); } }; addEventListener('resize', resize); return () => removeEventListener('resize', resize); }, [device]);
  useEffect(() => localStorage.setItem(`fintrack_dashboard_${device}_v1`, JSON.stringify(layout)), [device, layout]);
  const move = (target: WidgetId) => { if (!dragged || dragged === target) return; setLayout((current) => { const order = current.order.filter((id) => id !== dragged); order.splice(order.indexOf(target), 0, dragged); return { ...current, order }; }); setDragged(null); };
  const toggle = (field: 'hidden' | 'wide', id: WidgetId) => setLayout((current) => ({ ...current, [field]: current[field].includes(id) ? current[field].filter((item) => item !== id) : [...current[field], id] }));
  const render = (id: WidgetId) => ({
    'financial-highlights': <FinancialHighlights dashboard={dashboardData} transactions={transactions}/>,
    spending: <SpendingSection spendingThisMonth={dashboardData.summary.spendingThisMonth} spendingByCategory={dashboardData.spendingByCategory} spendingByPaymentMethod={dashboardData.spendingByPaymentMethod} totalIncome={dashboardData.summary.totalIncome} totalExpenses={dashboardData.summary.totalExpenses} incomeThisMonth={dashboardData.summary.incomeThisMonth} savingsThisMonth={dashboardData.summary.savingsThisMonth} monthlyTrends={dashboardData.monthlyTrends} transactions={transactions}/>,
    dues: <BillRemindersSection creditCards={dashboardData.accounts.breakdown.CREDIT_CARD} subscriptions={dashboardData.recurring.upcomingSubscriptions} debts={dashboardData.debts.activeDebts} onPayCreditCard={onPayCreditCard} onPaySubscription={onPaySubscription} onPayDebt={onPayDebt}/>,
    daily: <DailySpendingSection transactions={transactions} onAddTransactionForDate={onAddTransactionForDate}/>, trends: <TrendsSection monthlyTrends={dashboardData.monthlyTrends}/>, runway: <RunwaySimulatorCard/>,
  }[id]);
  if (device === 'mobile') return <div className="space-y-3">
    <div className="-mx-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Financial insights">
      <div className="flex min-w-max gap-2">
        {layout.order.filter((id) => !layout.hidden.includes(id)).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={mobileWidget === id}
            onClick={() => setMobileWidget(id)}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${mobileWidget === id ? 'border-cyan-300/50 bg-cyan-400 text-slate-950' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
          >
            {LABELS[id]}
          </button>
        ))}
      </div>
    </div>
    <div role="tabpanel">{render(mobileWidget)}</div>
  </div>;
  return <div className={layout.mode === 'compact' ? 'space-y-3' : 'space-y-5'}><div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-3"><div><p className="text-sm font-semibold text-white">My dashboard · {device}</p><p className="text-[10px] text-slate-500">Drag widgets while customizing. Mobile and desktop layouts save separately.</p></div><div className="flex gap-2"><select value={layout.mode} onChange={(event) => setLayout((current) => ({ ...current, mode: event.target.value as DisplayMode }))} className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-300"><option value="comfortable">Comfortable</option><option value="compact">Compact</option><option value="presentation">Presentation</option></select><button onClick={() => setCustomizing((value) => !value)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${customizing ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-200'}`}><Settings2 className="mr-1 inline h-4 w-4"/>Customize</button></div></div>{customizing && <div className="grid gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 sm:grid-cols-2 lg:grid-cols-4">{layout.order.map((id) => <div key={id} className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-xs"><span className="text-slate-200">{LABELS[id]}</span><div className="flex gap-1"><button onClick={() => toggle('hidden',id)} title="Show or hide">{layout.hidden.includes(id) ? <EyeOff className="h-4 w-4 text-slate-500"/> : <Eye className="h-4 w-4 text-cyan-300"/>}</button><button onClick={() => toggle('wide',id)} title="Resize">{layout.wide.includes(id) ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}</button></div></div>)}<button onClick={() => setLayout(DEFAULT_LAYOUT)} className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-300"><RotateCcw className="mr-1 inline h-4 w-4"/>Reset layout</button></div>}<div className={`grid grid-cols-1 ${layout.mode === 'presentation' ? 'gap-8' : layout.mode === 'compact' ? 'gap-3 lg:grid-cols-2' : 'gap-5 lg:grid-cols-2'}`}>{layout.order.filter((id) => !layout.hidden.includes(id)).map((id) => <div key={id} draggable={customizing} onDragStart={() => setDragged(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => move(id)} className={`${layout.wide.includes(id) || layout.mode === 'presentation' ? 'lg:col-span-2' : ''} relative ${customizing ? 'cursor-grab rounded-2xl ring-1 ring-cyan-400/30' : ''}`}>{customizing && <div className="absolute right-3 top-3 z-20 rounded-lg bg-slate-950/90 p-1 text-cyan-300"><GripVertical className="h-4 w-4"/></div>}{render(id)}</div>)}</div></div>;
};
