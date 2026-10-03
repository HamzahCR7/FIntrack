import React from 'react';
import { BookOpen, Check, X } from 'lucide-react';

export type GuideFeature = 'overview' | 'smart-guidance' | 'reminders' | 'transactions' | 'accounts' | 'debts' | 'subscriptions' | 'budgets' | 'goals' | 'forecast' | 'financial-hub' | 'ai' | 'settings';

const GUIDES: Record<GuideFeature, { title: string; intro: string; points: string[]; tip: string }> = {
  overview: { title: 'Your financial overview', intro: 'A quick snapshot of your current money position and recent activity.', points: ['Available balance combines accounts included in totals.', 'Monthly income, spending, and savings update from transactions.', 'Quick actions take you directly to common tasks.'], tip: 'Start by adding your accounts, then record your latest transactions.' },
  'smart-guidance': { title: 'Smart Guidance', intro: 'Prioritized actions generated from your current financial activity.', points: ['Review urgent money tasks first.', 'Compare current behavior with previous periods.', 'Use suggestions as guidance—not automatic financial decisions.'], tip: 'Guidance becomes more useful as you add accurate transactions and due dates.' },
  reminders: { title: 'Due timeline', intro: 'One place for upcoming bills, card payments, debts, and recurring charges.', points: ['Items are ordered by urgency.', 'Credit-card dues come from card settings.', 'Subscriptions advance after you record their payment.'], tip: 'Set due dates on cards, debts, and subscriptions for reliable reminders.' },
  transactions: { title: 'Transaction ledger', intro: 'Your complete history of income, expenses, and transfers.', points: ['Use filters and search to find records quickly.', 'Edit a transaction to correct its account, category, or payment method.', 'Transfers move balances without counting as income or spending.'], tip: 'Always select the real source account so balances remain accurate.' },
  accounts: { title: 'Accounts and balances', intro: 'Track banks, cash, cards, UPI, and optional wallets.', points: ['Monthly view shows account activity; All shows live balances.', 'Credit cards track outstanding debt and utilization.', 'Wallets appear only after you create one.'], tip: 'Manage account names and balance rules from your profile workspace.' },
  debts: { title: 'Money owed', intro: 'Track money you lent and money you borrowed.', points: ['Record the original amount and due date.', 'Partial settlements reduce the remaining balance.', 'Link an account when money enters or leaves it.'], tip: 'Choose the correct direction: “owed to me” versus “I owe”.' },
  subscriptions: { title: 'Recurring payments', intro: 'Manage repeating bills and subscriptions without re-entering details.', points: ['Set the billing cycle and next payment date.', 'Processing a payment creates an expense.', 'Pause or cancel items that are no longer active.'], tip: 'Link each subscription to its actual payment account and category.' },
  budgets: { title: 'Budgets', intro: 'Set spending limits for a period or selected categories.', points: ['Progress is calculated from categorized expenses.', 'Warnings show when you approach your threshold.', 'Review the included transactions when totals look unexpected.'], tip: 'Begin with a few important categories instead of budgeting everything at once.' },
  goals: { title: 'Financial goals', intro: 'Turn savings targets into measurable progress.', points: ['Set a target amount and optional deadline.', 'Update contributions as you save.', 'Use progress and required pace to adjust your plan.'], tip: 'Make the first milestone small enough to build momentum.' },
  forecast: { title: 'Spending forecast', intro: 'Projects month-end results from your current pace.', points: ['Forecasts change as new transactions arrive.', 'At-risk budgets highlight likely overspending.', 'Projected savings are estimates, not guaranteed outcomes.'], tip: 'Check again after large income or expense entries.' },
  'financial-hub': { title: 'Money Lab', intro: 'Advanced review and scenario tools for deeper financial planning.', points: ['Explore patterns across your financial data.', 'Test changes before committing to them.', 'Use results alongside your real-world obligations.'], tip: 'Keep account balances and recurring payments current for better scenarios.' },
  ai: { title: 'Ask FinTrack', intro: 'Ask questions about the financial data in your private workspace.', points: ['Ask specific questions with a timeframe.', 'Review the underlying numbers before acting.', 'Personalization settings improve the relevance of answers.'], tip: 'Try: “Where did I spend the most this month?”' },
  settings: { title: 'Manage your workspace', intro: 'Customize the building blocks used throughout FinTrack.', points: ['Create, edit, or archive accounts and wallets.', 'Add reusable payment methods.', 'Rename or archive categories without changing old records.'], tip: 'Use “Include in total balance” to control how each account affects your overview.' },
};

interface Props { feature: GuideFeature; onDismiss: () => void }

export const FeatureGuide: React.FC<Props> = ({ feature, onDismiss }) => {
  const guide = GUIDES[feature];
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="feature-guide-title">
    <section className="w-full max-w-lg rounded-[1.75rem] border border-cyan-400/25 bg-slate-900 p-5 shadow-2xl shadow-black/60 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><BookOpen className="h-5 w-5" /></div><button onClick={onDismiss} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800" aria-label="Close feature guide"><X className="h-5 w-5" /></button></div>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">First visit guide</p>
      <h2 id="feature-guide-title" className="mt-1 text-xl font-bold text-white">{guide.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{guide.intro}</p>
      <ul className="mt-4 space-y-3">{guide.points.map((point) => <li key={point} className="flex gap-2.5 text-sm text-slate-300"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300"><Check className="h-3 w-3" /></span><span>{point}</span></li>)}</ul>
      <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 text-xs leading-5 text-amber-100"><strong>Good first step:</strong> {guide.tip}</div>
      <button onClick={onDismiss} className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950">Got it</button>
    </section>
  </div>;
};
