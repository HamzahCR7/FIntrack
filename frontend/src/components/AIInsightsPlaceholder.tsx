import React from 'react';
import { Sparkles, Bot, ArrowRight, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

export const AIInsightsPlaceholder: React.FC = () => {
  const samplePrompts = [
    'How much did I spend this month?',
    'Where did most of my money go?',
    'How much did I spend using UPI?',
    'How much did I spend on food using my credit card?',
    'Compare my spending this month with last month.',
    'What are my biggest recurring expenses?',
    'Which category increased the most?',
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 lg:p-8 shadow-xl">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">FinTrack AI Assistant</h2>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Phase 5 Placeholder
                </span>
              </div>
              <p className="text-xs text-slate-400">Natural-Language Financial Intelligence & Query System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Strict Financial Guardrails & Fact-Grounded Answers</span>
          </div>
        </div>

        {/* AI Query Prompt Box (Disabled / Placeholder state) */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Ask natural-language questions about your ledger data:
          </label>
          <div className="relative">
            <input
              type="text"
              disabled
              placeholder="Ask FinTrack AI: e.g., 'How much did I spend on food using my credit card this month?'..."
              className="w-full bg-slate-900/90 border border-indigo-500/30 rounded-xl pl-4 pr-32 py-3.5 text-sm text-slate-400 placeholder-slate-500 cursor-not-allowed shadow-inner"
            />
            <button
              disabled
              className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600/50 text-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed opacity-75"
            >
              <span>Ask AI</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            </button>
          </div>
        </div>

        {/* Sample Question Chips */}
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Sample Financial Questions Supported in Next Phase:
          </span>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((q, idx) => (
              <div
                key={idx}
                className="text-xs bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 px-3 py-1.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <MessageSquare className="w-3 h-3 text-indigo-400" />
                <span>"{q}"</span>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Note */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            FinTrack AI will process questions securely by querying database services rather than inventing numbers.
          </span>
        </div>
      </div>
    </div>
  );
};
