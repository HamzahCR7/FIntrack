import React from 'react';
import { Gauge, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from './SummaryCards';
import { SpendForecast } from '../types';

interface SpendForecastCardProps {
  forecast?: SpendForecast;
}

export const SpendForecastCard: React.FC<SpendForecastCardProps> = ({ forecast }) => {
  if (!forecast) return null;

  const weeklyPieColors = ['#0EA5E9', '#10B981', '#F59E0B', '#F97316', '#6366F1'];

  const progressPercent = forecast.daysInMonth > 0
    ? Math.min(100, Math.round((forecast.daysElapsed / forecast.daysInMonth) * 100))
    : 0;
  const spendPercentOfIncome = forecast.incomeThisMonth > 0
    ? Math.min(999, Math.round((forecast.projectedMonthEndSpend / forecast.incomeThisMonth) * 100))
    : 0;
  const budgetsAtRisk = forecast.budgetForecasts.filter((b) => b.willExceed);

  const currentMonthTrendLabel = forecast.currentMonthWeeklyTrend.direction === 'IMPROVING'
    ? 'Improving'
    : forecast.currentMonthWeeklyTrend.direction === 'DECLINING'
      ? 'Declining'
      : forecast.currentMonthWeeklyTrend.direction === 'STABLE'
        ? 'Stable'
        : 'Insufficient data';

  const currentMonthTrendColorClass = forecast.currentMonthWeeklyTrend.direction === 'IMPROVING'
    ? 'text-emerald-400'
    : forecast.currentMonthWeeklyTrend.direction === 'DECLINING'
      ? 'text-rose-400'
      : 'text-slate-300';

  const weeklyTrendLabel = forecast.currentMonthWeeklyTrend.direction === 'IMPROVING'
    ? 'Improving'
    : forecast.currentMonthWeeklyTrend.direction === 'DECLINING'
      ? 'Declining'
      : forecast.currentMonthWeeklyTrend.direction === 'STABLE'
        ? 'Stable'
        : 'Insufficient data';

  const weeklyTrendToneClass = forecast.currentMonthWeeklyTrend.direction === 'IMPROVING'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
    : forecast.currentMonthWeeklyTrend.direction === 'DECLINING'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
      : 'border-slate-600/50 bg-slate-700/30 text-slate-300';

  const currentWeekPoint = forecast.currentMonthWeeklyTrend.points[forecast.currentMonthWeeklyTrend.points.length - 1];
  const currentWeekTotalDays = currentWeekPoint
    ? Math.max(1, Math.min(7, forecast.daysInMonth - ((currentWeekPoint.weekNumber - 1) * 7)))
    : null;

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600 transition-all shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-xl border ${forecast.willOverspend ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            <Gauge className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-white">Month-End Spend Forecast</span>
        </div>
        <span className="text-[11px] text-slate-400">Day {forecast.daysElapsed} of {forecast.daysInMonth}</span>
      </div>

      {/* Month progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
        <div className="h-full bg-blue-500/70" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Spent so far</p>
          <p className="text-base font-bold text-white mt-0.5">{formatCurrency(forecast.spendingSoFar)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Daily burn rate</p>
          <p className="text-base font-bold text-white mt-0.5">{formatCurrency(forecast.dailyBurnRate)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Projected month-end</p>
          <p className={`text-base font-bold mt-0.5 ${forecast.willOverspend ? 'text-rose-400' : 'text-white'}`}>
            {formatCurrency(forecast.projectedMonthEndSpend)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Projected savings</p>
          <p className={`text-base font-bold mt-0.5 ${forecast.projectedSavings >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
            {formatCurrency(forecast.projectedSavings)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Current month trend</p>
          <p className={`text-base font-bold mt-0.5 ${currentMonthTrendColorClass}`}>
            {currentMonthTrendLabel}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {forecast.currentMonthWeeklyTrend.changePercent !== null
              ? `${forecast.currentMonthWeeklyTrend.changePercent > 0 ? '+' : ''}${forecast.currentMonthWeeklyTrend.changePercent}%`
              : 'Need history'}
          </p>
        </div>
      </div>

      <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs ${
        forecast.willOverspend
          ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      }`}
      >
        {forecast.willOverspend ? (
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <span>
          {forecast.willOverspend
            ? `Trending to overspend by ${formatCurrency(forecast.projectedOverspend)} (${spendPercentOfIncome}% of income) with ${forecast.daysRemaining} day(s) left.`
            : `On track this month — projected spend is within your income with ${forecast.daysRemaining} day(s) remaining.`}
        </span>
      </div>

      <div className={`mt-3 rounded-xl border p-3 text-xs ${weeklyTrendToneClass}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold uppercase tracking-wider">Current month weekly trend</p>
          <span className="inline-flex items-center gap-1 font-semibold">
            {forecast.currentMonthWeeklyTrend.direction === 'IMPROVING' && <TrendingDown className="w-3.5 h-3.5" />}
            {forecast.currentMonthWeeklyTrend.direction === 'DECLINING' && <TrendingUp className="w-3.5 h-3.5" />}
            {(forecast.currentMonthWeeklyTrend.direction === 'STABLE' || forecast.currentMonthWeeklyTrend.direction === 'INSUFFICIENT_DATA') && <Minus className="w-3.5 h-3.5" />}
            {weeklyTrendLabel}
          </span>
        </div>

        {currentWeekPoint && currentWeekTotalDays !== null && (
          <p className="mt-1 text-[11px] opacity-90">
            Current week {currentWeekPoint.weekLabel}: {currentWeekPoint.daysCovered}/{currentWeekTotalDays} day(s) passed.
          </p>
        )}

        <p className="mt-1 text-[11px] opacity-90">
          {forecast.currentMonthWeeklyTrend.changeAmount !== null
            ? `Latest week burn-rate vs previous week: ${forecast.currentMonthWeeklyTrend.changeAmount > 0 ? '+' : ''}${formatCurrency(forecast.currentMonthWeeklyTrend.changeAmount)}${forecast.currentMonthWeeklyTrend.changePercent !== null ? ` (${forecast.currentMonthWeeklyTrend.changePercent > 0 ? '+' : ''}${forecast.currentMonthWeeklyTrend.changePercent}%)` : ''} per day.`
            : 'Need at least 2 weeks of current-month data for week-over-week direction.'}
        </p>

        {forecast.currentMonthWeeklyTrend.points.length > 0 && (
          <div className="mt-3 rounded-lg border border-current/20 bg-black/10 p-2">
            <p className="text-[10px] uppercase tracking-wide opacity-80">Week share of current month spend</p>
            <div className="mt-2 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={forecast.currentMonthWeeklyTrend.points}
                    dataKey="spent"
                    nameKey="weekLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={56}
                    innerRadius={30}
                    paddingAngle={2}
                  >
                    {forecast.currentMonthWeeklyTrend.points.map((point, index) => (
                      <Cell key={point.weekLabel} fill={weeklyPieColors[index % weeklyPieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#f8fafc' }}
                    labelStyle={{ color: '#cbd5e1' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {forecast.currentMonthWeeklyTrend.points.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {forecast.currentMonthWeeklyTrend.points.map((point) => (
              <div key={point.weekLabel} className="rounded-lg border border-current/20 bg-black/10 px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wide opacity-80">{point.weekLabel} ({point.daysCovered}d)</p>
                <p className="text-xs font-semibold">Spent: {formatCurrency(point.spent)}</p>
                <p className="text-[10px] opacity-90">Burn/day: {formatCurrency(point.burnRate)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {budgetsAtRisk.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Budgets projected to exceed limit
          </p>
          {budgetsAtRisk.map((b) => (
            <div key={b.budgetId} className="flex items-center justify-between text-xs bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2">
              <span className="text-slate-300 font-medium">{b.budgetName}</span>
              <span className="text-rose-400 font-semibold">
                +{formatCurrency(b.projectedOverBudget)} over {formatCurrency(b.budgetAmount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
