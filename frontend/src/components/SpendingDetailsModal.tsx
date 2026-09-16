import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '../types';
import { formatCurrency } from './SummaryCards';
import { usePrivacyMode } from '../utils/privacyStore';
import {
  X,
  Search,
  CreditCard,
  Landmark,
  Wallet,
  Smartphone,
  ArrowRightLeft,
  Home,
  Utensils,
  ShoppingBag,
  Car,
  Tag,
  Film,
  Heart,
  GraduationCap,
  Bolt,
  Receipt,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Scissors,
  Sparkles,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  amount: number;
  percentage: number;
}

interface SpendingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'category' | 'paymentMethod' | null;
  selectedCategory?: CategoryItem | null;
  selectedPaymentMethod?: string | null;
  transactions: Transaction[];
  periodLabel?: string;
}

type SpendingTableSortKey = 'date' | 'description' | 'type' | 'category' | 'account' | 'amount';
type TableSortDirection = 'asc' | 'desc';

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  BANK_TRANSFER: { label: 'Bank Account', icon: <Landmark className="w-5 h-5 text-blue-400" />, color: '#3b82f6' },
  CREDIT_CARD: { label: 'Credit Card', icon: <CreditCard className="w-5 h-5 text-purple-400" />, color: '#8b5cf6' },
  CASH: { label: 'Cash', icon: <Wallet className="w-5 h-5 text-emerald-400" />, color: '#10b981' },
  UPI: { label: 'UPI Wallet', icon: <Smartphone className="w-5 h-5 text-amber-400" />, color: '#f59e0b' },
};

