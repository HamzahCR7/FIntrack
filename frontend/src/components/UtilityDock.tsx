import React, { useRef, useState } from 'react';
import {
  Calculator,
  PieChart,
  Eye,
  EyeOff,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  X,
  Delete,
  Equal,
  AlertCircle,
  BarChart3,
  Layers,
  FileJson,
  Download,
  CalendarDays,
  Check,
  ListTodo,
  StickyNote,
  Trash2,
  Pencil,
} from 'lucide-react';
import { usePrivacyMode, formatCurrency } from '../utils/privacyStore';
import { useToast } from '../utils/toastStore';
import { StealthPasswordModal } from './StealthPasswordModal';
import { ClearableSelect } from './ClearableSelect';
import { Category, DashboardData } from '../types';
import { exportPowerBIDataset } from '../utils/exportUtils';
import { api } from '../api/client';
import { QuickItem, QuickItemPriority, QuickItemType } from '../types';

interface UtilityDockProps {
  dashboardData?: DashboardData | null;
  categories?: Category[];
  onExportPowerBI?: () => void;
}

export const UtilityDock: React.FC<UtilityDockProps> = ({ dashboardData, categories = [], onExportPowerBI }) => {
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'SMART_SPLIT' | 'DAILY_GAUGE' | 'RUNWAY' | 'POWER_BI' | 'NOTES'>('CALCULATOR');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
  const [quickItemType, setQuickItemType] = useState<QuickItemType>('NOTE');
  const [quickItemTitle, setQuickItemTitle] = useState('');
  const [quickItemDetails, setQuickItemDetails] = useState('');
  const [quickItemPrice, setQuickItemPrice] = useState('');
  const [quickItemCategory, setQuickItemCategory] = useState('');
  const [quickItemPriority, setQuickItemPriority] = useState<QuickItemPriority>('NORMAL');
  const [quickItemDueDate, setQuickItemDueDate] = useState('');
  const [editingQuickItemId, setEditingQuickItemId] = useState<string | null>(null);
  const [isQuickItemsLoading, setIsQuickItemsLoading] = useState(false);
  const [splitAmount, setSplitAmount] = useState('0');
  const [needsPercent, setNeedsPercent] = useState('50');
  const [wantsPercent, setWantsPercent] = useState('30');
  const [savingsPercent, setSavingsPercent] = useState('20');

  const { isPrivacyMode, enablePrivacyMode, disablePrivacyMode } = usePrivacyMode();
  const { addToast } = useToast();

  const loadQuickItems = async () => {
    try {
      setIsQuickItemsLoading(true);
      setQuickItems(await api.getQuickItems());
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Could not load quick notes', 'error');
    } finally {
      setIsQuickItemsLoading(false);
    }
  };

  const handleQuickItemsTab = () => {
    setActiveTab('NOTES');
    if (quickItems.length === 0 && !isQuickItemsLoading) void loadQuickItems();
  };

  const handleCreateQuickItem = async () => {
    if (!quickItemTitle.trim()) return;
    try {
      const item = await api.createQuickItem({
        type: quickItemType,
        title: quickItemTitle.trim(),
        details: quickItemDetails.trim() || undefined,
        price: quickItemPrice ? Number(quickItemPrice) : undefined,
        category: quickItemCategory.trim() || undefined,
        priority: quickItemPriority,
        dueDate: quickItemDueDate ? new Date(`${quickItemDueDate}T12:00:00`).toISOString() : undefined,
      });
      setQuickItems((current) => [item, ...current]);
      setQuickItemTitle('');
      setQuickItemDetails('');
      setQuickItemPrice('');
      setQuickItemCategory('');
      setQuickItemPriority('NORMAL');
      setQuickItemDueDate('');
      addToast(`${quickItemType === 'NOTE' ? 'Note' : quickItemType === 'TODO' ? 'Todo' : 'Reminder'} saved`, 'success');
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Could not save quick item', 'error');
    }
  };

  const handleStartEditingQuickItem = (item: QuickItem) => {
    setEditingQuickItemId(item.id);
    setQuickItemType(item.type);
    setQuickItemTitle(item.title);
    setQuickItemDetails(item.details || '');
    setQuickItemPrice(item.price != null ? String(item.price) : '');
    setQuickItemCategory(item.category || '');
    setQuickItemPriority(item.priority || 'NORMAL');
    setQuickItemDueDate(item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '');
  };

  const handleCancelEditingQuickItem = () => {
    setEditingQuickItemId(null);
    setQuickItemTitle('');
    setQuickItemDetails('');
    setQuickItemPrice('');
    setQuickItemCategory('');
    setQuickItemPriority('NORMAL');
    setQuickItemDueDate('');
  };

  const handleSaveQuickItem = async () => {
    if (!editingQuickItemId || !quickItemTitle.trim()) return;
    try {
      const updated = await api.updateQuickItem(editingQuickItemId, {
        type: quickItemType,
        title: quickItemTitle.trim(),
        details: quickItemDetails.trim() || null,
        price: quickItemPrice ? Number(quickItemPrice) : null,
        category: quickItemCategory.trim() || null,
        priority: quickItemPriority,
        dueDate: quickItemDueDate ? new Date(`${quickItemDueDate}T12:00:00`).toISOString() : null,
      });
      setQuickItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      handleCancelEditingQuickItem();
      addToast('Quick item updated', 'success');
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Could not update quick item', 'error');
    }
  };

  const handleToggleQuickItem = async (item: QuickItem) => {
    try {
      const updated = await api.updateQuickItem(item.id, { isCompleted: !item.isCompleted });
      setQuickItems((current) => current.map((currentItem) => (currentItem.id === updated.id ? updated : currentItem)));
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Could not update quick item', 'error');
    }
  };

  const handleDeleteQuickItem = async (id: string) => {
    try {
      await api.deleteQuickItem(id);
      setQuickItems((current) => current.filter((item) => item.id !== id));
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Could not delete quick item', 'error');
    }
  };

  const handlePrivacyButtonClick = () => {
    if (isPrivacyMode) {
      setIsPasswordModalOpen(true);
    } else {
      enablePrivacyMode();
      addToast('Stealth Mode activated. Balances are hidden.', 'info');
    }
  };

  const handleUnlockSuccess = () => {
    disablePrivacyMode();
    setIsPasswordModalOpen(false);
    addToast('Stealth Mode disabled. Balances revealed.', 'info');
  };

  // --- 1. CALCULATOR STATE ---
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);

  const handleDigit = (digit: string) => {
    if (isNewNumber) {
      setDisplay(digit === '.' ? '0.' : digit);
      setIsNewNumber(false);
    } else {
      if (digit === '.' && display.includes('.')) return;
      if (display === '0' && digit !== '.') {
        setDisplay(digit);
      } else {
        setDisplay((prev) => prev + digit);
      }
    }
  };

  const handleOperator = (op: string) => {
    if (equation === '' && display === '0') return; // Prevent operator as first input
    setEquation(`${display} ${op} `);
    setIsNewNumber(true);
  };

  const handleCalculate = () => {
    if (!equation) return;
    const fullExpr = equation + display;
    try {
      const sanitized = fullExpr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      const formattedResult = Number(result.toFixed(6)).toString();
      setDisplay(formattedResult);
      setEquation('');
      setIsNewNumber(true);
    } catch {
      setDisplay('Error');
      setEquation('');
      setIsNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsNewNumber(true);
  };

  const handleBackspace = () => {
    if (isNewNumber) return;
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
      setIsNewNumber(true);
    } else {
      setDisplay((prev) => prev.slice(0, -1));
    }
  };

  const handlePercentage = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay((val / 100).toString());
      setIsNewNumber(true);
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const sanitized = clipboardText.replace(/[^\d.+\-×÷()]/g, '').trim();
      if (sanitized) {
        // Append to current display instead of replacing
        if (display === '0') {
          setDisplay(sanitized);
        } else {
          setDisplay((prev) => prev + sanitized);
        }
        setIsNewNumber(false);
      }
    } catch (err) {
      console.error('Paste failed:', err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(display);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || activeTab !== 'CALCULATOR') return;

      const target = e.target as HTMLElement | null;
      const isInsideUtilityDock = target ? Boolean(dockRef.current?.contains(target)) : false;
      if (!isInsideUtilityDock) return;

      const isEditableField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isEditableField) return;

      // Copy: Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Paste: Ctrl+V or Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Number keys: 0-9
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
        return;
      }

      // Decimal point
      if (e.key === '.') {
        e.preventDefault();
        handleDigit('.');
        return;
      }

      // Operators
      if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
        return;
      }
      if (e.key === '-') {
        e.preventDefault();
        handleOperator('−');
        return;
      }
      if (e.key === '*') {
        e.preventDefault();
        handleOperator('×');
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
        return;
      }

      // Equals: Enter or =
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalculate();
        return;
      }

      // Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }

      // Clear: C key or Delete
      if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, equation, isNewNumber, activeTab, isOpen]);

  // --- 2. DAILY SAFE SPEND GAUGE METRICS ---
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

  const spendingThisMonth = dashboardData?.summary?.spendingThisMonth || 0;
  const incomeThisMonth = dashboardData?.summary?.incomeThisMonth || 0;
  const defaultTarget = incomeThisMonth > 0 ? incomeThisMonth : 65000;
  const [customMonthlyBudget, setCustomMonthlyBudget] = useState<string>(defaultTarget.toString());

  const targetBudget = parseFloat(customMonthlyBudget) || defaultTarget;
  const remainingBudget = Math.max(0, targetBudget - spendingThisMonth);
  const dailySafeSpend = Math.round(remainingBudget / daysRemaining);

  const budgetUtilPercent = targetBudget > 0 ? Math.min(100, Math.round((spendingThisMonth / targetBudget) * 100)) : 0;

  const splitBaseAmount = Math.max(0, parseFloat(splitAmount) || 0);
  const needsPctValue = Math.max(0, parseFloat(needsPercent) || 0);
  const wantsPctValue = Math.max(0, parseFloat(wantsPercent) || 0);
  const savingsPctValue = Math.max(0, parseFloat(savingsPercent) || 0);
  const splitTotalPercent = needsPctValue + wantsPctValue + savingsPctValue;
  const splitTotalDiff = Math.abs(splitTotalPercent - 100);
  const splitIsBalanced = splitTotalDiff < 0.001;
  const needsSplitAmount = splitBaseAmount * (needsPctValue / 100);
  const wantsSplitAmount = splitBaseAmount * (wantsPctValue / 100);
  const savingsSplitAmount = splitBaseAmount * (savingsPctValue / 100);

  const hasStrongSavings = savingsPctValue >= 25;
  const hasHighWants = wantsPctValue > 35;
  const hasHeavyNeeds = needsPctValue > 65;

  let splitInsightContainerClass = 'rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-[10px] text-cyan-100 space-y-1.5';
  let splitInsightHeadingClass = 'flex items-center gap-1.5 font-semibold text-cyan-200';
  let splitInsightLine1 = 'Splitting before spending helps you protect essentials and savings first, then spend the rest with confidence.';
  let splitInsightLine2 = 'Your current mix looks practical for a normal month. Keep reviewing this when income or fixed costs change.';
  let splitInsightLine3 = 'Tip: use quick presets for speed, then fine-tune percentages for this month.';

  if (!splitIsBalanced) {
    splitInsightContainerClass = 'rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] text-amber-100 space-y-1.5';
    splitInsightHeadingClass = 'flex items-center gap-1.5 font-semibold text-amber-200';
    splitInsightLine1 = `Your split is ${splitTotalPercent.toFixed(1)}%. For a complete plan, percentages should total 100%.`;
    splitInsightLine2 = 'Above 100% means over-allocation. Below 100% means part of your money is still unplanned.';
    splitInsightLine3 = 'Adjust any one bucket to close the gap and make this split actionable.';
  } else if (hasStrongSavings && !hasHighWants) {
    splitInsightContainerClass = 'rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[10px] text-emerald-100 space-y-1.5';
    splitInsightHeadingClass = 'flex items-center gap-1.5 font-semibold text-emerald-200';
    splitInsightLine1 = 'This is a strong allocation for long-term stability.';
    splitInsightLine2 = `Savings at ${savingsPctValue.toFixed(1)}% gives better cushion for goals and emergencies.`;
    splitInsightLine3 = 'Keep Wants disciplined and direct any surplus to savings or debt reduction.';
  } else if (hasHighWants) {
    splitInsightContainerClass = 'rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[10px] text-rose-100 space-y-1.5';
    splitInsightHeadingClass = 'flex items-center gap-1.5 font-semibold text-rose-200';
    splitInsightLine1 = `Wants are currently ${wantsPctValue.toFixed(1)}%, which may increase month-end pressure.`;
    splitInsightLine2 = 'Consider shifting 5% to 10% from Wants into Savings to reduce stress later in the month.';
    splitInsightLine3 = 'A small rebalance now can prevent recovery cuts later.';
  } else if (hasHeavyNeeds) {
    splitInsightContainerClass = 'rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-[10px] text-indigo-100 space-y-1.5';
    splitInsightHeadingClass = 'flex items-center gap-1.5 font-semibold text-indigo-200';
    splitInsightLine1 = `Needs are ${needsPctValue.toFixed(1)}%, which suggests high fixed obligations.`;
    splitInsightLine2 = 'This is valid for rent-heavy months, but track it so Wants and Savings do not get squeezed continuously.';
    splitInsightLine3 = 'If possible, trim one fixed cost and route the gain directly into Savings.';
  }

  // --- 3. EMERGENCY RUNWAY & FINANCIAL HEALTH CHECK METRICS ---
  const liquidCash = dashboardData
    ? (dashboardData.accounts.bankBalances || 0) +
      (dashboardData.accounts.cashBalances || 0) +
      (dashboardData.accounts.upiBalances || 0)
    : 0;

  const avgMonthlyExpense = spendingThisMonth > 0 ? spendingThisMonth : (dashboardData?.summary?.totalExpenses || 25000);
  const runwayMonths = avgMonthlyExpense > 0 ? Number((liquidCash / avgMonthlyExpense).toFixed(1)) : 0;

  let healthVerdict = { label: 'Optimal Buffer', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: ShieldCheck };
  if (runwayMonths < 3) {
    healthVerdict = { label: 'Vulnerable', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: ShieldAlert };
  } else if (runwayMonths < 6) {
    healthVerdict = { label: 'Moderate Buffer', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertCircle };
  }

  return (
    <div ref={dockRef} className="fixed bottom-32 right-3 z-[60] flex flex-col items-end gap-2 sm:bottom-auto sm:right-4 sm:top-20 sm:z-40">
      {/* Utility Launcher Bar Buttons */}
      <div className="flex flex-row items-stretch gap-2 whitespace-nowrap bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-md sm:flex-col">
        {/* 1. Privacy Shield Quick Toggle */}
        <button
          onClick={handlePrivacyButtonClick}
          className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-sm font-semibold ${
            isPrivacyMode
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 border border-rose-400'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={isPrivacyMode ? 'Stealth Mode Active (Click to unlock values with password)' : 'Click to hide/mask all balance numbers'}
        >
          {isPrivacyMode ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-blue-400" />}
          <span>{isPrivacyMode ? 'Stealth ON' : 'Stealth'}</span>
        </button>

        <div className="h-full w-px bg-slate-700 sm:h-px sm:w-full" />

        {/* 2. Dock Launcher Toggle Button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-sm font-semibold ${
            isOpen
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={isOpen ? 'Close Utility Drawer' : 'Open Utilities (Calculator, Daily Gauge, Runway)'}
        >
          <Calculator className="w-4 h-4 text-indigo-400" />
          <span>Utilities</span>
        </button>
      </div>

      {/* Utility Window Drawer */}
      {isOpen && (
        <div className="w-[calc(100vw-1.5rem)] max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-3 duration-200 sm:w-80">
          {/* Header & Tabs */}
          <div className="bg-slate-800/90 px-3 py-2.5 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setActiveTab('CALCULATOR')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  activeTab === 'CALCULATOR'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title="Calculator"
              >
                Calc
              </button>
              <button
                onClick={() => setActiveTab('DAILY_GAUGE')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  activeTab === 'DAILY_GAUGE'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title="Daily Spend Gauge"
              >
                Gauge
              </button>
              <button
                onClick={() => setActiveTab('SMART_SPLIT')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  activeTab === 'SMART_SPLIT'
                    ? 'bg-cyan-600 text-white'
                    : 'text-cyan-400/80 hover:text-cyan-300 hover:bg-slate-700/50'
                }`}
                title="Smart Split Calculator"
              >
                Split
              </button>
              <button
                onClick={() => setActiveTab('RUNWAY')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  activeTab === 'RUNWAY'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title="Emergency Runway"
              >
                Runway
              </button>
              <button
                onClick={() => setActiveTab('POWER_BI')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  activeTab === 'POWER_BI'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-700/50'
                }`}
                title="Power BI Data Model & DAX"
              >
                Power BI
              </button>
              <button
                onClick={handleQuickItemsTab}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  activeTab === 'NOTES'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-slate-700/50'
                }`}
                title="Quick Notes, Todos & Reminders"
              >
                Notes
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/60 transition-colors shrink-0"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: MINI CALCULATOR */}
          {activeTab === 'CALCULATOR' && (
            <div>
              {/* Display */}
              <div className="p-4 bg-slate-950/70 text-right space-y-1 border-b border-slate-800">
                <div className="text-[11px] text-slate-400 h-4 font-mono overflow-hidden truncate">
                  {equation}
                </div>
                <div className="text-2xl font-bold font-mono text-white tracking-tight overflow-x-auto whitespace-nowrap custom-scrollbar">
                  {display}
                </div>
              </div>

              {/* Copy/Paste Toolbar */}
              <div className="flex gap-2 p-3 border-b border-slate-800 bg-slate-950/50">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 px-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors text-xs font-semibold"
                  title="Copy (Ctrl+C)"
                >
                  📋 Copy
                </button>
                <button
                  onClick={handlePaste}
                  className="flex-1 py-2 px-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg transition-colors text-xs font-semibold"
                  title="Paste (Ctrl+V)"
                >
                  📌 Paste
                </button>
              </div>

              {/* Keypad */}
              <div className="p-3 grid grid-cols-4 gap-2 text-xs font-semibold">
                <button
                  onClick={handleClear}
                  className="py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl transition-colors font-bold"
                >
                  C
                </button>
                <button
                  onClick={handlePercentage}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                >
                  %
                </button>
                <button
                  onClick={handleBackspace}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center justify-center"
                >
                  <Delete className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleOperator('÷')}
                  className="py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl transition-colors font-bold text-sm"
                >
                  ÷
                </button>

                <button
                  onClick={() => handleDigit('7')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  7
                </button>
                <button
                  onClick={() => handleDigit('8')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  8
                </button>
                <button
                  onClick={() => handleDigit('9')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  9
                </button>
                <button
                  onClick={() => handleOperator('×')}
                  className="py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl transition-colors font-bold text-sm"
                >
                  ×
                </button>

                <button
                  onClick={() => handleDigit('4')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  4
                </button>
                <button
                  onClick={() => handleDigit('5')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  5
                </button>
                <button
                  onClick={() => handleDigit('6')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  6
                </button>
                <button
                  onClick={() => handleOperator('−')}
                  className="py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl transition-colors font-bold text-sm"
                >
                  −
                </button>

                <button
                  onClick={() => handleDigit('1')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  1
                </button>
                <button
                  onClick={() => handleDigit('2')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  2
                </button>
                <button
                  onClick={() => handleDigit('3')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  3
                </button>
                <button
                  onClick={() => handleOperator('+')}
                  className="py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl transition-colors font-bold text-sm"
                >
                  +
                </button>

                <button
                  onClick={() => handleDigit('0')}
                  className="col-span-2 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  0
                </button>
                <button
                  onClick={() => handleDigit('.')}
                  className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition-colors font-bold"
                >
                  .
                </button>
                <button
                  onClick={handleCalculate}
                  className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors flex items-center justify-center font-bold shadow-md shadow-blue-600/30"
                >
                  <Equal className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB: SMART SPLIT CALCULATOR */}
          {activeTab === 'SMART_SPLIT' && (
            <div className="p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white">Smart Split Calculator</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${splitIsBalanced ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                  {splitIsBalanced ? 'Balanced' : `${splitTotalPercent.toFixed(1)}%`}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium block">Amount to Split (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={splitAmount}
                  onChange={(event) => setSplitAmount(event.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setNeedsPercent('50');
                    setWantsPercent('30');
                    setSavingsPercent('20');
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-300 hover:text-white"
                >
                  50/30/20
                </button>
                <button
                  onClick={() => {
                    setNeedsPercent('60');
                    setWantsPercent('20');
                    setSavingsPercent('20');
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-300 hover:text-white"
                >
                  60/20/20
                </button>
                <button
                  onClick={() => {
                    setNeedsPercent('40');
                    setWantsPercent('30');
                    setSavingsPercent('30');
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-300 hover:text-white"
                >
                  40/30/30
                </button>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <label className="text-slate-300 font-medium">Needs %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={needsPercent}
                    onChange={(event) => setNeedsPercent(event.target.value)}
                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white text-right focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <label className="text-slate-300 font-medium">Wants %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={wantsPercent}
                    onChange={(event) => setWantsPercent(event.target.value)}
                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white text-right focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <label className="text-slate-300 font-medium">Savings %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={savingsPercent}
                    onChange={(event) => setSavingsPercent(event.target.value)}
                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white text-right focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {!splitIsBalanced && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-200">
                  Split total is {splitTotalPercent.toFixed(1)}%. Adjust values to make it 100%.
                </p>
              )}

              <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Needs</span>
                  <span className="font-bold text-cyan-300">{formatCurrency(needsSplitAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Wants</span>
                  <span className="font-bold text-indigo-300">{formatCurrency(wantsSplitAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Savings</span>
                  <span className="font-bold text-emerald-300">{formatCurrency(savingsSplitAmount)}</span>
                </div>
                <div className="h-px w-full bg-slate-700" />
                <div className="flex justify-between text-slate-200">
                  <span>Total Allocated</span>
                  <span className="font-bold text-white">{formatCurrency(needsSplitAmount + wantsSplitAmount + savingsSplitAmount)}</span>
                </div>
              </div>

              <div className={splitInsightContainerClass}>
                <div className={splitInsightHeadingClass}>
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Why this insight?</span>
                </div>
                <p>{splitInsightLine1}</p>
                <p>{splitInsightLine2}</p>
                <p>{splitInsightLine3}</p>
              </div>
            </div>
          )}

          {/* TAB 2: DAILY SAFE SPEND GAUGE */}
          {activeTab === 'DAILY_GAUGE' && (
            <div className="p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">Daily Budget Velocity</span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-semibold">
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                </span>
              </div>

              {/* Safe Spend Result */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Safe To Spend Today
                </span>
                <p className="text-2xl font-black text-amber-400 tracking-tight">
                  {formatCurrency(dailySafeSpend)}
                </p>
                <p className="text-[10px] text-slate-500">
                  Based on {formatCurrency(remainingBudget)} budget remaining for this month
                </p>
              </div>

              {/* Budget Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Month Spend: {formatCurrency(spendingThisMonth)}</span>
                  <span>{budgetUtilPercent}% Used</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetUtilPercent > 90
                        ? 'bg-rose-500'
                        : budgetUtilPercent > 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${budgetUtilPercent}%` }}
                  />
                </div>
              </div>

              {/* Target Budget Setting */}
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <label className="text-[11px] text-slate-400 font-medium block">
                  Target Monthly Spend Cap (₹)
                </label>
                <input
                  type="number"
                  value={customMonthlyBudget}
                  onChange={(e) => setCustomMonthlyBudget(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: EMERGENCY RUNWAY & FINANCIAL HEALTH */}
          {activeTab === 'RUNWAY' && (
            <div className="p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <healthVerdict.icon className={`w-4 h-4 ${healthVerdict.color}`} />
                  <span className="font-bold text-white">Emergency Runway</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${healthVerdict.bg} ${healthVerdict.color}`}>
                  {healthVerdict.label}
                </span>
              </div>

              {/* Runway Score */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Emergency Financial Runway
                </span>
                <p className={`text-2xl font-black tracking-tight ${healthVerdict.color}`}>
                  {runwayMonths} Months
                </p>
                <p className="text-[10px] text-slate-500">
                  Your liquid cash can cover {runwayMonths} months of current expenses
                </p>
              </div>

              {/* Metrics Breakdown */}
              <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Liquid Cash Assets:</span>
                  <span className="font-bold text-white">{formatCurrency(liquidCash)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Avg Monthly Expense:</span>
                  <span className="font-bold text-rose-400">{formatCurrency(avgMonthlyExpense)}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 italic text-center">
                💡 Financial standard recommends keeping 3 to 6 months of expenses in liquid bank/cash reserves.
              </p>
            </div>
          )}

          {/* TAB 4: POWER BI ANALYTICS HUB */}
          {activeTab === 'POWER_BI' && (
            <div className="p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">Power BI Analytics Hub</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/20 bg-amber-500/10 text-amber-300">
                  v2.0 Star-Schema
                </span>
              </div>

              {/* Power BI Overview */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <Layers className="w-3.5 h-3.5" />
                    Data Model Architecture
                  </span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                  <li>Fact_Transactions (Ledger records)</li>
                  <li>Dim_Categories (Spending Breakdown)</li>
                  <li>Dim_MonthlyTrends (6-Month Aggregates)</li>
                </ul>
              </div>

              {/* Power BI Key DAX Measures */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-300 block">Embedded DAX Measures</span>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[10px] text-emerald-400 space-y-1 overflow-x-auto">
                  <p>Total Income = CALCULATE(SUM(...))</p>
                  <p>Total Expense = CALCULATE(SUM(...))</p>
                  <p>Savings Rate % = DIVIDE([Savings], [Income])</p>
                </div>
              </div>

              {/* Export Action */}
              <button
                onClick={() => {
                  if (onExportPowerBI) {
                    onExportPowerBI();
                  } else if (dashboardData) {
                    exportPowerBIDataset([], dashboardData);
                  }
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 text-xs transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Export Power BI Dataset (.json)</span>
              </button>
            </div>
          )}

          {/* TAB 5: QUICK NOTES, TODOS & REMINDERS */}
          {activeTab === 'NOTES' && (
            <div className="p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">Quick Notes & Tasks</span>
                </div>
                <span className="text-[10px] text-slate-500">Synced</span>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['NOTE', 'TODO', 'REMINDER'] as QuickItemType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setQuickItemType(type)}
                      className={`rounded-lg px-1.5 py-1.5 text-[10px] font-semibold transition-colors ${quickItemType === type ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      {type === 'NOTE' ? 'Note' : type === 'TODO' ? 'Todo' : 'Reminder'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={quickItemTitle}
                  onChange={(event) => setQuickItemTitle(event.target.value)}
                  placeholder={quickItemType === 'NOTE' ? 'Write a quick note...' : quickItemType === 'TODO' ? 'What needs doing?' : 'What should you remember?'}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  maxLength={200}
                />
                <textarea
                  value={quickItemDetails}
                  onChange={(event) => setQuickItemDetails(event.target.value)}
                  placeholder="Optional details"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  maxLength={1000}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quickItemPrice}
                    onChange={(event) => setQuickItemPrice(event.target.value)}
                    placeholder="Price (optional)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    aria-label="Optional price"
                  />
                  <ClearableSelect
                    value={quickItemCategory}
                    onValueChange={setQuickItemCategory}
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    aria-label="Optional category"
                  >
                    <option value="">No category</option>
                    {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </ClearableSelect>
                </div>
                <ClearableSelect
                  value={quickItemPriority}
                  onValueChange={(value) => setQuickItemPriority(value as QuickItemPriority)}
                  defaultValue="NORMAL"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                  aria-label="Priority"
                >
                  <option value="LOW">Low priority</option>
                  <option value="NORMAL">Normal priority</option>
                  <option value="HIGH">High priority</option>
                </ClearableSelect>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <CalendarDays className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="date"
                      value={quickItemDueDate}
                      onChange={(event) => setQuickItemDueDate(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 pl-7 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                      aria-label="Optional due date"
                    />
                  </div>
                  <button
                    onClick={() => void (editingQuickItemId ? handleSaveQuickItem() : handleCreateQuickItem())}
                    disabled={!quickItemTitle.trim()}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {editingQuickItemId ? 'Save' : 'Add'}
                  </button>
                  {editingQuickItemId && <button onClick={handleCancelEditingQuickItem} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-600">Cancel</button>}
                </div>
              </div>

              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
                {isQuickItemsLoading ? (
                  <p className="py-5 text-center text-[11px] text-slate-500">Loading your items...</p>
                ) : quickItems.length === 0 ? (
                  <p className="py-5 text-center text-[11px] text-slate-500">No notes or tasks yet.</p>
                ) : quickItems.map((item) => (
                  <div key={item.id} className={`group rounded-xl border border-slate-800 bg-slate-800/50 p-2.5 ${item.isCompleted ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => void handleToggleQuickItem(item)}
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-600 text-transparent hover:border-emerald-400'}`}
                        title={item.isCompleted ? 'Mark as open' : 'Mark as complete'}
                        aria-label={item.isCompleted ? 'Mark item as open' : 'Mark item as complete'}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleStartEditingQuickItem(item)}
                        className="rounded p-1 text-slate-600 opacity-0 transition-opacity hover:bg-blue-500/10 hover:text-blue-400 group-hover:opacity-100"
                        title="Edit this quick item"
                        aria-label="Edit this quick item"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'TODO' ? <ListTodo className="h-3 w-3 text-amber-400" /> : item.type === 'REMINDER' ? <CalendarDays className="h-3 w-3 text-blue-400" /> : <StickyNote className="h-3 w-3 text-emerald-400" />}
                          <p className={`truncate text-[11px] font-semibold text-slate-200 ${item.isCompleted ? 'line-through' : ''}`}>{item.title}</p>
                        </div>
                        {item.details && <p className="mt-1 whitespace-pre-wrap break-words text-[10px] text-slate-500">{item.details}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                          {item.price != null && <span className="font-semibold text-amber-300">{formatCurrency(item.price)}</span>}
                          {item.category && <span className="rounded bg-slate-700 px-1.5 py-0.5">{item.category}</span>}
                          {item.priority !== 'NORMAL' && <span className={item.priority === 'HIGH' ? 'rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-300' : 'rounded bg-slate-700 px-1.5 py-0.5'}>{item.priority}</span>}
                          {item.dueDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(item.dueDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <button onClick={() => void handleDeleteQuickItem(item.id)} className="rounded p-1 text-slate-600 opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100" title="Delete this quick item" aria-label="Delete this quick item">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stealth Mode Password Modal */}
      <StealthPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handleUnlockSuccess}
      />
    </div>
  );
};
