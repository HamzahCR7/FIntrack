import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Transaction, Category, Account } from '../types';
import { formatCurrency } from './SummaryCards';
import { DatePicker } from './DatePicker';
import { ClearableSelect } from './ClearableSelect';
import { usePrivacyMode } from '../utils/privacyStore';
import { useToast } from '../utils/toastStore';
import { ConfirmDialog } from './ConfirmDialog';
import { Search, Filter, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Calendar, Tag, CreditCard, X, Pencil, Trash2, Download, Printer, ChevronLeft, ChevronRight, ChevronDown, Check, Clock, Loader } from 'lucide-react';
import { exportTransactionsToCSV } from '../utils/exportUtils';

interface FancySelectOption {
  value: string;
  label: string;
}

interface FancySelectProps {
  value: string | string[];
  placeholder: string;
  options: FancySelectOption[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}

const FancySelect: React.FC<FancySelectProps> = ({ value, placeholder, options, onChange, multiple = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const selectedValues = Array.isArray(value) ? value : [];
  const hasSelection = multiple ? selectedValues.length > 0 : Boolean(value);
  const selectedOption = !Array.isArray(value)
    ? options.find((option) => option.value === value)
    : undefined;
  const selectedLabel = multiple
    ? selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
      ? options.find((option) => option.value === selectedValues[0])?.label || placeholder
      : `${selectedValues.length} selected`
    : selectedOption?.label || placeholder;

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: Event) => {
      const targetNode = event.target as Node;
      if (!selectRef.current?.contains(targetNode)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div ref={selectRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`fintrack-select flex items-center justify-between p-2.5 text-left text-xs w-full rounded-xl border bg-slate-900/80 border-slate-700/80 ${
          hasSelection ? 'text-slate-200' : 'text-slate-500'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate text-xs">{selectedLabel}</span>
        <div className="flex items-center gap-1.5">
          {hasSelection && (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={(event) => {
                event.stopPropagation();
                onChange(multiple ? [] : '');
              }}
              className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-700/70 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 shrink-0 text-cyan-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 max-h-48 overflow-y-auto rounded-xl border border-cyan-400/30 bg-slate-900/95 p-1.5 shadow-2xl shadow-slate-950/60 backdrop-blur-xl" role="listbox">
          {options.map((option) => {
            const isSelected = multiple
              ? option.value === ''
                ? selectedValues.length === 0
                : selectedValues.includes(option.value)
              : option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (!multiple) {
                    onChange(option.value);
                    setIsOpen(false);
                    return;
                  }

                  if (option.value === '') {
                    onChange([]);
                    return;
                  }

                  const nextValues = selectedValues.includes(option.value)
                    ? selectedValues.filter((selectedValue) => selectedValue !== option.value)
                    : [...selectedValues, option.value];
                  onChange(nextValues);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-cyan-400/15 text-cyan-100'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface TransactionsSectionProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  selectedMonth: Date;
  onSelectedMonthChange: (month: Date) => void;
  onFilterChange: (filters: any) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onExportPDF?: () => void;
}

type LedgerSortKey = 'transaction' | 'type' | 'category' | 'fromTo' | 'paymentMethod' | 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

export const TransactionsSection: React.FC<TransactionsSectionProps> = ({
  transactions,
  categories,
  accounts,
  selectedMonth,
  onSelectedMonthChange,
  onFilterChange,
  onEditTransaction,
  onDeleteTransaction,
  onExportPDF,
}) => {
  usePrivacyMode();
  const { addToast } = useToast();

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayIsoDate = formatDateForInput(new Date());
  const selectedMonthStartIsoDate = formatDateForInput(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1));
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(selectedMonthStartIsoDate);
  const [endDate, setEndDate] = useState<string>(todayIsoDate);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ isOpen: boolean; transactionId: string | null }>({
    isOpen: false,
    transactionId: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sortKey, setSortKey] = useState<LedgerSortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const categoryFilterOptions = Array.from(
    new Set(categories.map((category) => category.name.split('>')[0].trim()).filter(Boolean))
  ).map((categoryName) => ({ value: categoryName, label: categoryName }));

  const getSelectedMonthRange = (month: Date) => ({
    startDate: new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1)).toISOString(),
    endDate: new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)).toISOString(),
  });

  useEffect(() => {
    setStartDate(selectedMonthStartIsoDate);
    setEndDate(todayIsoDate);
    onFilterChange(getSelectedMonthRange(selectedMonth));
    setCurrentPage(1);
  }, [selectedMonth]);

  useEffect(() => {
    setLastUpdated(new Date());
  }, [transactions]);

  const handleApplyFilters = (newFilters: any) => {
    setCurrentPage(1);
    const monthRange = getSelectedMonthRange(selectedMonth);
    onFilterChange({
      ...monthRange,
      startDate: startDate || monthRange.startDate,
      endDate: endDate || monthRange.endDate,
      ...newFilters,
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedType([]);
    setSelectedCategory([]);
    setSelectedAccount([]);
    setSelectedPaymentMethod([]);
    setStartDate(selectedMonthStartIsoDate);
    setEndDate(todayIsoDate);
    setCurrentPage(1);
    const monthRange = getSelectedMonthRange(selectedMonth);
    onFilterChange({
      ...monthRange,
      startDate: selectedMonthStartIsoDate,
      endDate: todayIsoDate,
    });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!onDeleteTransaction) return;
    setIsDeleting(true);
    try {
      await onDeleteTransaction(id);
      addToast('Transaction deleted successfully', 'success');
      setDeleteConfirmDialog({ isOpen: false, transactionId: null });
    } catch (error: any) {
      addToast(error?.message || 'Failed to delete transaction', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const transactionDate = new Date(tx.transactionDate);
    const isInSelectedMonth =
      transactionDate.getFullYear() === selectedMonth.getFullYear() &&
      transactionDate.getMonth() === selectedMonth.getMonth();

    if (!isInSelectedMonth) return false;

    if (selectedType.length > 0 && !selectedType.includes(tx.type)) {
      return false;
    }

    if (selectedCategory.length > 0) {
      const parentCategoryName = tx.category?.name?.split('>')[0]?.trim() || '';
      if (!selectedCategory.includes(parentCategoryName)) {
        return false;
      }
    }

    if (selectedAccount.length > 0) {
      const sourceAccountId = tx.sourceAccountId || '';
      const destinationAccountId = tx.destinationAccountId || '';
      const matchesSourceAccount = selectedAccount.includes(sourceAccountId);
      const matchesDestinationAccount = selectedAccount.includes(destinationAccountId);
      if (!matchesSourceAccount && !matchesDestinationAccount) {
        return false;
      }
    }

    if (selectedPaymentMethod.length > 0 && !selectedPaymentMethod.includes(tx.paymentMethod)) {
      return false;
    }

    if (startDate) {
      const startBoundary = new Date(`${startDate}T00:00:00`);
      if (transactionDate < startBoundary) {
        return false;
      }
    }

    if (endDate) {
      const endBoundary = new Date(`${endDate}T23:59:59.999`);
      if (transactionDate > endBoundary) {
        return false;
      }
    }

    if (search) {
      const query = search.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(query);
      const matchMerchant = tx.merchant?.toLowerCase().includes(query);
      const matchCat = tx.category?.name.toLowerCase().includes(query);
      const matchSubCat = tx.subcategory?.name.toLowerCase().includes(query);
      const matchTag = tx.itemTag?.toLowerCase().includes(query);
      if (!matchDesc && !matchMerchant && !matchCat && !matchSubCat && !matchTag) return false;
    }
    return true;
  });

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      const transactionLabelA = (a.merchant || a.description || '').toLowerCase();
      const transactionLabelB = (b.merchant || b.description || '').toLowerCase();
      const categoryA = (a.category?.name || '').toLowerCase();
      const categoryB = (b.category?.name || '').toLowerCase();
      const fromToA = `${a.sourceAccount?.name || a.sourceAccountId || ''} ${a.destinationAccount?.name || a.destinationAccountId || ''}`.toLowerCase();
      const fromToB = `${b.sourceAccount?.name || b.sourceAccountId || ''} ${b.destinationAccount?.name || b.destinationAccountId || ''}`.toLowerCase();

      let compareValue = 0;
      if (sortKey === 'amount') {
        compareValue = a.amount - b.amount;
      } else if (sortKey === 'date') {
        compareValue = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      } else if (sortKey === 'transaction') {
        compareValue = transactionLabelA.localeCompare(transactionLabelB);
      } else if (sortKey === 'type') {
        compareValue = a.type.localeCompare(b.type);
      } else if (sortKey === 'category') {
        compareValue = categoryA.localeCompare(categoryB);
      } else if (sortKey === 'fromTo') {
        compareValue = fromToA.localeCompare(fromToB);
      } else {
        compareValue = a.paymentMethod.localeCompare(b.paymentMethod);
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  }, [filteredTransactions, sortDirection, sortKey]);

  const toggleSort = (nextKey: LedgerSortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === 'date' || nextKey === 'amount' ? 'desc' : 'asc');
  };

  const sortIndicator = (key: LedgerSortKey) => {
    if (sortKey !== key) {
      return '↕';
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginatedTransactions = sortedTransactions.slice((page - 1) * pageSize, page * pageSize);
  const filteredIncomeTotal = filteredTransactions.reduce((sum, tx) => {
    if (tx.type !== 'INCOME') return sum;
    return sum + tx.amount;
  }, 0);
  const filteredExpenseTotal = filteredTransactions.reduce((sum, tx) => {
    if (tx.type !== 'EXPENSE') return sum;
    return sum + tx.amount;
  }, 0);
  const firstVisibleRow = filteredTransactions.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisibleRow = Math.min(page * pageSize, filteredTransactions.length);

  return (
    <div className="ledger-shell bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-white">Recent Financial Transactions</h2>
          </div>
          <p className="text-xs text-slate-400">Ledger records with detailed filtering and account tracing</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-2 py-1.5">
          <button
            type="button"
            onClick={() => onSelectedMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
            className="rounded-lg p-1.5 text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7.5rem] text-center text-xs font-semibold text-cyan-100">
            {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => onSelectedMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
            className="rounded-lg p-1.5 text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search merchant, notes, category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* CSV Export Button */}
          <button
            onClick={() => exportTransactionsToCSV(filteredTransactions)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors"
            title="Export currently filtered transactions to CSV file"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>

          {/* PDF Report Button */}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
              title="Print or Save PDF Financial Summary Report"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Print Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="ledger-filter rounded-2xl border border-slate-700/60 bg-slate-950/40 p-3">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          <Filter className="h-3.5 w-3.5 text-cyan-400" />
          Narrow the ledger
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Type Filter */}
          <FancySelect
            value={selectedType}
            placeholder="All Types"
            multiple
            options={[
              { value: '', label: 'All Types' },
              { value: 'INCOME', label: 'Income' },
              { value: 'EXPENSE', label: 'Expense' },
              { value: 'TRANSFER', label: 'Transfer' },
            ]}
            onChange={(value) => {
              setSelectedType(Array.isArray(value) ? value : []);
              setCurrentPage(1);
            }}
          />

          {/* Category Filter */}
          <FancySelect
            value={selectedCategory}
            placeholder="All Categories"
            multiple
            options={[
              { value: '', label: 'All Categories' },
              ...categoryFilterOptions,
            ]}
            onChange={(value) => {
              setSelectedCategory(Array.isArray(value) ? value : []);
              setCurrentPage(1);
            }}
          />

          {/* Account Filter */}
          <FancySelect
            value={selectedAccount}
            placeholder="All Accounts"
            multiple
            options={[
              { value: '', label: 'All Accounts' },
              ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.type})` })),
            ]}
            onChange={(value) => {
              setSelectedAccount(Array.isArray(value) ? value : []);
              setCurrentPage(1);
            }}
          />

          {/* Payment Method Filter */}
          <FancySelect
            value={selectedPaymentMethod}
            placeholder="All Payment Methods"
            multiple
            options={[
              { value: '', label: 'All Payment Methods' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
              { value: 'CASH', label: 'Cash' },
              { value: 'UPI', label: 'UPI' },
            ]}
            onChange={(value) => {
              setSelectedPaymentMethod(Array.isArray(value) ? value : []);
              setCurrentPage(1);
            }}
          />

        {/* Start Date */}
        <DatePicker
          value={startDate}
          onChange={(value) => {
            setStartDate(value);
            handleApplyFilters({ startDate: value || undefined, endDate });
          }}
          accent="blue"
          placeholder="Start date"
        />

        {/* End Date */}
        <DatePicker
          value={endDate}
          onChange={(value) => {
            const nextEndDate = value || todayIsoDate;
            setEndDate(nextEndDate);
            handleApplyFilters({ endDate: nextEndDate });
          }}
          accent="blue"
          placeholder="End date"
        />

        {/* Reset */}
        <button
          onClick={handleResetFilters}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/60 rounded-xl text-xs text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear Filters</span>
        </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="ledger-table-wrap max-h-[32rem] overflow-auto rounded-2xl border border-slate-700/60 shadow-xl shadow-slate-950/20">
        <table className="ledger-table w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
            <tr>
              <th className="py-3 px-4">
                <button type="button" onClick={() => toggleSort('transaction')} className="flex items-center gap-1 font-semibold hover:text-cyan-300">
                  Transaction <span className="text-[10px]">{sortIndicator('transaction')}</span>
                </button>
              </th>
              <th className="py-3 px-4">
                <button type="button" onClick={() => toggleSort('type')} className="flex items-center gap-1 font-semibold hover:text-cyan-300">
                  Type <span className="text-[10px]">{sortIndicator('type')}</span>
                </button>
              </th>
              <th className="py-3 px-4">
                <button type="button" onClick={() => toggleSort('category')} className="flex items-center gap-1 font-semibold hover:text-cyan-300">
                  Category <span className="text-[10px]">{sortIndicator('category')}</span>
                </button>
              </th>
              <th className="py-3 px-4">
                <button type="button" onClick={() => toggleSort('fromTo')} className="flex items-center gap-1 font-semibold hover:text-cyan-300">
                  Account / Method <span className="text-[10px]">{sortIndicator('fromTo')}</span>
                </button>
              </th>
              <th className="py-3 px-4">
                <button type="button" onClick={() => toggleSort('date')} className="flex items-center gap-1 font-semibold hover:text-cyan-300">
                  Date <span className="text-[10px]">{sortIndicator('date')}</span>
                </button>
              </th>
              <th className="py-3 px-4 text-right">
                <button type="button" onClick={() => toggleSort('amount')} className="ml-auto flex items-center gap-1 font-semibold hover:text-cyan-300">
                  Amount <span className="text-[10px]">{sortIndicator('amount')}</span>
                </button>
              </th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-500 italic">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-7 w-7 text-slate-600" />
                    <span>No transactions match your current query or filter criteria.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const isExpense = tx.type === 'EXPENSE';
                const isIncome = tx.type === 'INCOME';
                const isTransfer = tx.type === 'TRANSFER';
                const mainCategoryName = tx.category?.name?.split('>')[0]?.trim() || '—';
                const hasMerchant = Boolean(tx.merchant && tx.merchant.trim().length > 0);
                const hasDescription = Boolean(tx.description && tx.description.trim().length > 0);

                const fromDisplay = tx.sourceAccount?.name || tx.sourceAccountId || '-';

                const toFromAccount = tx.destinationAccount?.name || tx.destinationAccountId || '';
                const toFromMerchant = hasMerchant ? tx.merchant!.trim() : '';
                const toFromDescription = hasDescription ? tx.description!.trim() : '';

                let toDisplay = toFromAccount;
                if (!toDisplay) {
                  if (isExpense) {
                    toDisplay = toFromMerchant || toFromDescription || mainCategoryName;
                  } else if (isIncome) {
                    toDisplay = toFromDescription || toFromMerchant || 'Your account';
                  } else {
                    toDisplay = '-';
                  }
                }

                const txDate = new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <tr key={tx.id} className="ledger-row hover:bg-slate-800/40 transition-colors">
                    {/* Description / Merchant */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isExpense
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {isIncome && <ArrowUpRight className="w-4 h-4" />}
                          {isExpense && <ArrowDownRight className="w-4 h-4" />}
                          {isTransfer && <ArrowRightLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-100 block">
                            {tx.merchant || tx.description || 'Transaction'}
                          </span>
                          {tx.description && tx.merchant && (
                            <span className="text-[10px] text-slate-400 block">{tx.description}</span>
                          )}
                          {tx.isSubscription && (
                            <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                              Recurring
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isExpense
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      <div>
                        <span className="block text-slate-200">{mainCategoryName}</span>
                      </div>
                    </td>

                    {/* Account / Method */}
                    <td className="py-3.5 px-4 text-slate-400">
                      <div>
                        <span className="text-[11px] text-slate-500 block">From</span>
                        <span className="text-slate-200 block font-medium">
                          {fromDisplay}
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-1">To</span>
                        <span className="text-slate-300 block font-medium">
                          {toDisplay}
                        </span>
                        <span className="text-[10px] text-slate-500">{tx.paymentMethod}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{txDate}</td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                      <span
                        className={
                          isIncome
                            ? 'text-emerald-400'
                            : isExpense
                            ? 'text-rose-400'
                            : 'text-blue-400'
                        }
                      >
                        {isIncome ? '+' : isExpense ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {onEditTransaction && (
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit Transaction"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteTransaction && (
                          <button
                            onClick={() => setDeleteConfirmDialog({ isOpen: true, transactionId: tx.id })}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

          </tbody>
        </table>
      </div>

      {filteredTransactions.length > 0 && (
        <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/90 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Income total</span>
              <span className="text-sm font-bold text-emerald-400">+{formatCurrency(filteredIncomeTotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expense total</span>
              <span className="text-sm font-bold text-rose-400">-{formatCurrency(filteredExpenseTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {filteredTransactions.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-700/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-700" />
            <p>
              Showing <span className="font-semibold text-slate-200">{firstVisibleRow}-{lastVisibleRow}</span> of{' '}
              <span className="font-semibold text-slate-200">{filteredTransactions.length}</span> transactions
            </p>
            <label className="flex items-center gap-2">
              <span>Rows</span>
              <ClearableSelect
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
                defaultValue="10"
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400"
                aria-label="Rows per page"
              >
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </ClearableSelect>
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[5.5rem] rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-center text-xs font-semibold text-cyan-200">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={() => {
          if (deleteConfirmDialog.transactionId) {
            handleDeleteTransaction(deleteConfirmDialog.transactionId);
          }
        }}
        onCancel={() => setDeleteConfirmDialog({ isOpen: false, transactionId: null })}
      />
    </div>
  );
};