export const SpendingDetailsModal: React.FC<SpendingDetailsModalProps> = ({
  isOpen,
  onClose,
  type,
  selectedCategory,
  selectedPaymentMethod,
  transactions,
  periodLabel,
}) => {
  usePrivacyMode();
  const activeType = type ?? 'category';
  const [searchTerm, setSearchTerm] = useState('');
  const [tableSortKey, setTableSortKey] = useState<SpendingTableSortKey>('date');
  const [tableSortDirection, setTableSortDirection] = useState<TableSortDirection>('desc');

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Render Category Icon helper
  const getCategoryIcon = (name: string, color?: string) => {
    const iconClass = "w-5 h-5";
    const lower = name.toLowerCase();

    if (lower.includes('rent') || lower.includes('housing')) return <Home className={iconClass} style={{ color: color || '#3b82f6' }} />;
    if (lower.includes('transfer')) return <ArrowRightLeft className={iconClass} style={{ color: color || '#95a5a6' }} />;
    if (lower.includes('food') || lower.includes('dining')) return <Utensils className={iconClass} style={{ color: color || '#ff5733' }} />;
    if (lower.includes('grocer') || lower.includes('shopping')) return <ShoppingBag className={iconClass} style={{ color: color || '#33fff5' }} />;
    if (lower.includes('transport') || lower.includes('car') || lower.includes('train') || lower.includes('rail') || lower.includes('flight') || lower.includes('air')) return <Car className={iconClass} style={{ color: color || '#ff33f5' }} />;
    if (lower.includes('utility') || lower.includes('bolt')) return <Bolt className={iconClass} style={{ color: color || '#f3ff33' }} />;
    if (lower.includes('entertain') || lower.includes('film')) return <Film className={iconClass} style={{ color: color || '#a533ff' }} />;
    if (lower.includes('health') || lower.includes('medical')) return <Heart className={iconClass} style={{ color: color || '#ff3333' }} />;
    if (lower.includes('education') || lower.includes('loan')) return <GraduationCap className={iconClass} style={{ color: color || '#8e44ad' }} />;
    if (lower.includes('groom') || lower.includes('shav') || lower.includes('hair') || lower.includes('salon')) return <Scissors className={iconClass} style={{ color: color || '#ec4899' }} />;

    return <Tag className={iconClass} style={{ color: color || '#64748b' }} />;
  };

  // Filter relevant transactions
  const matchingTransactions = transactions.filter((tx) => {
    if (activeType === 'category' && selectedCategory) {
      const catNameMatch = tx.category?.name.toLowerCase() === selectedCategory.name.toLowerCase();
      const catIdMatch = tx.categoryId === selectedCategory.id;
      const transferMatch = selectedCategory.name.toLowerCase().includes('transfer') && tx.type === 'TRANSFER';
      return catIdMatch || catNameMatch || transferMatch;
    }

    if (activeType === 'paymentMethod' && selectedPaymentMethod) {
      return tx.paymentMethod === selectedPaymentMethod;
    }

    return false;
  });

  // Filter matching transactions by search input
  const filteredTransactions = matchingTransactions.filter((tx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const desc = (tx.description || '').toLowerCase();
    const merchant = (tx.merchant || '').toLowerCase();
    const cat = (tx.category?.name || '').toLowerCase();
    const srcAcc = (tx.sourceAccount?.name || '').toLowerCase();
    const dstAcc = (tx.destinationAccount?.name || '').toLowerCase();
    const refNum = (tx.referenceNumber || '').toLowerCase();

    return desc.includes(term) || merchant.includes(term) || cat.includes(term) || srcAcc.includes(term) || dstAcc.includes(term) || refNum.includes(term);
  });

  const sortedFilteredTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      const labelA = (a.merchant || a.description || '').toLowerCase();
      const labelB = (b.merchant || b.description || '').toLowerCase();
      const categoryA = (a.category?.name || '').toLowerCase();
      const categoryB = (b.category?.name || '').toLowerCase();
      const accountA = `${a.sourceAccount?.name || ''} ${a.destinationAccount?.name || ''}`.toLowerCase();
      const accountB = `${b.sourceAccount?.name || ''} ${b.destinationAccount?.name || ''}`.toLowerCase();

      let compareValue = 0;
      if (tableSortKey === 'amount') {
        compareValue = a.amount - b.amount;
      } else if (tableSortKey === 'date') {
        compareValue = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      } else if (tableSortKey === 'description') {
        compareValue = labelA.localeCompare(labelB);
      } else if (tableSortKey === 'type') {
        compareValue = a.type.localeCompare(b.type);
      } else if (tableSortKey === 'category') {
        compareValue = categoryA.localeCompare(categoryB);
      } else {
        compareValue = accountA.localeCompare(accountB);
      }

      return tableSortDirection === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  }, [filteredTransactions, tableSortDirection, tableSortKey]);

  const toggleTableSort = (nextKey: SpendingTableSortKey) => {
    if (tableSortKey === nextKey) {
      setTableSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setTableSortKey(nextKey);
    setTableSortDirection(nextKey === 'date' || nextKey === 'amount' ? 'desc' : 'asc');
  };

  const tableSortIndicator = (key: SpendingTableSortKey) => {
    if (tableSortKey !== key) {
      return '↕';
    }
    return tableSortDirection === 'asc' ? '↑' : '↓';
  };

  const tableIncomeTotal = sortedFilteredTransactions.reduce(
    (sum, tx) => (tx.type === 'INCOME' ? sum + tx.amount : sum),
    0
  );
  const tableExpenseTotal = sortedFilteredTransactions.reduce(
    (sum, tx) => (tx.type === 'EXPENSE' ? sum + tx.amount : sum),
    0
  );
  const tableTransferTotal = sortedFilteredTransactions.reduce(
    (sum, tx) => (tx.type === 'TRANSFER' ? sum + tx.amount : sum),
    0
  );
  const filteredTableTotal = sortedFilteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate Summary Statistics
  const totalAmount = matchingTransactions.reduce((acc, tx) => acc + tx.amount, 0);
  const txCount = matchingTransactions.length;
  const avgAmount = txCount > 0 ? totalAmount / txCount : 0;
  const maxTx = matchingTransactions.reduce((max, tx) => (tx.amount > max ? tx.amount : max), 0);

  // Sub-breakdowns
  let breakdownTitle = '';
  let breakdownItems: Array<{ label: string; amount: number; percentage: number; color?: string; icon?: React.ReactNode }> = [];
  let subcategoryItems: Array<{ label: string; amount: number; percentage: number; color?: string; icon?: React.ReactNode }> = [];

  if (activeType === 'category') {
    breakdownTitle = 'Breakdown by Payment Method';
    const methodMap: Record<string, number> = {};
    const subMap: Record<string, number> = {};

    matchingTransactions.forEach((tx) => {
      const pm = tx.paymentMethod || 'BANK_TRANSFER';
      methodMap[pm] = (methodMap[pm] || 0) + tx.amount;

      const subName = tx.subcategory
        ? tx.subcategory.name.replace(/^.*?>\s*/, '')
        : tx.itemTag || (tx.description && tx.description !== tx.category?.name ? tx.description : null);
      if (subName) {
        subMap[subName] = (subMap[subName] || 0) + tx.amount;
      }
    });

    breakdownItems = Object.entries(methodMap).map(([pm, amt]) => {
      const pmConf = PAYMENT_METHOD_CONFIG[pm] || { label: pm, color: '#94a3b8', icon: <Receipt className="w-4 h-4" /> };
      return {
        label: pmConf.label,
        amount: amt,
        percentage: totalAmount > 0 ? Math.round((amt / totalAmount) * 100) : 0,
        color: pmConf.color,
        icon: pmConf.icon,
      };
    }).sort((a, b) => b.amount - a.amount);

    const SUB_COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#fbbf24'];
    subcategoryItems = Object.entries(subMap).map(([label, amt], idx) => ({
      label,
      amount: amt,
      percentage: totalAmount > 0 ? Math.round((amt / totalAmount) * 100) : 0,
      color: SUB_COLORS[idx % SUB_COLORS.length],
      icon: <Tag className="w-3.5 h-3.5 text-cyan-400" />,
    })).sort((a, b) => b.amount - a.amount);
  } else if (activeType === 'paymentMethod' && selectedPaymentMethod) {
    breakdownTitle = 'Breakdown by Category';
    const catMap: Record<string, { name: string; amount: number; color?: string }> = {};
    matchingTransactions.forEach((tx) => {
      const cName = tx.category?.name || (tx.type === 'TRANSFER' ? 'Transfer' : 'Uncategorized');
      const cColor = tx.category?.color || '#94a3b8';
      if (!catMap[cName]) {
        catMap[cName] = { name: cName, amount: 0, color: cColor };
      }
      catMap[cName].amount += tx.amount;
    });

    breakdownItems = Object.values(catMap).map((cat) => ({
      label: cat.name,
      amount: cat.amount,
      percentage: totalAmount > 0 ? Math.round((cat.amount / totalAmount) * 100) : 0,
      color: cat.color,
      icon: getCategoryIcon(cat.name, cat.color),
    })).sort((a, b) => b.amount - a.amount);
  }

  // Determine Title & Subtitle details
  let modalTitle = '';
  let modalBadge = '';
  let mainIcon: React.ReactNode = <Receipt className="w-6 h-6 text-blue-400" />;

  const periodContext = periodLabel ? ` • ${periodLabel}` : '';

  if (activeType === 'category' && selectedCategory) {
    modalTitle = `${selectedCategory.name} Details`;
    modalBadge = `Category • ${selectedCategory.percentage}% of expenses${periodContext}`;
    mainIcon = getCategoryIcon(selectedCategory.name, selectedCategory.color);
  } else if (activeType === 'paymentMethod' && selectedPaymentMethod) {
    const pmConf = PAYMENT_METHOD_CONFIG[selectedPaymentMethod];
    modalTitle = `${pmConf?.label || selectedPaymentMethod} Details`;
    modalBadge = `Payment Method • ${selectedCategory?.percentage || ''}% of transactions${periodContext}`;
    mainIcon = pmConf?.icon || <Landmark className="w-6 h-6 text-blue-400" />;
  }

  if (!isOpen || !type) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center shadow-inner">
              {mainIcon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {modalTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{modalBadge}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* 1. Key Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Volume</span>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium font-medium">Total Transactions</span>
              <p className="text-lg font-bold text-slate-200 mt-1">{txCount} txns</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Average Size</span>
              <p className="text-lg font-bold text-slate-200 mt-1">{formatCurrency(avgAmount)}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Highest Single Tx</span>
              <p className="text-lg font-bold text-slate-200 mt-1">{formatCurrency(maxTx)}</p>
            </div>
          </div>

          {/* 1.5 Subcategory / Specific Item Breakdown Section */}
          {subcategoryItems.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                Item & Subcategory Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subcategoryItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="text-slate-200 font-medium truncate max-w-[130px]">{item.label}</span>
                      </div>
                      <span className="text-slate-400 font-semibold">{item.percentage}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mr-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white whitespace-nowrap">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Secondary Breakdown Section */}
          {breakdownItems.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                {breakdownTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {breakdownItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {item.icon || <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || '#3b82f6' }} />}
                        <span className="text-slate-200 font-medium truncate max-w-[120px]">{item.label}</span>
                      </div>
                      <span className="text-slate-400 font-semibold">{item.percentage}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mr-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color || '#3b82f6' }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white whitespace-nowrap">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Transaction List Header & Search */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Matching Transactions ({filteredTransactions.length})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/30 border border-slate-700/40 rounded-2xl text-slate-400 text-xs">
                No matching transactions found for this view.
              </div>
            ) : (
              <div className="border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 border-b border-slate-700/80 text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">
                          <button type="button" onClick={() => toggleTableSort('date')} className="flex items-center gap-1 hover:text-cyan-300">
                            Date <span className="text-[10px]">{tableSortIndicator('date')}</span>
                          </button>
                        </th>
                        <th className="py-3 px-4">
                          <button type="button" onClick={() => toggleTableSort('description')} className="flex items-center gap-1 hover:text-cyan-300">
                            Description / Merchant <span className="text-[10px]">{tableSortIndicator('description')}</span>
                          </button>
                        </th>
                        <th className="py-3 px-4">
                          <button type="button" onClick={() => toggleTableSort('type')} className="flex items-center gap-1 hover:text-cyan-300">
                            Type <span className="text-[10px]">{tableSortIndicator('type')}</span>
                          </button>
                        </th>
                        <th className="py-3 px-4">
                          <button type="button" onClick={() => toggleTableSort('category')} className="flex items-center gap-1 hover:text-cyan-300">
                            Category <span className="text-[10px]">{tableSortIndicator('category')}</span>
                          </button>
                        </th>
                        <th className="py-3 px-4">
                          <button type="button" onClick={() => toggleTableSort('account')} className="flex items-center gap-1 hover:text-cyan-300">
                            Account / Channel <span className="text-[10px]">{tableSortIndicator('account')}</span>
                          </button>
                        </th>
                        <th className="py-3 px-4 text-right">
                          <button type="button" onClick={() => toggleTableSort('amount')} className="ml-auto flex items-center gap-1 hover:text-cyan-300">
                            Amount <span className="text-[10px]">{tableSortIndicator('amount')}</span>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sortedFilteredTransactions.map((tx) => {
                        const pmConfig = PAYMENT_METHOD_CONFIG[tx.paymentMethod] || { label: tx.paymentMethod, icon: null };
                        const isTransfer = tx.type === 'TRANSFER';
                        const isIncome = tx.type === 'INCOME';

                        return (
                          <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                            {/* Date */}
                            <td className="py-3.5 px-4 text-slate-300 font-medium whitespace-nowrap">
                              {new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>

                            {/* Description / Merchant */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-white">
                                {tx.merchant || tx.description || (isTransfer ? 'Account Transfer' : 'Expense')}
                              </div>
                              {tx.description && tx.merchant && (
                                <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.description}</div>
                              )}
                              {tx.referenceNumber && (
                                <div className="text-[10px] text-slate-500">Ref: {tx.referenceNumber}</div>
                              )}
                            </td>

                            {/* Type */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isIncome
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : isTransfer
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {isIncome && <ArrowDownRight className="w-3 h-3" />}
                                {isTransfer && <ArrowRightLeft className="w-3 h-3" />}
                                {!isIncome && !isTransfer && <ArrowUpRight className="w-3 h-3" />}
                                {tx.type}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                {getCategoryIcon(tx.category?.name || 'Category', tx.category?.color)}
                                <span>{tx.category?.name || (isTransfer ? 'Transfer' : 'Uncategorized')}</span>
                              </div>
                            </td>

                            {/* Account / Channel */}
                            <td className="py-3.5 px-4">
                              {isTransfer ? (
                                <div className="text-slate-300 text-[11px]">
                                  <span className="font-medium">{tx.sourceAccount?.name || 'Source'}</span>
                                  <span className="mx-1 text-slate-500">→</span>
                                  <span className="font-medium text-indigo-300">{tx.destinationAccount?.name || 'Destination'}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-300">
                                  {pmConfig.icon}
                                  <span>{tx.sourceAccount?.name || pmConfig.label}</span>
                                </div>
                              )}
                            </td>

                            {/* Amount */}
                            <td
                              className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                                isIncome
                                  ? 'text-emerald-400'
                                  : isTransfer
                                  ? 'text-indigo-400'
                                  : 'text-white'
                              }`}
                            >
                              {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/70 bg-slate-900/80 px-4 py-2.5 text-[11px] text-slate-400">
                  <span>Rows: {sortedFilteredTransactions.length}</span>
                  <span className="text-emerald-300">Income: +{formatCurrency(tableIncomeTotal)}</span>
                  <span className="text-rose-300">Expense: -{formatCurrency(tableExpenseTotal)}</span>
                  <span className="text-indigo-300">Transfer: {formatCurrency(tableTransferTotal)}</span>
                  <span className="font-semibold text-slate-200">Total: {formatCurrency(filteredTableTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Showing detailed transaction ledger for selection</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
