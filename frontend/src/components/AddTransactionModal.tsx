import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Account, Category, FinancialReferenceOption, Transaction } from '../types';
import { X, ArrowUpRight, ArrowDownRight, ArrowRightLeft, HandCoins, ChevronDown, Check } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { api } from '../api/client';
import { useAutoSelectSingleOption } from '../hooks/useAutoSelectSingleOption';

interface FancySelectOption {
  value: string;
  label: string;
}

interface FancySelectProps {
  value: string;
  placeholder: string;
  options: FancySelectOption[];
  onChange: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  autoSelectSingleOption?: boolean;
}

interface FancyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const ACCOUNT_CATEGORY_LABELS: Record<string, string> = {
  BANK: 'Debit Card / Bank Account',
  CARD: 'Credit Card',
  CASH: 'Cash',
  WALLET: 'UPI / Wallet',
  POCKET: 'Pocket App',
  DEPOSIT: 'Deposit Account',
  INVESTMENT: 'Investment Account',
  LIABILITY: 'Loan / Credit Account',
  DIGITAL_ASSET: 'Crypto / Digital Asset',
  OTHER: 'Other',
};

const getAccountCategory = (account: Account | undefined, accountTypes: FinancialReferenceOption[]) => {
  if (!account) return undefined;
  const referenceCategory = accountTypes.find((option) => option.code === account.type)?.category;
  if (referenceCategory) return referenceCategory;
  if (account.type === 'CREDIT_CARD' || account.type === 'CHARGE_CARD') return 'CARD';
  if (account.type === 'BANK_ACCOUNT' || account.type === 'CHECKING_ACCOUNT' || account.type === 'SAVINGS_ACCOUNT' || account.type === 'SALARY_ACCOUNT') return 'BANK';
  if (account.type === 'CASH') return 'CASH';
  if (account.type === 'UPI' || account.type === 'AMAZON_PAY' || account.type === 'DIGITAL_WALLET') return 'WALLET';
  return undefined;
};

const FancyInput: React.FC<FancyInputProps> = ({ label, className = '', ...props }) => (
  <div className="relative">
    {label && <label className="mb-1 block text-slate-300 font-semibold">{label}</label>}
    <input {...props} className={`fintrack-input ${className}`} />
  </div>
);

