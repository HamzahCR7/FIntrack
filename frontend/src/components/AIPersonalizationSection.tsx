import React, { useEffect, useState } from 'react';
import { Bot, Check, CircleDollarSign, PiggyBank, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { api } from '../api/client';

interface FinancialProfile {
  monthlyIncomeTarget?: number | null;
  monthlySavingsGoal?: number | null;
  emergencyFundTarget?: number | null;
  discretionarySpendCap?: number | null;
  preferredSavingsRate?: number | null;
}

interface Insight {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  observation: string;
  supportingData: string;
  recommendation: string;
}

const initialProfile: FinancialProfile = {
  monthlyIncomeTarget: null,
  monthlySavingsGoal: null,
  emergencyFundTarget: null,
  discretionarySpendCap: null,
  preferredSavingsRate: 20,
};

export const AIPersonalizationSection: React.FC = () => {
  const [profile, setProfile] = useState<FinancialProfile>(initialProfile);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadPersonalization = async () => {
      try {
        const [savedProfile, response] = await Promise.all([
          api.getFinancialProfile(),
          fetch('/api/v1/analytics/insights').then((result) => result.json()),
        ]);
        setProfile(savedProfile);
        setInsights(response.data || []);
      } finally {
        setIsLoading(false);
      }
    };
    loadPersonalization();
  }, []);

  const updateNumber = (field: keyof FinancialProfile, value: string) => {
    setSaved(false);
    setProfile((current) => ({ ...current, [field]: value === '' ? null : Number(value) }));
  };

  const saveProfile = async () => {
    const payload = Object.fromEntries(
      Object.entries(profile).filter(([, value]) => value !== null && value !== undefined)
    ) as Record<string, number>;
    try {
      setIsSaving(true);
      const updatedProfile = await api.updateFinancialProfile(payload);
      setProfile(updatedProfile);
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFeedback = async (insightId: string, isUseful: boolean) => {
    await api.saveInsightFeedback(insightId, isUseful);
    if (!isUseful) {
      setInsights((current) => current.filter((insight) => insight.id !== insightId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-cyan-300" />
          <div>
            <h3 className="text-sm font-bold text-white">Personalize Your Financial Guide</h3>
            <p className="text-xs text-slate-400">Your goals shape savings and spending recommendations.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileInput label="Monthly income target" value={profile.monthlyIncomeTarget} onChange={(value) => updateNumber('monthlyIncomeTarget', value)} icon={<CircleDollarSign className="h-4 w-4" />} />
          <ProfileInput label="Monthly savings goal" value={profile.monthlySavingsGoal} onChange={(value) => updateNumber('monthlySavingsGoal', value)} icon={<PiggyBank className="h-4 w-4" />} />
          <ProfileInput label="Emergency fund target" value={profile.emergencyFundTarget} onChange={(value) => updateNumber('emergencyFundTarget', value)} icon={<ShieldCheck className="h-4 w-4" />} />
          <ProfileInput label="Monthly spending limit" value={profile.discretionarySpendCap} onChange={(value) => updateNumber('discretionarySpendCap', value)} icon={<CircleDollarSign className="h-4 w-4" />} />
          <ProfileInput label="Savings target (%)" value={profile.preferredSavingsRate} onChange={(value) => updateNumber('preferredSavingsRate', value)} icon={<PiggyBank className="h-4 w-4" />} suffix="%" />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={saveProfile} disabled={isSaving} className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50">
            <Check className="h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save goals'}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Personalized Insights</h3>
            <p className="text-xs text-slate-400">Recommendations based on your recorded transactions and goals.</p>
          </div>
          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-400">{insights.length} active</span>
        </div>
        {isLoading ? (
          <p className="text-xs text-slate-400">Analyzing your ledger...</p>
        ) : insights.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-400">No active insights right now. Add more transactions to deepen the analysis.</p>
        ) : (
          <div className="space-y-2">
            {insights.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-100">{insight.observation}</p>
                    <p className="mt-1 text-xs text-slate-400">{insight.supportingData}</p>
                    <p className="mt-2 text-xs text-cyan-200">{insight.recommendation}</p>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    <FeedbackButton title="Useful recommendation" onClick={() => handleFeedback(insight.id, true)} icon={<ThumbsUp className="h-3.5 w-3.5" />} />
                    <FeedbackButton title="Not useful" onClick={() => handleFeedback(insight.id, false)} icon={<ThumbsDown className="h-3.5 w-3.5" />} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileInput = ({ label, value, onChange, icon, suffix }: { label: string; value?: number | null; onChange: (value: string) => void; icon: React.ReactNode; suffix?: string }) => (
  <label className="block">
    <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">{icon}{label}</span>
    <div className="relative">
      <input type="number" min="0" value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-7 text-xs text-white outline-none focus:border-cyan-400" />
      {suffix && <span className="absolute right-3 top-2 text-xs text-slate-500">{suffix}</span>}
    </div>
  </label>
);

const FeedbackButton = ({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) => (
  <button type="button" title={title} aria-label={title} onClick={onClick} className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-200">{icon}</button>
);
