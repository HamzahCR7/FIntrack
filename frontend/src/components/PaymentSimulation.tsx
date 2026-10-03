import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, CheckCircle2, Clock3, ExternalLink, HandCoins, LockKeyhole,
  ReceiptText, Repeat2, RotateCcw, ScanLine, ShieldCheck, Smartphone, Sparkles,
  UserRound, WalletCards, X, Zap,
} from 'lucide-react';

type Stage = 'select' | 'review' | 'choose-app' | 'external-app' | 'returning' | 'verifying' | 'paid' | 'cancelled';
type PaymentApp = 'Google Pay' | 'PhonePe';
type Payment = {
  id: string; title: string; payee: string; upiId: string; amount: number;
  category: string; account: string; description: string; source: string; editableAmount?: boolean;
};

const suggestions: Array<Payment & { icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'electricity', title: 'Electricity bill', payee: 'BESCOM', upiId: 'bescom.bill@upi', amount: 1840, category: 'Utilities', account: 'HDFC Savings ••4821', description: 'September electricity bill', source: 'Upcoming bill', icon: Zap },
  { id: 'debt', title: 'Repay Rahul', payee: 'Rahul Sharma', upiId: 'rahul@okaxis', amount: 2500, category: 'Debt repayment', account: 'HDFC Savings ••4821', description: 'Dinner and movie split', source: 'Tracked debt', icon: HandCoins },
  { id: 'subscription', title: 'Netflix renewal', payee: 'Netflix', upiId: 'netflix.india@upi', amount: 649, category: 'Subscriptions', account: 'HDFC Savings ••4821', description: 'Monthly subscription', source: 'Recurring payment', icon: Repeat2 },
];

const recentPayee: Payment = { id: 'priya', title: 'Pay Priya', payee: 'Priya Kapoor', upiId: 'priya@okhdfcbank', amount: 0, category: 'Food & dining', account: 'HDFC Savings ••4821', description: 'Shared expense', source: 'Recent payee', editableAmount: true };
const scannedPayment: Payment = { id: 'scan', title: 'Scan & pay', payee: 'Blue Tokai Coffee', upiId: 'bluetokai@icici', amount: 485, category: 'Food & dining', account: 'HDFC Savings ••4821', description: 'Coffee shop payment', source: 'UPI QR scanned' };
const flowSteps = ['Details ready', 'UPI app', 'Returned', 'Recorded'];
const progressByStage: Record<Stage, number> = { select: 0, review: 1, 'choose-app': 1, 'external-app': 2, returning: 2, verifying: 3, paid: 4, cancelled: 1 };
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const PaymentSimulation: React.FC = () => {
  const [stage, setStage] = useState<Stage>('select');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [selectedApp, setSelectedApp] = useState<PaymentApp | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const selectPayment = (next: Payment) => {
    setPayment(next);
    setAmountInput(next.amount ? String(next.amount) : '');
    setStage('review');
  };

  const reset = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setStage('select'); setPayment(null); setAmountInput(''); setSelectedApp(null); setTransactionId('');
  };

  const approve = () => {
    setStage('returning');
    timers.current.push(window.setTimeout(() => setStage('verifying'), 1300));
    timers.current.push(window.setTimeout(() => { setTransactionId(`SIM${Date.now().toString().slice(-10)}`); setStage('paid'); }, 3400));
  };

  const amount = Number(amountInput) || 0;
  const progress = progressByStage[stage];

  return <section className="space-y-5">
    <header className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300">Payment prototype</p><h2 className="mt-1 text-2xl font-bold text-white">Pay without re-entering everything</h2><p className="mt-1 text-sm text-slate-400">FinTrack reuses bills, debts, subscriptions, recent payees, and QR details.</p></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200"><ShieldCheck className="h-3.5 w-3.5" /> Demo—no money moves</span>
    </header>

    <div className="grid gap-2 sm:grid-cols-4">{flowSteps.map((label, index) => {
      const complete = progress > index;
      const active = progress === index && stage !== 'select' && stage !== 'cancelled';
      return <div key={label} className={`rounded-2xl border p-3 ${complete ? 'border-emerald-500/30 bg-emerald-500/10' : active ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/40'}`}><div className="flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-400 text-slate-950' : active ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className={`text-xs font-semibold ${complete ? 'text-emerald-200' : active ? 'text-cyan-200' : 'text-slate-500'}`}>{label}</span></div></div>;
    })}</div>

    {stage === 'select' ? <PaymentPicker onSelect={selectPayment} /> : <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <PaymentSummary payment={payment!} amount={amount} amountInput={amountInput} stage={stage} onAmountChange={setAmountInput} onPay={() => setStage('choose-app')} onReset={reset} />
      <div className="min-h-[440px] rounded-3xl border border-slate-800 bg-slate-900/75 p-5">
        {stage === 'review' && <AutoFilled payment={payment!} />}
        {stage === 'choose-app' && <AppChooser onChoose={(app) => { setSelectedApp(app); setStage('external-app'); }} />}
        {stage === 'external-app' && selectedApp && <ExternalApp app={selectedApp} payment={payment!} amount={amount} onApprove={approve} onCancel={() => setStage('cancelled')} />}
        {stage === 'returning' && <Centered icon={<Smartphone className="h-7 w-7" />} title="Returning to FinTrack…" text={`${selectedApp} says the user finished. FinTrack still treats the payment as pending.`} pulse />}
        {stage === 'verifying' && <Centered icon={<ShieldCheck className="h-7 w-7" />} title="Verifying payment…" text="The backend is checking the signed provider confirmation before creating an expense." pulse />}
        {stage === 'paid' && <Paid payment={payment!} amount={amount} transactionId={transactionId} app={selectedApp ?? 'UPI'} />}
        {stage === 'cancelled' && <Centered icon={<X className="h-7 w-7" />} title="Payment cancelled" text="No expense was created and the account balance remains unchanged." />}
      </div>
    </div>}
  </section>;
};

