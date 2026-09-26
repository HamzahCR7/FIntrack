import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, GripVertical, Maximize2, Minimize2, MonitorPlay, RotateCcw, Settings2, X } from 'lucide-react';
import { Account, DashboardData, Subscription, Debt, Transaction } from '../types';
import { formatCurrency } from '../utils/privacyStore';
import { SpendingSection } from './SpendingSection';
import { BillRemindersSection } from './BillRemindersSection';
import { DailySpendingSection } from './DailySpendingSection';
import { TrendsSection } from './TrendsSection';
import { RunwaySimulatorCard } from './RunwaySimulatorCard';

type WidgetId = 'heatmap' | 'money-flow' | 'spending' | 'dues' | 'daily' | 'trends' | 'runway';
type DisplayMode = 'comfortable' | 'compact' | 'presentation';
type Layout = { order: WidgetId[]; hidden: WidgetId[]; wide: WidgetId[]; mode: DisplayMode };

const DEFAULT_LAYOUT: Layout = {
  order: ['heatmap', 'money-flow', 'spending', 'dues', 'daily', 'trends', 'runway'],
  hidden: [],
  wide: ['heatmap', 'money-flow', 'spending', 'daily'],
  mode: 'comfortable',
};
const LABELS: Record<WidgetId, string> = { heatmap: 'Financial activity heatmap', 'money-flow': 'Money flow', spending: 'Spending analytics', dues: 'Upcoming dues', daily: 'Daily activity', trends: 'Financial trends', runway: 'Runway simulator' };

