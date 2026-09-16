import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  DollarSign,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, usePrivacyMode } from '../utils/privacyStore';
import { DashboardData } from '../types';
import { ClearableSelect } from './ClearableSelect';

interface CanIAffordThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: DashboardData | null;
}

export const CanIAffordThisModal: React.FC<CanIAffordThisModalProps> = ({ isOpen, onClose, dashboardData }) => {
  usePrivacyMode();

  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [purchaseType, setPurchaseType] = useState<'ONE_TIME' | 'EMI'>('ONE_TIME');
  const [emiMonths, setEmiMonths] = useState('6');
  const [paymentSource, setPaymentSource] = useState<'SAVINGS' | 'MONTHLY_INCOME' | 'CREDIT_CARD'>('SAVINGS');
  const [evaluatedResult, setEvaluatedResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const totalLiquid = dashboardData
    ? (dashboardData.accounts.bankBalances || 0) +
      (dashboardData.accounts.cashBalances || 0) +
      (dashboardData.accounts.upiBalances || 0)
    : 0;

  const monthlyIncome = dashboardData?.summary?.incomeThisMonth || 50000;
  const monthlyExpenses = dashboardData?.summary?.spendingThisMonth || 25000;
  const netMonthlySurplus = Math.max(0, monthlyIncome - monthlyExpenses);

  const handleEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) return;

    let emiAmount = price;
    if (purchaseType === 'EMI') {
      const months = parseInt(emiMonths) || 6;
      emiAmount = Math.round(price / months);
    }

    const priceVsLiquidRatio = (price / Math.max(1, totalLiquid)) * 100;
    const priceVsSurplusRatio = (price / Math.max(1, netMonthlySurplus)) * 100;

    let verdict: 'SAFE' | 'CAUTION' | 'RISKY' = 'SAFE';
    let title = 'Yes, you can comfortably afford this!';
    let summary = '';
    let impacts: string[] = [];

    if (purchaseType === 'ONE_TIME') {
      if (price > totalLiquid) {
        verdict = 'RISKY';
        title = 'Not Recommended (Exceeds Total Liquid Assets)';
        summary = `This purchase of ${formatCurrency(price)} exceeds your current total liquid cash (${formatCurrency(totalLiquid)}).`;
        impacts.push('Would put your liquid bank/cash balance into negative debt.');
        impacts.push('Exhausts 100% of your emergency fund.');
      } else if (price > totalLiquid * 0.4 || price > netMonthlySurplus * 2) {
        verdict = 'CAUTION';
        title = 'Proceed with Caution';
        summary = `This item takes ${priceVsLiquidRatio.toFixed(0)}% of your total liquid savings or 2+ months of net monthly savings.`;
        impacts.push(`Reduces total liquid cash buffer down to ${formatCurrency(totalLiquid - price)}.`);
        impacts.push(`Wipes out ${(price / Math.max(1, netMonthlySurplus)).toFixed(1)} months of net monthly savings.`);
      } else {
        verdict = 'SAFE';
        title = 'Safe & Comfortable Purchase';
        summary = `This purchase takes only ${priceVsLiquidRatio.toFixed(1)}% of your liquid savings. Your cash buffer remains very healthy.`;
        impacts.push(`Liquid cash buffer remains strong at ${formatCurrency(totalLiquid - price)}.`);
        impacts.push(`Can be recovered in approx ${Math.ceil(price / Math.max(1, netMonthlySurplus))} weeks of savings.`);
      }
    } else {
      // EMI Evaluation
      if (emiAmount > netMonthlySurplus * 0.5) {
        verdict = 'RISKY';
        title = 'High Monthly Commitment Risk';
        summary = `Monthly EMI of ${formatCurrency(emiAmount)} takes more than 50% of your net monthly surplus (${formatCurrency(netMonthlySurplus)}).`;
        impacts.push(`Reduces monthly free cash flow by ${((emiAmount / Math.max(1, netMonthlySurplus)) * 100).toFixed(0)}%.`);
        impacts.push(`Locks you into a ${emiMonths}-month financial commitment.`);
      } else if (emiAmount > netMonthlySurplus * 0.25) {
        verdict = 'CAUTION';
        title = 'Moderate Monthly Impact';
        summary = `Monthly EMI of ${formatCurrency(emiAmount)} for ${emiMonths} months is manageable, but reduces your monthly savings capability.`;
        impacts.push(`Consumes ${((emiAmount / Math.max(1, netMonthlySurplus)) * 100).toFixed(0)}% of monthly free cash flow.`);
      } else {
        verdict = 'SAFE';
        title = 'Easily Afforded on EMI';
        summary = `Monthly EMI of ${formatCurrency(emiAmount)} takes only ${((emiAmount / Math.max(1, netMonthlySurplus)) * 100).toFixed(0)}% of your monthly surplus.`;
        impacts.push(`Leaves ${formatCurrency(netMonthlySurplus - emiAmount)} free savings every month.`);
      }
    }

    setEvaluatedResult({
      verdict,
      title,
      summary,
      impacts,
      price,
      purchaseType,
      emiAmount,
      postPurchaseLiquid: Math.max(0, totalLiquid - price),
      postPurchaseSurplus: Math.max(0, netMonthlySurplus - (purchaseType === 'EMI' ? emiAmount : price)),
    });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">"Can I Afford This?" Analyzer</h3>
              <p className="text-xs text-slate-400">Simulate purchase impact on your savings & cash flow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleEvaluate} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Item / Purchase Goal</label>
            <input
              type="text"
              required
              placeholder="e.g. iPhone 15 Pro / Trip to Goa / Playstation 5"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Estimated Cost (₹)</label>
              <input
                type="number"
                required
                placeholder="e.g. 75000"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Payment Plan</label>
              <ClearableSelect
                value={purchaseType}
                onValueChange={(value) => setPurchaseType(value as 'ONE_TIME' | 'EMI')}
                defaultValue="ONE_TIME"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="ONE_TIME">One-Time Full Cash</option>
                <option value="EMI">No-Cost / Monthly EMI</option>
              </ClearableSelect>
            </div>
          </div>

          {purchaseType === 'EMI' && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">EMI Duration (Months)</label>
              <ClearableSelect
                value={emiMonths}
                onValueChange={setEmiMonths}
                defaultValue="6"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="9">9 Months</option>
                <option value="12">12 Months</option>
                <option value="18">18 Months</option>
                <option value="24">24 Months</option>
              </ClearableSelect>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Affordability & Impact</span>
          </button>
        </form>

        {/* Evaluation Output Result Card */}
        {evaluatedResult && (
          <div
            className={`p-4 rounded-2xl border space-y-3 animate-in slide-in-from-bottom-2 duration-300 ${
              evaluatedResult.verdict === 'SAFE'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : evaluatedResult.verdict === 'CAUTION'
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {evaluatedResult.verdict === 'SAFE' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {evaluatedResult.verdict === 'CAUTION' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              {evaluatedResult.verdict === 'RISKY' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              <h4
                className={`text-sm font-bold ${
                  evaluatedResult.verdict === 'SAFE'
                    ? 'text-emerald-300'
                    : evaluatedResult.verdict === 'CAUTION'
                    ? 'text-amber-300'
                    : 'text-rose-300'
                }`}
              >
                {evaluatedResult.title}
              </h4>
            </div>

            <p className="text-xs text-slate-300">{evaluatedResult.summary}</p>

            {/* Impact Highlights */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Impact Analysis:</span>
              <ul className="space-y-1 text-xs text-slate-300">
                {evaluatedResult.impacts.map((imp: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