const PaymentPicker = ({ onSelect }: { onSelect: (payment: Payment) => void }) => <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
  <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-5">
    <div className="flex items-center justify-between"><div><h3 className="font-bold text-white">Ready to pay</h3><p className="mt-1 text-sm text-slate-400">FinTrack already has every required detail.</p></div><Sparkles className="h-5 w-5 text-cyan-300" /></div>
    <div className="mt-5 grid gap-3 md:grid-cols-3">{suggestions.map(({ icon: Icon, ...item }) => <button key={item.id} onClick={() => onSelect(item)} className="group rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-500/5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-200"><Icon className="h-5 w-5" /></div><p className="mt-4 font-semibold text-white">{item.title}</p><p className="mt-1 text-xl font-bold text-white">{money(item.amount)}</p><p className="mt-2 text-xs text-slate-500">{item.source} · no form needed</p></button>)}</div>
  </div>
  <div className="space-y-3">
    <button onClick={() => onSelect(recentPayee)} className="flex w-full items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/75 p-5 text-left hover:border-indigo-400/40"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-200"><UserRound className="h-6 w-6" /></div><div><p className="font-bold text-white">Pay recent contact</p><p className="mt-1 text-sm text-slate-400">Priya is saved—enter amount only</p></div></button>
    <button onClick={() => onSelect(scannedPayment)} className="flex w-full items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/75 p-5 text-left hover:border-emerald-400/40"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200"><ScanLine className="h-6 w-6" /></div><div><p className="font-bold text-white">Simulate scan & pay</p><p className="mt-1 text-sm text-slate-400">QR supplies payee, UPI ID and amount</p></div></button>
  </div>
</div>;

const PaymentSummary = ({ payment, amount, amountInput, stage, onAmountChange, onPay, onReset }: { payment: Payment; amount: number; amountInput: string; stage: Stage; onAmountChange: (value: string) => void; onPay: () => void; onReset: () => void }) => <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-5">
  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{payment.source}</p><h3 className="mt-2 text-xl font-bold text-white">{payment.title}</h3><p className="mt-1 text-sm text-slate-400">{payment.payee} · {payment.upiId}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400"><WalletCards className="h-5 w-5" /></div></div>
  <div className="my-5 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
    {payment.editableAmount && stage === 'review' ? <label className="block"><span className="text-xs font-semibold text-slate-400">Only the amount is missing</span><div className="mt-2 flex items-center rounded-xl border border-slate-700 bg-slate-950 px-3"><span className="text-xl text-slate-400">₹</span><input autoFocus type="number" min="1" value={amountInput} onChange={(event) => onAmountChange(event.target.value)} placeholder="Enter amount" className="w-full bg-transparent px-2 py-3 text-2xl font-bold text-white outline-none" /></div></label> : <div className="flex items-end justify-between"><span className="text-sm text-slate-400">Amount</span><span className="text-3xl font-bold text-white">{money(amount)}</span></div>}
    <div className="mt-4 space-y-2 border-t border-slate-800 pt-3 text-xs"><Row label="From" value={payment.account} /><Row label="Category" value={payment.category} /><Row label="Note" value={payment.description} /></div>
  </div>
  {stage === 'review' ? <button disabled={amount <= 0} onClick={onPay} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Confirm & pay {amount > 0 ? money(amount) : ''}<ExternalLink className="h-4 w-4" /></button> : stage === 'paid' ? <button onClick={onReset} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200"><RotateCcw className="h-4 w-4" /> Try another payment</button> : <button onClick={onReset} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200"><ArrowLeft className="h-4 w-4" /> Exit payment</button>}
  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> FinTrack never sees your UPI PIN</div>
</div>;