const loadLayout = (device: 'desktop' | 'mobile'): Layout => {
  try {
    return { ...DEFAULT_LAYOUT, ...JSON.parse(localStorage.getItem(`fintrack_dashboard_${device}_v1`) || '') };
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
  const selectedTransactions = selected ? transactions.filter((tx) => new Date(tx.transactionDate).toISOString().slice(0, 10) === selected) : [];
  const color = (amount: number) => amount === 0 ? 'bg-slate-800' : amount / max < .25 ? 'bg-emerald-900' : amount / max < .5 ? 'bg-emerald-700' : amount / max < .75 ? 'bg-emerald-500' : 'bg-emerald-300';
  return <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold text-white">A year of spending</h3><p className="text-xs text-slate-400">Tap a day to inspect its transactions.</p></div><div className="flex items-center gap-1 text-[10px] text-slate-500">Less {[0,.2,.45,.7,1].map((level) => <span key={level} className={`h-3 w-3 rounded-sm ${color(level * max)}`} />)} More</div></div><div className="overflow-x-auto pb-2"><div className="grid w-max grid-flow-col grid-rows-7 gap-1">{days.map((day) => <button key={day.key} onClick={() => setSelected(day.key)} title={`${day.key}: ${formatCurrency(day.amount)}`} className={`h-3 w-3 rounded-[3px] transition-transform hover:scale-150 ${color(day.amount)} ${selected === day.key ? 'ring-2 ring-cyan-300' : ''}`} />)}</div></div>{selected && <div className="mt-4 rounded-xl bg-slate-950/70 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-cyan-200">{new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' })}</span><button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-500" /></button></div>{selectedTransactions.length ? selectedTransactions.map((tx) => <div key={tx.id} className="flex justify-between border-t border-slate-800 py-2 text-xs"><span className="text-slate-300">{tx.merchant || tx.description || tx.category?.name || tx.type}</span><span className={tx.type === 'INCOME' ? 'text-emerald-300' : 'text-rose-300'}>{formatCurrency(tx.amount)}</span></div>) : <p className="text-xs text-slate-500">No transactions recorded.</p>}</div>}</div>;
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
  useEffect(() => { const resize = () => { const next = innerWidth < 768 ? 'mobile' : 'desktop'; if (next !== device) { setDevice(next); setLayout(loadLayout(next)); } }; addEventListener('resize', resize); return () => removeEventListener('resize', resize); }, [device]);
  useEffect(() => localStorage.setItem(`fintrack_dashboard_${device}_v1`, JSON.stringify(layout)), [device, layout]);
  const move = (target: WidgetId) => { if (!dragged || dragged === target) return; setLayout((current) => { const order = current.order.filter((id) => id !== dragged); order.splice(order.indexOf(target), 0, dragged); return { ...current, order }; }); setDragged(null); };
  const toggle = (field: 'hidden' | 'wide', id: WidgetId) => setLayout((current) => ({ ...current, [field]: current[field].includes(id) ? current[field].filter((item) => item !== id) : [...current[field], id] }));
  const render = (id: WidgetId) => ({
    heatmap: <Heatmap transactions={transactions}/>, 'money-flow': <MoneyFlow dashboard={dashboardData}/>,
    spending: <SpendingSection spendingThisMonth={dashboardData.summary.spendingThisMonth} spendingByCategory={dashboardData.spendingByCategory} spendingByPaymentMethod={dashboardData.spendingByPaymentMethod} totalIncome={dashboardData.summary.totalIncome} totalExpenses={dashboardData.summary.totalExpenses} incomeThisMonth={dashboardData.summary.incomeThisMonth} savingsThisMonth={dashboardData.summary.savingsThisMonth} monthlyTrends={dashboardData.monthlyTrends} transactions={transactions}/>,
    dues: <BillRemindersSection creditCards={dashboardData.accounts.breakdown.CREDIT_CARD} subscriptions={dashboardData.recurring.upcomingSubscriptions} debts={dashboardData.debts.activeDebts} onPayCreditCard={onPayCreditCard} onPaySubscription={onPaySubscription} onPayDebt={onPayDebt}/>,
    daily: <DailySpendingSection transactions={transactions} onAddTransactionForDate={onAddTransactionForDate}/>, trends: <TrendsSection monthlyTrends={dashboardData.monthlyTrends}/>, runway: <RunwaySimulatorCard/>,
  }[id]);
  return <div className={layout.mode === 'compact' ? 'space-y-3' : 'space-y-5'}><div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-3"><div><p className="text-sm font-semibold text-white">My dashboard · {device}</p><p className="text-[10px] text-slate-500">Drag widgets while customizing. Mobile and desktop layouts save separately.</p></div><div className="flex gap-2"><select value={layout.mode} onChange={(event) => setLayout((current) => ({ ...current, mode: event.target.value as DisplayMode }))} className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-300"><option value="comfortable">Comfortable</option><option value="compact">Compact</option><option value="presentation">Presentation</option></select><button onClick={() => setCustomizing((value) => !value)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${customizing ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-200'}`}><Settings2 className="mr-1 inline h-4 w-4"/>Customize</button></div></div>{customizing && <div className="grid gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3 sm:grid-cols-2 lg:grid-cols-4">{layout.order.map((id) => <div key={id} className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-xs"><span className="text-slate-200">{LABELS[id]}</span><div className="flex gap-1"><button onClick={() => toggle('hidden',id)} title="Show or hide">{layout.hidden.includes(id) ? <EyeOff className="h-4 w-4 text-slate-500"/> : <Eye className="h-4 w-4 text-cyan-300"/>}</button><button onClick={() => toggle('wide',id)} title="Resize">{layout.wide.includes(id) ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}</button></div></div>)}<button onClick={() => setLayout(DEFAULT_LAYOUT)} className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-300"><RotateCcw className="mr-1 inline h-4 w-4"/>Reset layout</button></div>}<div className={`grid grid-cols-1 ${layout.mode === 'presentation' ? 'gap-8' : layout.mode === 'compact' ? 'gap-3 lg:grid-cols-2' : 'gap-5 lg:grid-cols-2'}`}>{layout.order.filter((id) => !layout.hidden.includes(id)).map((id) => <div key={id} draggable={customizing} onDragStart={() => setDragged(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => move(id)} className={`${layout.wide.includes(id) || layout.mode === 'presentation' ? 'lg:col-span-2' : ''} relative ${customizing ? 'cursor-grab rounded-2xl ring-1 ring-cyan-400/30' : ''}`}>{customizing && <div className="absolute right-3 top-3 z-20 rounded-lg bg-slate-950/90 p-1 text-cyan-300"><GripVertical className="h-4 w-4"/></div>}{render(id)}</div>)}</div></div>;
};
