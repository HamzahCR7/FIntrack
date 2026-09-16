import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { api } from '../api/client';
import { RunwaySimulationResponse } from '../types';
import { formatCurrency } from './SummaryCards';

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type FormState = {
  months: number;
  salaryChangePercent: number;
  rentChangePercent: number;
  cancelSubscriptionsCount: number;
  extraMonthlyEmi: number;
};

const defaultForm: FormState = {
  months: 12,
  salaryChangePercent: 0,
  rentChangePercent: 0,
  cancelSubscriptionsCount: 0,
  extraMonthlyEmi: 0,
};

export const RunwaySimulatorCard: React.FC = () => {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunwaySimulationResponse | null>(null);

  const riskClasses = useMemo(() => {
    if (!result) {
      return 'border-slate-700 bg-slate-900/60 text-slate-200';
    }

    if (result.risk.level === 'HIGH') {
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    }

    if (result.risk.level === 'MEDIUM') {
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    }

    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }, [result]);

  const handleChange = (field: keyof FormState, value: number) => {
    setForm((prev) => {
      if (field === 'months') {
        return { ...prev, [field]: clampNumber(value, 3, 24) };
      }
      if (field === 'salaryChangePercent' || field === 'rentChangePercent') {
        return { ...prev, [field]: clampNumber(value, -90, 300) };
      }
      if (field === 'cancelSubscriptionsCount') {
        return { ...prev, [field]: clampNumber(value, 0, 20) };
      }
      return { ...prev, [field]: clampNumber(value, 0, 10000000) };
    });
  };

  const executeSimulation = useCallback(async (payload: FormState) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRunwaySimulation(payload);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to run simulation');
    } finally {
      setLoading(false);
    }
  }, []);

  const runSimulation = () => {
    void executeSimulation(form);
  };

  useEffect(() => {
    void executeSimulation(defaultForm);
  }, [executeSimulation]);

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600 transition-all shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl border bg-blue-500/10 text-blue-400 border-blue-500/20">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-white">Cashflow Runway Simulator</span>
        </div>
        <button
          onClick={() => runSimulation()}
          disabled={loading}
          className="px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-100 text-xs font-semibold hover:bg-blue-500/30 disabled:opacity-60 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
          Run simulation
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <label className="text-xs text-slate-300 space-y-1 block">
          <span className="text-slate-400">Months</span>
          <input
            type="number"
            value={form.months}
            min={3}
            max={24}
            onChange={(e) => handleChange('months', Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
          />
        </label>

        <label className="text-xs text-slate-300 space-y-1 block">
          <span className="text-slate-400">Salary change %</span>
          <input
            type="number"
            value={form.salaryChangePercent}
            min={-90}
            max={300}
            onChange={(e) => handleChange('salaryChangePercent', Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
          />
        </label>

        <label className="text-xs text-slate-300 space-y-1 block">
          <span className="text-slate-400">Rent change %</span>
          <input
            type="number"
            value={form.rentChangePercent}
            min={-90}
            max={300}
            onChange={(e) => handleChange('rentChangePercent', Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
          />
        </label>

        <label className="text-xs text-slate-300 space-y-1 block">
          <span className="text-slate-400">Cancel subscriptions</span>
          <input
            type="number"
            value={form.cancelSubscriptionsCount}
            min={0}
            max={20}
            onChange={(e) => handleChange('cancelSubscriptionsCount', Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
          />
        </label>

        <label className="text-xs text-slate-300 space-y-1 block">
          <span className="text-slate-400">Extra monthly EMI</span>
          <input
            type="number"
            value={form.extraMonthlyEmi}
            min={0}
            max={10000000}
            onChange={(e) => handleChange('extraMonthlyEmi', Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
      ) : null}

      {result ? (
        <>
          <div className={`mt-4 rounded-xl border p-3 text-xs ${riskClasses}`}>
            <div className="flex items-center gap-2">
              {result.risk.level === 'HIGH' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span className="font-semibold">Risk: {result.risk.level}</span>
            </div>
            <p className="mt-1">
              {result.risk.monthsUntilNegative
                ? `Balance turns negative in ${result.risk.firstNegativeMonthLabel}.`
                : 'Balance stays above zero in selected horizon.'}
            </p>
            <p className="mt-1">
              Biggest monthly pressure: {result.risk.biggestDropDriver.name} ({formatCurrency(result.risk.biggestDropDriver.monthlyImpact)}).
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Baseline net / month</p>
              <p className={`text-base font-bold mt-0.5 ${result.baseline.monthlyNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatCurrency(result.baseline.monthlyNet)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Scenario net / month</p>
              <p className={`text-base font-bold mt-0.5 ${result.scenario.monthlyNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatCurrency(result.scenario.monthlyNet)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Subscription savings</p>
              <p className="text-base font-bold mt-0.5 text-cyan-300">{formatCurrency(result.scenario.monthlySubscriptionSavings)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Starting balance</p>
              <p className="text-base font-bold mt-0.5 text-white">{formatCurrency(result.baseline.startingBalance)}</p>
            </div>
          </div>

          <div className="mt-4 h-64 rounded-xl border border-slate-700/50 bg-slate-900/40 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.timeline} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
                <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="baselineBalance" name="Baseline" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="scenarioBalance" name="Scenario" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Top 3 actions</p>
              <div className="mt-2 space-y-1.5 text-xs text-slate-200">
                {result.recommendations.map((item, idx) => (
                  <p key={`${item}-${idx}`} className="flex items-start gap-2">
                    <TrendingDown className="w-3.5 h-3.5 mt-0.5 text-amber-300 shrink-0" />
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Cancelled subscriptions</p>
              <div className="mt-2 space-y-1.5 text-xs">
                {result.cancelledSubscriptions.length > 0 ? (
                  result.cancelledSubscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between text-slate-200">
                      <span>{sub.name}</span>
                      <span className="text-cyan-300">{formatCurrency(sub.monthlyCost)}/mo</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No subscriptions cancelled in this scenario.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-xs text-slate-400">Run a scenario to see your 6-12 month cash runway and risk level.</p>
      )}
    </div>
  );
};