const Row = ({ label, value }: { label: string; value: string }) => <div className="flex justify-between gap-3 text-slate-400"><span>{label}</span><span className="text-right text-slate-200">{value}</span></div>;
const AutoRow = ({ label }: { label: string }) => <div className="flex items-center justify-between text-sm text-slate-300"><span>{label}</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><Check className="h-3 w-3" /> Ready</span></div>;
const AutoFilled = ({ payment }: { payment: Payment }) => <div className="flex h-full min-h-[400px] flex-col justify-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"><Sparkles className="h-6 w-6" /></span><h3 className="mt-4 text-center text-xl font-bold text-white">Details filled automatically</h3><p className="mt-2 text-center text-sm text-slate-400">Built from your {payment.source.toLowerCase()} instead of another transaction form.</p><div className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><AutoRow label="Payee & UPI ID" /><AutoRow label="Category & description" /><AutoRow label="Source account" /><AutoRow label="Payment date after confirmation" /></div></div>;
const Centered = ({ icon, title, text, pulse = false }: { icon: React.ReactNode; title: string; text: string; pulse?: boolean }) => <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center"><div className={`flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 ${pulse ? 'animate-pulse' : ''}`}>{icon}</div><h3 className="mt-5 text-xl font-bold text-white">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{text}</p>{pulse && <div className="mt-6 h-1.5 w-40 rounded-full bg-slate-800"><div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-400" /></div>}</div>;
const AppChooser = ({ onChoose }: { onChoose: (app: PaymentApp) => void }) => <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">UPI intent ready</p><h3 className="mt-2 text-xl font-bold text-white">Choose an app to pay</h3><p className="mt-1 text-sm text-slate-400">Your phone would show its installed UPI applications.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><AppButton mark="G" name="Google Pay" onClick={() => onChoose('Google Pay')} /><AppButton mark="पे" name="PhonePe" violet onClick={() => onChoose('PhonePe')} /></div></div>;
const AppButton = ({ mark, name, violet = false, onClick }: { mark: string; name: string; violet?: boolean; onClick: () => void }) => <button onClick={onClick} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-5 text-left hover:border-cyan-400/50"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black ${violet ? 'bg-violet-600 text-white' : 'bg-white text-blue-600'}`}>{mark}</span><span className="mt-4 block font-semibold text-white">{name}</span><span className="mt-1 block text-xs text-slate-400">Open simulated app</span></button>;

const ExternalApp = ({ app, payment, amount, onApprove, onCancel }: { app: PaymentApp; payment: Payment; amount: number; onApprove: () => void; onCancel: () => void }) => {
  const google = app === 'Google Pay';
  return <div className={`mx-auto max-w-sm overflow-hidden rounded-[30px] border ${google ? 'border-blue-400/30 bg-[#101827]' : 'border-violet-400/30 bg-[#170d2a]'}`}><div className={`px-5 py-4 ${google ? 'bg-blue-600' : 'bg-violet-700'}`}><p className="text-xs text-white/70">SIMULATED EXTERNAL APP</p><p className="mt-1 font-bold text-white">{app}</p></div><div className="p-6 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-black text-slate-900">{payment.payee.slice(0, 2).toUpperCase()}</div><p className="mt-4 text-sm text-slate-400">Paying {payment.payee}</p><p className="mt-2 text-3xl font-bold text-white">{money(amount)}</p><div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-left text-xs text-slate-300"><Row label="From" value="HDFC Bank ••4821" /><div className="mt-2"><Row label="To" value={payment.upiId} /></div></div><button onClick={onApprove} className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white ${google ? 'bg-blue-600' : 'bg-violet-600'}`}>Approve payment</button><button onClick={onCancel} className="mt-2 w-full px-4 py-2.5 text-sm font-semibold text-slate-400">Cancel</button><p className="mt-3 text-[11px] text-slate-500">A real UPI app would request your UPI PIN here.</p></div></div>;
};

const Paid = ({ payment, amount, transactionId, app }: { payment: Payment; amount: number; transactionId: string; app: string }) => <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400 text-slate-950"><CheckCircle2 className="h-10 w-10" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Webhook verified</p><h3 className="mt-2 text-2xl font-bold text-white">Paid and recorded</h3><p className="mt-2 text-sm text-slate-400">FinTrack automatically created the expense—no second form.</p><div className="mt-6 w-full max-w-sm rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left text-xs"><Row label="Expense" value={`${payment.payee} · ${money(amount)}`} /><div className="mt-3"><Row label="Category" value={payment.category} /></div><div className="mt-3"><Row label="Account" value={payment.account} /></div><div className="mt-3"><Row label="Method" value={`${app} · UPI`} /></div><div className="mt-3"><Row label="Transaction" value={transactionId} /></div><div className="mt-3 flex justify-between text-slate-400"><span>Recorded</span><span className="inline-flex items-center gap-1 text-emerald-300"><ReceiptText className="h-3 w-3" /><Clock3 className="h-3 w-3" /> just now</span></div></div></div>;