const FancySelect: React.FC<FancySelectProps> = ({
  value,
  placeholder,
  options,
  onChange,
  defaultValue = '',
  disabled = false,
  autoSelectSingleOption = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const hasSelection = value !== defaultValue;
  const optionValues = useMemo(() => options.map((option) => option.value), [options]);

  useAutoSelectSingleOption(value === defaultValue ? '' : value, optionValues, (nextValue) => {
    onChange(nextValue as string);
  }, !disabled && autoSelectSingleOption);

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
        onClick={() => !disabled && setIsOpen((open) => !open)}
        disabled={disabled}
        className={`transaction-select-trigger flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
          selectedOption ? 'text-white' : 'text-slate-500'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <div className="flex items-center gap-1.5">
          {hasSelection && (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={(event) => {
                event.stopPropagation();
                onChange(defaultValue);
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
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 max-h-56 overflow-y-auto rounded-xl border border-cyan-400/30 bg-slate-900/95 p-1.5 shadow-2xl shadow-slate-950/60 backdrop-blur-xl" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
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

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  onSubmitTransaction: (data: any, id?: string) => Promise<void>;
  onOpenDebtModal?: () => void;
  editingTransaction?: Partial<Transaction> | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  transactions,
  onSubmitTransaction,
  onOpenDebtModal,
  editingTransaction,
}) => {
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [itemTag, setItemTag] = useState<string>('');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [sourceAccountCategory, setSourceAccountCategory] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [paymentMethods, setPaymentMethods] = useState<FinancialReferenceOption[]>([]);
  const [accountTypes, setAccountTypes] = useState<FinancialReferenceOption[]>([]);
  const [merchant, setMerchant] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [otherDetails, setOtherDetails] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [amountCandidates, setAmountCandidates] = useState<number[]>([]);

  const frequentTextValues = useMemo(() => {
    const rankValues = (getValue: (transaction: Transaction) => string | undefined) => {
      const values = new Map<string, { value: string; count: number }>();

      transactions.forEach((transaction) => {
        const value = getValue(transaction)?.trim();
        if (!value) return;

        const key = value.toLocaleLowerCase();
        const existing = values.get(key);
        if (existing) existing.count += 1;
        else values.set(key, { value, count: 1 });
      });

      return Array.from(values.values())
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
        .map(({ value }) => value);
    };

    return {
      merchants: rankValues((transaction) => transaction.merchant),
      descriptions: rankValues((transaction) => transaction.description),
    };
  }, [transactions]);

  const selectedPaymentAccountId = type === 'INCOME' ? destinationAccountId : sourceAccountId;
  const selectedPaymentAccount = accounts.find((account) => account.id === selectedPaymentAccountId);
  const isUpiAccount = selectedPaymentAccount?.type === 'UPI';
  const isPocketPaymentAccount = /pockets?/.test(
    `${selectedPaymentAccount?.name || ''} ${selectedPaymentAccount?.institution || ''}`.toLowerCase(),
  );

  const paymentMethodOptions = useMemo(() => {
    const usage = new Map<string, number>();
    transactions.forEach((transaction) => {
      usage.set(transaction.paymentMethod, (usage.get(transaction.paymentMethod) || 0) + 1);
    });

    const selectedAccount = selectedPaymentAccount;
    const selectedAccountCategory = getAccountCategory(selectedAccount, accountTypes);
    const walletIdentity = selectedAccountCategory === 'WALLET'
      ? `${selectedAccount?.type} ${selectedAccount?.name} ${selectedAccount?.institution || ''}`.toLowerCase()
      : '';
    const walletProviders = [
      { pattern: /amazon[ _]*pay/, code: 'AMAZON_PAY' },
      { pattern: /gpay|google[ _]*pay/, code: 'GOOGLE_PAY' },
      { pattern: /phone[ _]*pe/, code: 'PHONEPE' },
      { pattern: /paytm/, code: 'PAYTM' },
      { pattern: /navi/, code: 'NAVI' },
      { pattern: /bhim/, code: 'BHIM' },
      { pattern: /paypal/, code: 'PAYPAL' },
      { pattern: /alipay/, code: 'ALIPAY' },
      { pattern: /wechat/, code: 'WECHAT_PAY' },
    ].filter(({ pattern }) => pattern.test(walletIdentity)).map(({ code }) => code);

    return paymentMethods
      .filter((method) => {
        if (isPocketPaymentAccount) return ['POCKET_UPI', 'POCKET_CARD'].includes(method.code);
        if (selectedAccount?.type === 'UPI') {
          return method.category === 'UPI_APP' || ['UPI', 'UPI_QR'].includes(method.code);
        }
        if (walletProviders.length > 0) {
          return walletProviders.includes(method.code)
            || (method.code === 'WALLET' && selectedAccount?.type !== 'UPI'
              && walletProviders.some((provider) => ['AMAZON_PAY', 'PAYTM', 'PHONEPE'].includes(provider)));
        }
        if (!selectedAccountCategory) return true;
        const allowedCategories = (method.allowedAccountCategories || 'ANY').split(',');
        return allowedCategories.includes('ANY') || allowedCategories.includes(selectedAccountCategory);
      })
      .sort((a, b) => {
        const genericUpiDifference = isUpiAccount
          ? Number(a.code === 'UPI') - Number(b.code === 'UPI')
          : 0;
        const regionDifference = Number(b.region === 'IN') - Number(a.region === 'IN');
        return genericUpiDifference
          || regionDifference
          || (usage.get(b.code) || 0) - (usage.get(a.code) || 0)
          || (a.sortOrder || 0) - (b.sortOrder || 0)
          || a.label.localeCompare(b.label);
      })
      .map(({ code, label }) => ({
        value: code,
        label: isUpiAccount && code === 'UPI'
          ? 'Other UPI App'
          : code === 'WALLET' && walletProviders.length > 0
            ? `${selectedAccount?.name} — Wallet`
            : label,
      }));
  }, [accountTypes, isPocketPaymentAccount, isUpiAccount, paymentMethods, selectedPaymentAccount, transactions]);

  const accountOptions = useMemo(() => {
    const usage = new Map<string, number>();
    transactions.forEach((transaction) => {
      if (transaction.sourceAccountId) usage.set(transaction.sourceAccountId, (usage.get(transaction.sourceAccountId) || 0) + 1);
      if (transaction.destinationAccountId) usage.set(transaction.destinationAccountId, (usage.get(transaction.destinationAccountId) || 0) + 1);
    });

    return accounts
      .filter((account) => account.name?.trim())
      .sort((a, b) => (usage.get(b.id) || 0) - (usage.get(a.id) || 0) || a.name.localeCompare(b.name))
      .map((account) => ({
        value: account.id,
        label: `${account.name}${account.institution && account.institution !== account.name ? ` · ${account.institution}` : ''}`,
      }));
  }, [accounts, transactions]);

  const sourceCategoryOptions = useMemo(() => {
    const categoriesWithAccounts = new Set(
      accounts
        .filter((account) => account.name?.trim())
        .map((account) => getAccountCategory(account, accountTypes))
        .filter((category): category is string => Boolean(category)),
    );
    if (accounts.some((account) => /pockets?/.test(`${account.name} ${account.institution || ''}`.toLowerCase()))) {
      categoriesWithAccounts.add('POCKET');
    }
    const categoryOrder = ['BANK', 'CARD', 'CASH', 'WALLET', 'POCKET', 'DEPOSIT', 'INVESTMENT', 'LIABILITY', 'DIGITAL_ASSET', 'OTHER'];
    return categoryOrder
      .filter((category) => categoriesWithAccounts.has(category))
      .map((category) => ({ value: category, label: ACCOUNT_CATEGORY_LABELS[category] || category }));
  }, [accountTypes, accounts]);

  const sourceAccountOptions = useMemo(() => {
    if (!sourceAccountCategory) return [];
    const allowedAccountIds = new Set(
      accounts
        .filter((account) => {
          const isPocketAccount = /pockets?/.test(`${account.name} ${account.institution || ''}`.toLowerCase());
          if (sourceAccountCategory === 'POCKET') return isPocketAccount;
          if (sourceAccountCategory === 'WALLET' && isPocketAccount) return false;
          return getAccountCategory(account, accountTypes) === sourceAccountCategory;
        })
        .map((account) => account.id),
    );
    return accountOptions.filter((option) => allowedAccountIds.has(option.value));
  }, [accountOptions, accountTypes, accounts, sourceAccountCategory]);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([api.getPaymentMethods(), api.getAccountTypes()])
      .then(([methods, types]) => {
        setPaymentMethods(methods);
        setAccountTypes(types);
      })
      .catch(() => setError('Unable to load payment methods. Please try again.'));
  }, [isOpen]);

  useEffect(() => {
    if (isUpiAccount) {
      if (paymentMethod && !paymentMethodOptions.some((option) => option.value === paymentMethod)) {
        setPaymentMethod('');
      }
      return;
    }
    if (paymentMethodOptions.length > 0 && !paymentMethodOptions.some((option) => option.value === paymentMethod)) {
      setPaymentMethod(paymentMethodOptions[0].value);
    }
  }, [isUpiAccount, paymentMethod, paymentMethodOptions, paymentMethods]);

  useEffect(() => {
    const selectedAccountId = type === 'INCOME' ? destinationAccountId : sourceAccountId;
    if (!selectedAccountId) return;
    const sourceAccount = accounts.find((account) => account.id === selectedAccountId);
    const category = /pockets?/.test(`${sourceAccount?.name || ''} ${sourceAccount?.institution || ''}`.toLowerCase())
      ? 'POCKET'
      : getAccountCategory(sourceAccount, accountTypes);
    if (category && category !== sourceAccountCategory) setSourceAccountCategory(category);
  }, [accountTypes, accounts, destinationAccountId, sourceAccountCategory, sourceAccountId, type]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      setAmountCandidates([]);

      if (editingTransaction) {
        setType(editingTransaction.type || 'EXPENSE');
        setAmount(editingTransaction.amount !== undefined && editingTransaction.amount !== null ? editingTransaction.amount.toString() : '');
        setCategoryId(editingTransaction.categoryId || '');
        const initSubIds = editingTransaction.subcategoryId ? [editingTransaction.subcategoryId] : [];
        setSelectedSubcategoryIds(initSubIds);
        setSubcategoryId(editingTransaction.subcategoryId || '');
        setItemTag(editingTransaction.itemTag || '');
        setSourceAccountId(editingTransaction.sourceAccountId || '');
        setDestinationAccountId(editingTransaction.destinationAccountId || '');
        setPaymentMethod(editingTransaction.paymentMethod || 'BANK_TRANSFER');
        setMerchant(editingTransaction.merchant || '');
        setDescription(editingTransaction.description || '');
        setOtherDetails(editingTransaction.category?.name === 'Other' ? editingTransaction.description || '' : '');
        setTransactionDate(
          editingTransaction.transactionDate
            ? new Date(editingTransaction.transactionDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
      } else {
        setType('EXPENSE');
        setAmount('');
        setCategoryId('');
        setSelectedSubcategoryIds([]);
        setSubcategoryId('');
        setItemTag('');
        setSourceAccountCategory('');
        setMerchant('');
        setDescription('');
        setOtherDetails('');
        setTransactionDate(new Date().toISOString().split('T')[0]);
        if (accounts.length > 0) {
          setSourceAccountId('');
          setDestinationAccountId('');
        }
      }
    }
  }, [isOpen, editingTransaction, accounts]);

  const handleClose = () => {
    console.log('AddTransactionModal closing...');
    setError(null);
    setAmount('');
    setAmountCandidates([]);
    setMerchant('');
    setDescription('');
    setOtherDetails('');
    setSelectedSubcategoryIds([]);
    setSubcategoryId('');
    setItemTag('');
    setSourceAccountCategory('');
    onClose();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleTypeChange = (newType: 'INCOME' | 'EXPENSE' | 'TRANSFER') => {
    setType(newType);
    if (newType === 'INCOME') {
      const salaryCat = categories.find(
        (c) => c.name.toLowerCase() === 'salary' || c.name.toLowerCase() === 'salary & income'
      );
      if (salaryCat) {
        setCategoryId(salaryCat.id);
      }
    }
  };

  const handleDestinationAccountChange = (accountId: string) => {
    setDestinationAccountId(accountId);
    setPaymentMethod('');

    if (type === 'INCOME') {
      const selectedAccount = accounts.find((account) => account.id === accountId);
      const allowanceCategory = categories.find((category) => category.name === 'Pocket Allowance');

      if (selectedAccount?.name === 'Pocket APP ICICI' && allowanceCategory) {
        setCategoryId(allowanceCategory.id);
      }
    }
  };

  const mainCategories = useMemo(() => {
    return categories.filter((category) => !category.parentId && !category.name.includes(' > '));
  }, [categories]);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const isOtherCategory = selectedCategory?.name === 'Other';

  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const matchedSubcategories = categories.filter(
      (category) =>
        category.parentId === selectedCategory.id ||
        category.name.startsWith(`${selectedCategory.name} > `)
    );

    const isFoodAndDining = selectedCategory.name === 'Food & Dining';
    if (!isFoodAndDining) return matchedSubcategories;

    const hiddenFoodAndDiningKeywords = [
      'fruit',
      'vegetable',
      'apple',
      'banana',
      'mango',
      'orange',
      'grapes',
      'watermelon',
      'papaya',
      'guava',
      'pomegranate',
      'pineapple',
      'tomato',
      'potato',
      'onion',
      'leafy',
      'root vegetables',
      'beans & peas',
      'gourds',
      'cauliflower',
      'cabbage',
      'carrot',
      'beetroot',
    ];

    return matchedSubcategories.filter((category) => {
      const cleanName = category.name.replace(/^.*?>\s*/, '').toLowerCase();
      return !hiddenFoodAndDiningKeywords.some((keyword) => cleanName.includes(keyword));
    });
  }, [categories, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (type !== 'TRANSFER' && !categoryId) {
      setError('Please select a category.');
      return;
    }

    if (type === 'EXPENSE' && !sourceAccountId) {
      setError('Expense requires selecting a Source Account.');
      return;
    }

    if (type === 'INCOME' && !destinationAccountId) {
      setError('Income requires selecting a Destination Account.');
      return;
    }

    if (type === 'TRANSFER') {
      if (!sourceAccountId || !destinationAccountId) {
        setError('Transfer requires both Source and Destination accounts.');
        return;
      }
      if (sourceAccountId === destinationAccountId) {
        setError('Source and Destination accounts cannot be the same for a transfer.');
        return;
      }
    }

    if (isOtherCategory && !otherDetails.trim()) {
      setError('Please enter details for the Other category.');
      return;
    }

    if (!paymentMethod) {
      setError(`Please select ${isUpiAccount ? 'a UPI app or mode' : 'a payment method'}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedSubs = availableSubcategories.filter((s) => selectedSubcategoryIds.includes(s.id));
      const cleanNames = selectedSubs.map((s) => s.name.replace(/^.*?>\s*/, ''));
      const finalItemTag = cleanNames.length > 0 ? cleanNames.join(', ') : itemTag;
      const finalSubcategoryId = selectedSubcategoryIds[0] || subcategoryId;

      await onSubmitTransaction(
        {
          type,
          amount: numericAmount,
          currency: 'INR',
          categoryId: categoryId || undefined,
          subcategoryId: finalSubcategoryId || undefined,
          itemTag: finalItemTag || undefined,
          sourceAccountId: sourceAccountId || undefined,
          destinationAccountId: destinationAccountId || undefined,
          paymentMethod,
          merchant: merchant || undefined,
          description: isOtherCategory ? otherDetails.trim() : (description.trim() || finalItemTag || undefined),
          transactionDate: new Date(transactionDate).toISOString(),
        },
        editingTransaction?.id
      );
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.response?.data?.message || err.message || 'Failed to record transaction');
    }
  };

  const toBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = reader.result;
        if (typeof value !== 'string') {
          reject(new Error('Failed to read file'));
          return;
        }

        const content = value.includes(',') ? value.split(',')[1] : value;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid receipt file (PNG/JPG/WEBP/PDF).');
      event.target.value = '';
      return;
    }

    try {
      setError(null);
      setIsParsingReceipt(true);
      const imageBase64 = await toBase64(file);
      const parsed = await api.parseReceipt({ imageBase64, mimeType: file.type });

      const candidates = parsed.amountCandidates || [];
      setAmountCandidates(candidates);

      if (parsed.amount && !amount) {
        setAmount(parsed.amount.toString());
      } else if (!amount && candidates.length > 0) {
        setAmount(candidates[0].toString());
      }

      if (parsed.merchant && !merchant) {
        setMerchant(parsed.merchant);
      }

      if (parsed.description && !description) {
        setDescription(parsed.description);
      }

      if (parsed.transactionDate) {
        setTransactionDate(parsed.transactionDate);
      }

      if (parsed.paymentMethodHint) {
        setPaymentMethod(parsed.paymentMethodHint);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Receipt OCR failed. Try a clearer image.');
    } finally {
      setIsParsingReceipt(false);
      event.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <h3 className="text-base font-bold text-white">
            {editingTransaction ? 'Edit Transaction' : 'Record New Transaction'}
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 pt-0 space-y-4 text-xs overflow-y-auto min-h-0">
          {onOpenDebtModal && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HandCoins className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Recording money lent to someone or borrowed?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenDebtModal();
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors"
              >
                Add Debt / Loan
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Transaction Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('EXPENSE')}
              className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                type === 'EXPENSE'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Expense</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('INCOME')}
              className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                type === 'INCOME'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Income</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('TRANSFER')}
              className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                type === 'TRANSFER'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transfer</span>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Amount (₹) <span className="text-rose-400">*</span></label>
            <FancyInput
              type="number"
              step="0.01"
              required
              placeholder="e.g. 1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="p-2.5 text-sm"
            />
            {amountCandidates.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {amountCandidates.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setAmount(candidate.toString())}
                    className="px-2 py-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 text-[11px] font-semibold hover:bg-cyan-500/20"
                  >
                    Use {candidate}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-[11px] text-slate-300">
                <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 font-semibold text-slate-200">
                  Scan Receipt
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleReceiptUpload}
                  disabled={isParsingReceipt || isSubmitting}
                />
              </label>
              {isParsingReceipt && <span className="text-[11px] text-cyan-400 font-semibold">Parsing receipt...</span>}
            </div>
          </div>

          {/* Category (Required for Expense/Income) */}
          {type !== 'TRANSFER' && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Category <span className="text-rose-400">*</span></label>
              <FancySelect
                value={categoryId}
                placeholder="Select Category"
                options={mainCategories.map((category) => ({ value: category.id, label: category.name }))}
                onChange={(value) => {
                  setCategoryId(value);
                  setSelectedSubcategoryIds([]);
                  setSubcategoryId('');
                  setItemTag('');
                  setDescription('');
                  setOtherDetails('');
                }}
              />

              {/* Subcategory / Item Type Quick Chips (Multi-Select) */}
              {availableSubcategories.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-400 text-[11px] font-semibold block">
                      Specific Item / Subcategory (Select Multiple):
                    </label>
                    {selectedSubcategoryIds.length > 0 && (
                      <span className="text-[10px] text-cyan-400 font-bold">
                        {selectedSubcategoryIds.length} selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {availableSubcategories.map((sub) => {
                      const cleanName = sub.name.replace(/^.*?>\s*/, '');
                      const isSelected = selectedSubcategoryIds.includes(sub.id);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            let nextIds: string[];
                            if (isSelected) {
                              nextIds = selectedSubcategoryIds.filter((id) => id !== sub.id);
                            } else {
                              nextIds = [...selectedSubcategoryIds, sub.id];
                            }
                            setSelectedSubcategoryIds(nextIds);

                            const selectedSubs = availableSubcategories.filter((s) => nextIds.includes(s.id));
                            const cleanNames = selectedSubs.map((s) => s.name.replace(/^.*?>\s*/, ''));
                            const tagStr = cleanNames.join(', ');

                            setSubcategoryId(nextIds[0] || '');
                            setItemTag(tagStr);
                            setDescription(tagStr);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-500/30'
                              : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          <span>{cleanName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isOtherCategory && (
                <div className="mt-3">
                  <label className="text-slate-300 font-semibold block mb-1">Other Details <span className="text-rose-400">*</span></label>
                  <FancyInput
                    type="text"
                    required
                    placeholder="What is this transaction for?"
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    className="p-2.5 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Grouped account selection; income credits the selected account. */}
          {(
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Source Type <span className="text-rose-400">*</span></label>
                <FancySelect
                  value={sourceAccountCategory}
                  placeholder="Debit, credit, cash..."
                  options={sourceCategoryOptions}
                  autoSelectSingleOption={sourceCategoryOptions[0]?.value !== 'POCKET'}
                  onChange={(category) => {
                    setSourceAccountCategory(category);
                    const inferredAccount = category === 'POCKET'
                      ? accounts.find((account) => /pockets?/.test(`${account.name} ${account.institution || ''}`.toLowerCase()))
                      : category === 'WALLET'
                      ? accounts.find((account) => (
                          account.type === 'UPI'
                          && account.name.trim().toLocaleLowerCase() === 'upi'
                        ))
                      : category === 'CASH'
                        ? accounts.find((account) => account.type === 'CASH')
                        : undefined;

                    if (type === 'INCOME') {
                      setDestinationAccountId(inferredAccount?.id || '');
                    } else {
                      setSourceAccountId(inferredAccount?.id || '');
                    }
                    setPaymentMethod(category === 'CASH' ? 'CASH' : '');
                  }}
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  {type === 'INCOME' ? 'To Account (Credited)' : type === 'EXPENSE' ? 'From Account (Source)' : 'From Account (Debited)'} <span className="text-rose-400">*</span>
                </label>
                <FancySelect
                  value={type === 'INCOME' ? destinationAccountId : sourceAccountId}
                  placeholder={sourceAccountCategory ? 'Select Account' : 'Choose source type first'}
                  options={sourceAccountOptions}
                  disabled={!sourceAccountCategory}
                  onChange={(accountId) => {
                    if (type === 'INCOME') {
                      handleDestinationAccountChange(accountId);
                    } else {
                      setSourceAccountId(accountId);
                      setPaymentMethod('');
                    }
                  }}
                />
              </div>
              {accounts.length === 0 && (
                <p className="text-[11px] text-amber-400 mt-1 min-[420px]:col-span-2">No active accounts found in system.</p>
              )}
            </div>
          )}

          {/* Transfers also require a separate destination account. */}
          {type === 'TRANSFER' && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                To Account (Credited) <span className="text-rose-400">*</span>
              </label>
              <FancySelect
                value={destinationAccountId}
                placeholder="Select Destination Account"
                options={accountOptions.filter((option) => option.value !== sourceAccountId)}
                disabled={type === 'TRANSFER' && !sourceAccountId}
                onChange={handleDestinationAccountChange}
              />
              {accounts.length === 0 && (
                <p className="text-[11px] text-amber-400 mt-1">No active accounts found in system.</p>
              )}
            </div>
          )}

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              {isPocketPaymentAccount ? 'Pocket App Payment Mode' : isUpiAccount ? 'UPI App / Mode' : 'Payment Method'} <span className="text-rose-400">*</span>
            </label>
            <FancySelect
              value={paymentMethod}
              placeholder={isPocketPaymentAccount ? 'Select UPI or card' : isUpiAccount ? 'Google Pay, PhonePe, Paytm...' : 'Select Payment Method'}
              defaultValue={isUpiAccount ? '' : 'BANK_TRANSFER'}
              options={paymentMethodOptions}
              disabled={type === 'INCOME' ? !destinationAccountId : !sourceAccountId}
              onChange={setPaymentMethod}
            />
          </div>

          {/* Merchant & Description */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Merchant / Payee</label>
              <FancyInput
                type="text"
                list="merchant-suggestions"
                placeholder="e.g. Zaitoon / Amazon"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="p-2.5 text-xs"
              />
              <datalist id="merchant-suggestions">
                {frequentTextValues.merchants.map((value) => <option key={value} value={value} />)}
              </datalist>
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Date <span className="text-rose-400">*</span></label>
              <DatePicker value={transactionDate} onChange={setTransactionDate} accent="blue" />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Notes / Description</label>
            <FancyInput
              type="text"
              list="description-suggestions"
              placeholder="e.g. Team dinner / Monthly salary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-2.5 text-xs"
            />
            <datalist id="description-suggestions">
              {frequentTextValues.descriptions.map((value) => <option key={value} value={value} />)}
            </datalist>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : editingTransaction
                ? 'Update Transaction'
                : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
