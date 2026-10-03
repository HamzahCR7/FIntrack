import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, Landmark, LayoutDashboard, PlusCircle, Settings, Target, X } from 'lucide-react';

type TourTab = 'overview' | 'accounts' | 'transactions' | 'budgets' | 'settings' | 'ai';

const STEPS = [
  { title: 'Welcome to FinTrack', text: 'Your private workspace brings balances, spending, goals, reminders, and guidance together.', icon: LayoutDashboard, tab: 'overview' as TourTab },
  { title: 'Set up your money sources', text: 'Open Manage to add bank accounts, cash, cards, or optional digital wallets. You control what counts in your total.', icon: Settings, tab: 'settings' as TourTab },
  { title: 'Record money movement', text: 'Add income, expenses, and transfers. Choose the source account and create your own payment methods.', icon: PlusCircle, tab: 'transactions' as TourTab },
  { title: 'Plan instead of guessing', text: 'Create budgets and goals, then use forecasts to understand where your money is heading.', icon: Target, tab: 'budgets' as TourTab },
  { title: 'Ask your money guide', text: 'Ask FinTrack questions using your own financial data and review personalized next steps.', icon: Bot, tab: 'ai' as TourTab },
];

interface Props { userId: string; onClose: () => void; onNavigate: (tab: TourTab) => void }

export const OnboardingTour: React.FC<Props> = ({ userId, onClose, onNavigate }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const finish = () => {
    localStorage.setItem(`fintrack_onboarding_complete:${userId}`, 'true');
    onNavigate('overview');
    onClose();
  };
  const move = (next: number) => {
    setStep(next);
    onNavigate(STEPS[next].tab);
  };

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="tour-title">
    <section className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-cyan-400/25 bg-slate-900 shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>{STEPS.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === step ? 'w-8 bg-cyan-400' : index < step ? 'w-4 bg-cyan-700' : 'w-4 bg-slate-700'}`} />)}</div>
        <button onClick={finish} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Skip tour"><X className="h-5 w-5" /></button>
      </div>
      <div className="px-6 py-8 text-center sm:px-9">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-300 ring-1 ring-cyan-400/25"><Icon className="h-8 w-8" /></div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Step {step + 1} of {STEPS.length}</p>
        <h2 id="tour-title" className="mt-2 text-2xl font-bold text-white">{current.title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-300">{current.text}</p>
      </div>
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/35 px-5 py-4">
        {step > 0 ? <button onClick={() => move(step - 1)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"><ArrowLeft className="h-4 w-4" />Back</button> : <button onClick={finish} className="px-3 py-2 text-sm font-semibold text-slate-400">Skip</button>}
        <button onClick={() => step === STEPS.length - 1 ? finish() : move(step + 1)} className="flex items-center gap-1 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950">{step === STEPS.length - 1 ? 'Start using FinTrack' : 'Next'}{step < STEPS.length - 1 && <ArrowRight className="h-4 w-4" />}</button>
      </div>
    </section>
  </div>;
};
