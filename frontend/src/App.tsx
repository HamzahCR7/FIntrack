import React, { lazy, Suspense, useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import type { MetricType } from './components/MetricDetailsModal';
import { UtilityDock } from './components/UtilityDock';
import { LoginScreen } from './components/LoginScreen';
import { AccordionSection } from './components/AccordionSection';
import { ToastContainer } from './components/ToastContainer';
import ExportPeriodModal from './components/ExportPeriodModal';
import { useToast } from './utils/toastStore';
import {
  createOutboxId,
  enqueueTransactionOperation,
  mergePendingTransactions,
  removeTransactionOperation,
  syncTransactionOutbox,
} from './utils/transactionOutbox';
import { api } from './api/client';
import { exportTransactionsToCSV, printPDFReport, exportPowerBIDataset } from './utils/exportUtils';
import { DashboardData, Transaction, Category, Account, TransactionFilters, Budget, Goal } from './types';
import { AlertCircle, RefreshCw, LayoutDashboard, ReceiptText, Landmark, HandCoins, Repeat, Sparkles, BellRing, HelpCircle, History, Target, PieChart, Flag, Gauge, FlaskConical, Menu, X, Plus, ArrowRight, ChevronDown, WalletCards } from 'lucide-react';
import { formatCurrency } from './utils/privacyStore';

const SummaryCards = lazy(() => import('./components/SummaryCards').then((module) => ({ default: module.SummaryCards })));
const MetricDetailsModal = lazy(() => import('./components/MetricDetailsModal').then((module) => ({ default: module.MetricDetailsModal })));
const CustomizableDashboard = lazy(() => import('./components/CustomizableDashboard').then((module) => ({ default: module.CustomizableDashboard })));
const AccountsSection = lazy(() => import('./components/AccountsSection').then((module) => ({ default: module.AccountsSection })));
const RecurringSection = lazy(() => import('./components/RecurringSection').then((module) => ({ default: module.RecurringSection })));
const DebtsSection = lazy(() => import('./components/DebtsSection').then((module) => ({ default: module.DebtsSection })));
const TransactionsSection = lazy(() => import('./components/TransactionsSection').then((module) => ({ default: module.TransactionsSection })));
const AIAssistantChat = lazy(() => import('./components/AIAssistantChat').then((module) => ({ default: module.AIAssistantChat })));
const AIPersonalizationSection = lazy(() => import('./components/AIPersonalizationSection').then((module) => ({ default: module.AIPersonalizationSection })));
const AddTransactionModal = lazy(() => import('./components/AddTransactionModal').then((module) => ({ default: module.AddTransactionModal })));
const AddDebtModal = lazy(() => import('./components/AddDebtModal').then((module) => ({ default: module.AddDebtModal })));
const AddSubscriptionModal = lazy(() => import('./components/AddSubscriptionModal').then((module) => ({ default: module.AddSubscriptionModal })));
const BillRemindersSection = lazy(() => import('./components/BillRemindersSection').then((module) => ({ default: module.BillRemindersSection })));
const CanIAffordThisModal = lazy(() => import('./components/CanIAffordThisModal').then((module) => ({ default: module.CanIAffordThisModal })));
const TimeMachineModal = lazy(() => import('./components/TimeMachineModal').then((module) => ({ default: module.TimeMachineModal })));
const BudgetsSection = lazy(() => import('./components/BudgetsSection'));
const GoalsSection = lazy(() => import('./components/GoalsSection'));
const SpendForecastCard = lazy(() => import('./components/SpendForecastCard').then((module) => ({ default: module.SpendForecastCard })));
const SmartGuidancePanel = lazy(() => import('./components/SmartGuidancePanel').then((module) => ({ default: module.SmartGuidancePanel })));
const FinancialIntelligenceHub = lazy(() => import('./components/FinancialIntelligenceHub').then((module) => ({ default: module.FinancialIntelligenceHub })));

type DashboardTab = 'overview' | 'smart-guidance' | 'reminders' | 'transactions' | 'accounts' | 'debts' | 'subscriptions' | 'budgets' | 'goals' | 'forecast' | 'financial-hub' | 'ai';

const APP_DATA_CACHE_KEY = 'fintrack_app_data_cache_v1';

type CachedAppData = {
  dashboardData: DashboardData;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  goals: Goal[];
};

const readCachedAppData = (): CachedAppData | null => {
  try {
    const value = localStorage.getItem(APP_DATA_CACHE_KEY);
    return value ? JSON.parse(value) as CachedAppData : null;
  } catch {
    return null;
  }
};

export const App: React.FC = () => {
  const [cachedAppData] = useState(readCachedAppData);
  const { addToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; name?: string } | null>(null);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(cachedAppData?.dashboardData ?? null);
  const [transactions, setTransactions] = useState<Transaction[]>(cachedAppData?.transactions ?? []);
  const [ledgerTransactions, setLedgerTransactions] = useState<Transaction[]>(cachedAppData?.transactions ?? []);
  const [categories, setCategories] = useState<Category[]>(cachedAppData?.categories ?? []);
  const [accounts, setAccounts] = useState<Account[]>(cachedAppData?.accounts ?? []);
  const [budgets, setBudgets] = useState<Budget[]>(cachedAppData?.budgets ?? []);
  const [goals, setGoals] = useState<Goal[]>(cachedAppData?.goals ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedAppData);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isAffordModalOpen, setIsAffordModalOpen] = useState<boolean>(false);
  const [isTimeMachineModalOpen, setIsTimeMachineModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | Partial<Transaction> | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [mobileNavigationHistory, setMobileNavigationHistory] = useState<DashboardTab[]>([]);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showMobileInsights, setShowMobileInsights] = useState(false);
  const [showMobileSummaryDetails, setShowMobileSummaryDetails] = useState(false);
  const [mobileMetricDetails, setMobileMetricDetails] = useState<MetricType | null>(null);
  const [ledgerMonth, setLedgerMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const ledgerTransactionCount = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.transactionDate);
    const isInLedgerMonth =
      transactionDate.getFullYear() === ledgerMonth.getFullYear() &&
      transactionDate.getMonth() === ledgerMonth.getMonth();

    return isInLedgerMonth;
  }).length;
  const dueTimelineCount =
    (dashboardData?.recurring.upcomingSubscriptions.length || 0) +
    (dashboardData?.accounts.breakdown.CREDIT_CARD || []).filter((card) => (card.currentBalance ?? card.currentOutstanding ?? 0) > 0).length +
    (dashboardData?.debts.activeDebts || []).filter((debt) => debt.type === 'I_OWE' && debt.remainingAmount > 0).length;
  const currentHour = new Date().getHours();
  const dayGreeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = 'Hamzah';
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('fintrack_theme_mode', 'dark');
  }, []);

  const clearLocalAppData = () => {
    localStorage.removeItem(APP_DATA_CACHE_KEY);
    setDashboardData(null);
    setTransactions([]);
    setLedgerTransactions([]);
    setCategories([]);
    setAccounts([]);
    setBudgets([]);
    setGoals([]);
  };

  // Verify stored session on mount
  useEffect(() => {
    const token = localStorage.getItem('fintrack_auth_token');
    const storedUser = localStorage.getItem('fintrack_user');

    if (token) {
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
          setAuthChecking(false);
          void fetchAllData();
        } catch {}
      }

      api
        .getMe()
        .then((data) => {
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          setAuthChecking(false);
          if (!storedUser) void fetchAllData();
        })
        .catch((authError) => {
          if (axios.isAxiosError(authError) && authError.response?.status === 401) {
            localStorage.removeItem('fintrack_auth_token');
            localStorage.removeItem('fintrack_user');
            clearLocalAppData();
            setCurrentUser(null);
            setIsAuthenticated(false);
          } else {
            // Keep a valid saved session when the host is waking up or temporarily unavailable.
            setIsAuthenticated(Boolean(storedUser));
            addToast('Could not verify your session. Check your connection and try again.', 'error');
          }
          setAuthChecking(false);
        });
    } else {
      setIsAuthenticated(false);
      setAuthChecking(false);
    }
  }, []);

  const handleLoginSuccess = (user: { id: string; username: string; name?: string }) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    fetchAllData();
  };

  const handleLogout = () => {
    localStorage.removeItem('fintrack_auth_token');
    localStorage.removeItem('fintrack_user');
    clearLocalAppData();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const fetchAllData = async (filters?: TransactionFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const dashboardPromise = api.getDashboard();
      const [dash, txs, cats, accs, budgetsData, goalsData] = await Promise.all([
        dashboardPromise,
        api.getTransactions(filters),
        api.getCategories(),
        api.getAccounts(),
        api.getBudgets(),
        api.getGoals(),
      ]);

      const visibleTransactions = await mergePendingTransactions(txs);

      setDashboardData(dash);
      setTransactions(visibleTransactions);
      setLedgerTransactions(visibleTransactions);
      setCategories(cats);
      setAccounts(accs);
      setBudgets(budgetsData || []);
      setGoals(goalsData || []);

      localStorage.setItem(APP_DATA_CACHE_KEY, JSON.stringify({
        dashboardData: dash,
        transactions: visibleTransactions,
        categories: cats,
        accounts: accs,
        budgets: budgetsData || [],
        goals: goalsData || [],
      } satisfies CachedAppData));

      void api
        .getForecast()
        .then((forecast) => {
          setDashboardData((current) => (current ? { ...current, forecast } : { ...dash, forecast }));
        })
        .catch(() => {
          // Keep the dashboard usable even if the forecast request fails.
        });

      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.response?.data?.message || err.message || 'Failed to fetch financial data from server.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const sync = () => {
      void syncTransactionOutbox().then((changed) => {
        if (changed) void fetchAllData();
      });
    };

    sync();
    window.addEventListener('online', sync);
    const interval = window.setInterval(sync, 5 * 60 * 1000);
    return () => {
      window.removeEventListener('online', sync);
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const notifySyncFailure = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      addToast(message ? `Transaction sync failed: ${message}` : 'Transaction sync failed. Open Money Lab to retry.', 'error');
    };
    window.addEventListener('fintrack-sync-failed', notifySyncFailure);
    return () => window.removeEventListener('fintrack-sync-failed', notifySyncFailure);
  }, [addToast]);

  const handleFilterChange = (filters: TransactionFilters) => {
    api.getTransactions(filters).then(setLedgerTransactions).catch(console.error);
  };

  const handleOpenAddModal = (txToEdit?: Transaction | Partial<Transaction>) => {
    setEditingTransaction(txToEdit || null);
    setIsModalOpen(true);
  };

  const handlePayCreditCard = (card: Account) => {
    const amountToPay = card.currentBalance ?? card.currentOutstanding ?? 0;
    handleOpenAddModal({
      type: 'TRANSFER',
      destinationAccountId: card.id,
      amount: amountToPay > 0 ? amountToPay : undefined,
      description: `Bill Payment for ${card.name}`,
      paymentMethod: 'BANK_TRANSFER',
    });
  };

  const handleSaveTransaction = async (data: any, id?: string) => {
    const operationId = createOutboxId();
    const entityId = id || operationId;
    await enqueueTransactionOperation({
      id: operationId,
      type: id ? 'update' : 'create',
      entityId,
      payload: data,
      createdAt: Date.now(),
    });

    const optimisticTransaction = {
      ...data,
      id: entityId,
      currency: data.currency || 'INR',
      isSubscription: data.isSubscription || false,
      category: categories.find((category) => category.id === data.categoryId),
      subcategory: categories.find((category) => category.id === data.subcategoryId),
      sourceAccount: accounts.find((account) => account.id === data.sourceAccountId),
      destinationAccount: accounts.find((account) => account.id === data.destinationAccountId),
      syncStatus: 'pending' as const,
    } as Transaction;

    const applyOptimisticSave = (current: Transaction[]) => id
      ? current.map((transaction) => transaction.id === id ? { ...transaction, ...optimisticTransaction } : transaction)
      : [optimisticTransaction, ...current];

    setTransactions(applyOptimisticSave);
    setLedgerTransactions(applyOptimisticSave);
    setEditingTransaction(null);
    addToast(id ? 'Update saved locally — syncing' : 'Transaction saved locally — syncing', 'success');

    void syncTransactionOutbox().then((changed) => {
      if (changed) void fetchAllData();
    });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction? Account balances will be reverted.')) {
      const pendingCreate = transactions.find((transaction) => transaction.id === id)?.syncStatus === 'pending' && id.startsWith('offline-');
      if (pendingCreate) {
        await removeTransactionOperation(id);
      } else if (navigator.onLine) {
        try {
          await api.deleteTransaction(id);
        } catch {
          await enqueueTransactionOperation({
            id: createOutboxId(),
            type: 'delete',
            entityId: id,
            createdAt: Date.now(),
          });
          addToast('Deletion queued — due status will update after sync', 'info');
        }
      } else {
        await enqueueTransactionOperation({
          id: createOutboxId(),
          type: 'delete',
          entityId: id,
          createdAt: Date.now(),
        });
      }
      setTransactions((current) => current.filter((transaction) => transaction.id !== id));
      setLedgerTransactions((current) => current.filter((transaction) => transaction.id !== id));
      addToast(navigator.onLine ? 'Transaction deleted and due status refreshed' : 'Transaction removed locally — syncing', 'success');
      await syncTransactionOutbox();
      await fetchAllData();
    }
  };

  const navigationItems: Array<{
    id: DashboardTab;
    label: string;
    caption: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', caption: 'Trends & pulse', icon: LayoutDashboard, color: 'blue' },
    { id: 'smart-guidance', label: 'Smart Guidance', caption: 'Daily action plan', icon: Sparkles, color: 'fuchsia' },
    { id: 'reminders', label: 'Due timeline', caption: 'Bills & deadlines', icon: BellRing, color: 'amber', badge: dueTimelineCount || undefined },
    { id: 'transactions', label: 'Ledger', caption: `${ledgerTransactionCount} records`, icon: ReceiptText, color: 'cyan' },
    { id: 'accounts', label: 'Accounts', caption: 'Banks & cards', icon: Landmark, color: 'sky' },
    {
      id: 'debts',
      label: 'Money owed',
      caption: 'Lent & borrowed',
      icon: HandCoins,
      color: 'emerald',
      badge: dashboardData?.debts.activeDebtsCount,
    },
    { id: 'subscriptions', label: 'Recurring', caption: 'Subscriptions', icon: Repeat, color: 'indigo' },
    { id: 'budgets', label: 'Budgets', caption: 'Spending limits', icon: PieChart, color: 'green' },
    { id: 'goals', label: 'Goals', caption: 'Financial targets', icon: Target, color: 'purple' },
    { id: 'forecast', label: 'Forecast', caption: 'Spend projection', icon: Gauge, color: 'amber' },
    { id: 'financial-hub', label: 'Money Lab', caption: 'Automation & review', icon: FlaskConical, color: 'cyan' },
    { id: 'ai', label: 'Ask FinTrack', caption: 'Personal money guide', icon: Sparkles, color: 'fuchsia' },
  ];
  const mobilePrimaryItems = navigationItems.filter((item) => ['overview', 'goals', 'smart-guidance', 'ai'].includes(item.id));
  const mobileMoreItems = navigationItems.filter((item) => !['overview', 'goals', 'smart-guidance', 'ai', 'budgets', 'forecast'].includes(item.id));
  const navigateMobile = (tab: DashboardTab) => {
    if (tab === activeTab) {
      setIsMoreMenuOpen(false);
      return;
    }
    setMobileNavigationHistory((history) => tab === 'overview' ? [] : [...history, activeTab]);
    setActiveTab(tab);
    setIsMoreMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeMobilePage = () => {
    const previousTab = mobileNavigationHistory.at(-1) || 'overview';
    setMobileNavigationHistory((history) => history.slice(0, -1));
    setActiveTab(previousTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const activeMobilePrimary = mobilePrimaryItems.some((item) => item.id === activeTab);
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
    .slice(0, 3);
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-400">Verifying FinTrack Credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="dashboard-shell min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-300 selection:text-slate-950">
      {/* Header */}
      <Navbar
        onAddTransaction={() => handleOpenAddModal()}
        onAddDebt={() => setIsDebtModalOpen(true)}
        onRefresh={() => fetchAllData()}
        onExportCSV={() => setIsExportModalOpen(true)}
        onExportPDF={() => setIsExportModalOpen(true)}
        onExportPowerBI={() => exportPowerBIDataset(transactions, dashboardData)}
        onLogout={handleLogout}
        currentUser={currentUser}
        dashboardData={dashboardData}
        budgets={budgets}
        goals={goals}
        onNavigate={setActiveTab}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <Suspense fallback={(
        <main className="flex min-h-[28rem] flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            Loading dashboard…
          </div>
        </main>
      )}>
      <main className="dashboard-main dashboard-enter flex-1 max-w-[96rem] w-full mx-auto px-1.5 sm:px-4 lg:px-8 py-2 sm:py-6 md:py-8 pb-20 sm:pb-32 md:pb-8 space-y-2 sm:space-y-8">
        <section className={`hero-banner relative hidden overflow-hidden rounded-[2rem] border border-slate-700/70 bg-slate-900/85 p-3 shadow-2xl shadow-slate-950/35 backdrop-blur-sm sm:p-7 md:block ${activeTab === 'overview' ? '' : 'md:block'}`}>
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/25 to-transparent blur-2xl sm:-right-16 sm:-top-20 sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-gradient-to-tr from-orange-400/25 to-transparent blur-2xl sm:-bottom-24 sm:-left-14 sm:h-64 sm:w-64" />

          <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300/90">Financial command center</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {dayGreeting}, {displayName}.
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300 sm:text-[15px]">
                {todayLabel} at a glance. Track cashflow, prioritize due items, and take the next best action quickly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:gap-3">
              <div className="hero-metric-card rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/90">Due now</p>
                <p className="mt-1 text-lg font-semibold text-cyan-100">{dueTimelineCount}</p>
              </div>
              <div className="hero-metric-card rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/90">This month</p>
                <p className="mt-1 text-lg font-semibold text-emerald-100">{ledgerTransactionCount}</p>
              </div>
              <button
                onClick={() => setIsAffordModalOpen(true)}
                className="hero-action-btn rounded-2xl border border-amber-300/35 bg-amber-400/10 px-2.5 py-2 text-left text-amber-200 transition-colors hover:bg-amber-400/20"
              >
                <p className="text-[10px] uppercase tracking-[0.16em]">Quick check</p>
                <p className="mt-1 text-sm font-semibold">Can I afford this?</p>
              </button>
              <button
                onClick={() => setIsTimeMachineModalOpen(true)}
                className="hero-action-btn rounded-2xl border border-fuchsia-300/35 bg-fuchsia-400/10 px-2.5 py-2 text-left text-fuchsia-200 transition-colors hover:bg-fuchsia-400/20"
              >
                <p className="text-[10px] uppercase tracking-[0.16em]">Scenario plan</p>
                <p className="mt-1 text-sm font-semibold">Open time machine</p>
              </button>
            </div>
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchAllData()}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl font-semibold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton / Initial state */}
        {isLoading && !dashboardData ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-2xl border-4 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-slate-400">Loading FinTrack Financial Ledger...</p>
          </div>
        ) : dashboardData ? (
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <section className="space-y-4 md:hidden" aria-label="Home overview">
                <div className="px-2 pt-1">
                  <p className="text-xs text-slate-400">{todayLabel}</p>
                  <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white">{dayGreeting}, {displayName}</h1>
                </div>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Available balance</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{formatCurrency(dashboardData.summary.totalBalance)}</p>
                    </div>
                    <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><WalletCards className="h-5 w-5" /></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
                    <button onClick={() => setMobileMetricDetails('EXPENSE')} className="rounded-lg bg-rose-500/15 px-2 py-1.5 text-left"><p className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">Spent this month</p><p className="mt-1 text-sm font-bold text-rose-400">{formatCurrency(dashboardData.summary.spendingThisMonth)}</p></button>
                    <button onClick={() => setMobileMetricDetails('SAVINGS')} className="text-left"><p className="text-[10px] uppercase tracking-wide text-slate-500">Saved this month</p><p className="mt-1 text-sm font-semibold text-emerald-300">{formatCurrency(dashboardData.summary.savingsThisMonth)}</p></button>
                  </div>
                  <button onClick={() => setShowMobileSummaryDetails((current) => !current)} className="mt-3 flex w-full items-center justify-between border-t border-slate-800 pt-3 text-xs font-semibold text-cyan-300" aria-expanded={showMobileSummaryDetails}>
                    More summary details
                    <ChevronDown className={`h-4 w-4 transition-transform ${showMobileSummaryDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showMobileSummaryDetails && <div className="mt-3 divide-y divide-slate-800 rounded-xl bg-slate-950/45 px-3">
                    {[
                      { label: 'Previous month saved', value: dashboardData.summary.previousMonthSavings, tone: 'text-teal-300' },
                      { label: 'Income this month', value: dashboardData.summary.incomeThisMonth, tone: 'text-emerald-300', metric: 'INCOME' as MetricType },
                      { label: 'Expenses this month', value: dashboardData.summary.spendingThisMonth, tone: 'text-rose-400', metric: 'EXPENSE' as MetricType },
                      { label: 'Credit outstanding', value: dashboardData.summary.creditOutstanding, tone: 'text-amber-300' },
                      { label: 'Pocket allowance', value: dashboardData.summary.pocketAllowanceBalance, tone: 'text-violet-300' },
                    ].map((item) => <button key={item.label} disabled={!item.metric} onClick={() => item.metric && setMobileMetricDetails(item.metric)} className="flex w-full items-center justify-between gap-3 py-3 text-left disabled:cursor-default">
                      <span className="text-xs text-slate-400">{item.label}</span><span className={`text-sm font-semibold ${item.tone}`}>{formatCurrency(item.value || 0)}</span>
                    </button>)}
                  </div>}
                </section>

                <button
                  onClick={() => navigateMobile(dueTimelineCount > 0 ? 'reminders' : 'smart-guidance')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3.5 text-left"
                >
                  <div className="rounded-xl bg-amber-400/15 p-2 text-amber-300"><BellRing className="h-5 w-5" /></div>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-amber-100">{dueTimelineCount > 0 ? `${dueTimelineCount} item${dueTimelineCount === 1 ? '' : 's'} need attention` : 'Your next best step'}</span><span className="mt-0.5 block text-xs text-amber-200/70">{dueTimelineCount > 0 ? 'Review upcoming bills and payments' : 'See your personalized money guidance'}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-300" />
                </button>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Add', icon: Plus, action: () => handleOpenAddModal() },
                    { label: 'Budget', icon: PieChart, action: () => navigateMobile('budgets') },
                    { label: 'Forecast', icon: Gauge, action: () => navigateMobile('forecast') },
                  ].map(({ label, icon: Icon, action }) => (
                    <button key={label} onClick={action} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800 bg-slate-900 px-1 text-slate-200">
                      <Icon className="h-4 w-4 text-cyan-300" /><span className="text-[11px] font-semibold">{label}</span>
                    </button>
                  ))}
                </div>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
                  <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Recent activity</h2><button onClick={() => navigateMobile('transactions')} className="text-xs font-semibold text-cyan-300">See all</button></div>
                  <div className="mt-3 divide-y divide-slate-800">
                    {recentTransactions.length ? recentTransactions.map((transaction) => (
                      <button key={transaction.id} onClick={() => navigateMobile('transactions')} className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${transaction.type === 'INCOME' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30'}`}><ReceiptText className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-100">{transaction.merchant || transaction.description || transaction.category?.name || 'Transaction'}</span><span className="block text-[11px] text-slate-500">{new Date(transaction.transactionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></span>
                        <span className={`text-sm font-semibold ${transaction.type === 'INCOME' ? 'text-emerald-300' : 'text-slate-100'}`}>{transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}</span>
                      </button>
                    )) : <p className="py-3 text-sm text-slate-400">No transactions yet. Add your first one to start tracking.</p>}
                  </div>
                </section>

                <button
                  onClick={() => setShowMobileInsights((current) => !current)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-left"
                  aria-expanded={showMobileInsights}
                >
                  <span><span className="block text-sm font-semibold text-white">Explore all insights</span><span className="mt-0.5 block text-xs text-slate-400">Spending, dues, daily activity, trends and planning tools</span></span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-cyan-300 transition-transform ${showMobileInsights ? 'rotate-180' : ''}`} />
                </button>
              </section>
            )}
            {/* 1. TOP SUMMARY CARDS (Accordion Section) */}
            <AccordionSection
              className="hidden md:block"
              title="Financial Pulse & Summary"
              subtitle="Liquid bank balances, monthly savings & total active credit debt"
              icon={LayoutDashboard}
              defaultOpen={true}
            >
              <SummaryCards
                summary={dashboardData.summary}
                monthlyTrends={dashboardData.monthlyTrends}
                transactions={transactions}
                isColumn={false}
              />
            </AccordionSection>

            {activeTab !== 'overview' && (
              <section className="mobile-page-context flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 md:hidden">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">FinTrack</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{navigationItems.find((item) => item.id === activeTab)?.label}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{navigationItems.find((item) => item.id === activeTab)?.caption}</p>
                </div>
                <button onClick={closeMobilePage} className="shrink-0 rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white" aria-label="Close and return to previous page">
                  <X className="h-5 w-5" />
                </button>
              </section>
            )}

            {/* 2. MONEY COCKPIT NAVIGATION */}
            <section
              className="dashboard-cockpit hidden md:block relative overflow-hidden rounded-[1.75rem] border border-slate-700/70 bg-gradient-to-br from-slate-900/95 via-slate-900 to-slate-950 p-4 shadow-2xl shadow-slate-950/40 sm:p-5"
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full border-[18px] border-blue-500/10 sm:-right-16 sm:-top-20 sm:h-48 sm:w-48 sm:border-[24px]" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                    Money cockpit
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Where should we look?</h2>
                  <p className="mt-1 text-sm text-slate-400">Your financial picture, arranged for quick decisions.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1.5">Live ledger</span>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">Synced</span>
                </div>
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const activeStyles = {
                    blue: 'border-blue-400/50 bg-blue-500/20 text-white shadow-lg shadow-blue-950/30',
                    amber: 'border-amber-400/50 bg-amber-500/20 text-white shadow-lg shadow-amber-950/30',
                    cyan: 'border-cyan-400/50 bg-cyan-500/20 text-white shadow-lg shadow-cyan-950/30',
                    sky: 'border-sky-400/50 bg-sky-500/20 text-white shadow-lg shadow-sky-950/30',
                    emerald: 'border-emerald-400/50 bg-emerald-500/20 text-white shadow-lg shadow-emerald-950/30',
                    indigo: 'border-indigo-400/50 bg-indigo-500/20 text-white shadow-lg shadow-indigo-950/30',
                    fuchsia: 'border-fuchsia-400/50 bg-fuchsia-500/20 text-white shadow-lg shadow-fuchsia-950/30',
                  }[item.color];

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      aria-pressed={isActive}
                      className={`dashboard-tab-btn group relative min-h-[82px] rounded-2xl border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-800/80 ${
                        isActive ? activeStyles : 'border-slate-800 bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <Icon className={`mb-3 h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="block truncate text-xs font-bold">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500 group-hover:text-slate-400">{item.caption}</span>
                      {item.badge ? <span className="absolute right-2 top-2 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950">{item.badge}</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="relative mt-3 flex flex-wrap gap-2 border-t border-slate-800/80 pt-3">
                <button
                  onClick={() => setIsAffordModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
                  title="Can I Afford This? Analyzer"
                >
                  <HelpCircle className="h-4 w-4 text-amber-400" />
                  Can I afford this?
                </button>
                <button
                  onClick={() => setIsTimeMachineModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-2 text-xs font-semibold text-fuchsia-300 transition-colors hover:bg-fuchsia-400/20"
                  title="Financial Time Machine Simulator"
                >
                  <History className="h-4 w-4 text-fuchsia-400" />
                  Time machine
                </button>
              </div>

            </section>

            {/* TAB CONTENT VIEWS WITH ACCORDIONS */}

            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className={`${showMobileInsights ? 'block' : 'hidden'} md:hidden`}><CustomizableDashboard
                dashboardData={dashboardData}
                transactions={transactions}
                onAddTransactionForDate={(dateStr) => {
                  setEditingTransaction({ transactionDate: dateStr, type: 'EXPENSE' });
                  setIsModalOpen(true);
                }}
                onPayCreditCard={handlePayCreditCard}
                onPaySubscription={() => setActiveTab('subscriptions')}
                onPayDebt={() => setActiveTab('debts')}
              /></div>
            )}
            {activeTab === 'overview' && (
              <div className="hidden md:block"><CustomizableDashboard
                dashboardData={dashboardData}
                transactions={transactions}
                onAddTransactionForDate={(dateStr) => {
                  setEditingTransaction({ transactionDate: dateStr, type: 'EXPENSE' });
                  setIsModalOpen(true);
                }}
                onPayCreditCard={handlePayCreditCard}
                onPaySubscription={() => setActiveTab('subscriptions')}
                onPayDebt={() => setActiveTab('debts')}
              /></div>
            )}

            {/* 1B. SMART GUIDANCE TAB */}
            {activeTab === 'smart-guidance' && (
              <AccordionSection
                title="Smart Guidance"
                subtitle="Actionable recommendations for daily decisions"
                icon={Sparkles}
                defaultOpen={true}
              >
                <SmartGuidancePanel dashboardData={dashboardData} transactions={transactions} />
              </AccordionSection>
            )}

            {/* 2. REMINDERS & DUE TIMELINE TAB */}
            {activeTab === 'reminders' && (
              <AccordionSection
                title="Due Timeline & Upcoming Payments"
                subtitle="Subscriptions, credit card bills, and loans"
                icon={BellRing}
                defaultOpen={true}
              >
                <BillRemindersSection
                  creditCards={dashboardData.accounts.breakdown.CREDIT_CARD}
                  subscriptions={dashboardData.recurring.upcomingSubscriptions}
                  debts={dashboardData.debts.activeDebts}
                  onPayCreditCard={handlePayCreditCard}
                  onPaySubscription={() => setActiveTab('subscriptions')}
                  onPayDebt={() => setActiveTab('debts')}
                />
              </AccordionSection>
            )}

            {/* 3. TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <AccordionSection
                title="Financial Ledger & Transactions"
                subtitle="All income, expense, and transfer records"
                icon={ReceiptText}
                badge={`${ledgerTransactionCount} Records`}
                defaultOpen={true}
              >
                <TransactionsSection
                  transactions={ledgerTransactions}
                  categories={categories}
                  accounts={accounts}
                  selectedMonth={ledgerMonth}
                  onSelectedMonthChange={setLedgerMonth}
                  onFilterChange={handleFilterChange}
                  onEditTransaction={(tx) => handleOpenAddModal(tx)}
                  onDeleteTransaction={handleDeleteTransaction}
                  onExportCSV={() => setIsExportModalOpen(true)}
                  onExportPDF={() => setIsExportModalOpen(true)}
                />
              </AccordionSection>
            )}

            {/* 4. ACCOUNTS TAB */}
            {activeTab === 'accounts' && (
              <AccordionSection
                title="Bank Accounts & Cards Overview"
                subtitle="Liquid bank accounts, UPI, Cash & Credit Cards"
                icon={Landmark}
                defaultOpen={true}
              >
                <AccountsSection accounts={dashboardData.accounts} transactions={transactions} />
              </AccordionSection>
            )}

            {/* 5. DEBTS & LOANS TAB */}
            {activeTab === 'debts' && (
              <AccordionSection
                title="Debts & Loans Management"
                subtitle="Money lent to others & money borrowed from friends/banks"
                icon={HandCoins}
                badge={dashboardData.debts.activeDebtsCount}
                badgeColor="bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                defaultOpen={true}
              >
                <DebtsSection debts={dashboardData.debts} accounts={accounts} onRefresh={() => fetchAllData()} />
              </AccordionSection>
            )}

            {/* 6. SUBSCRIPTIONS TAB */}
            {activeTab === 'subscriptions' && (
              <AccordionSection
                title="Recurring Subscriptions & Memberships"
                subtitle="Monthly & annual automated bill tracking"
                icon={Repeat}
                defaultOpen={true}
              >
                <RecurringSection
                  recurring={dashboardData.recurring}
                  debts={dashboardData.debts.activeDebts}
                  onAddSubscription={() => setIsSubscriptionModalOpen(true)}
                  onManageDebt={() => setActiveTab('debts')}
                  onRefresh={() => fetchAllData()}
                />
              </AccordionSection>
            )}

            {/* 7. BUDGETS TAB */}
            {activeTab === 'budgets' && (
              <BudgetsSection
                categories={categories}
                budgets={budgets}
                onRefresh={() => fetchAllData()}
              />
            )}

            {/* 8. GOALS TAB */}
            {activeTab === 'goals' && (
              <GoalsSection
                goals={goals}
                onRefresh={() => fetchAllData()}
              />
            )}

            {/* 9. FORECAST TAB */}
            {activeTab === 'forecast' && (
              <AccordionSection
                title="Month-End Spend Forecast"
                subtitle="AI-projected spending pace, savings outlook & budgets at risk"
                icon={Gauge}
                defaultOpen={true}
              >
                <SpendForecastCard forecast={dashboardData.forecast} />
              </AccordionSection>
            )}

            {/* 10. AI ASSISTANT TAB */}
            {activeTab === 'financial-hub' && (
              <FinancialIntelligenceHub transactions={transactions} accounts={accounts} dashboardData={dashboardData} />
            )}

            {/* 11. AI ASSISTANT TAB */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <AIAssistantChat />
                <details className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block text-sm font-semibold text-white">Personalization & insights</span>
                      <span className="mt-0.5 block text-xs text-slate-400">Set your financial targets and review tailored guidance</span>
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-cyan-300 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-slate-800 p-4"><AIPersonalizationSection /></div>
                </details>
              </div>
            )}
          </div>
        ) : null}
      </main>
      </Suspense>

      {/* Footer */}
      <footer className="hidden border-t border-slate-800/80 bg-slate-950/90 py-6 text-center text-xs text-slate-500 backdrop-blur-sm md:block">
        <p>FinTrack Personal Financial System — Developed by Hamzah</p>
      </footer>

      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[55] md:hidden" role="dialog" aria-modal="true" aria-labelledby="more-menu-title">
          <button className="absolute inset-0 bg-slate-950/70" aria-label="Close more menu" onClick={() => setIsMoreMenuOpen(false)} />
          <section className="absolute inset-x-2 bottom-20 rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-2xl shadow-slate-950/60">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">More tools</p>
                <h2 id="more-menu-title" className="text-lg font-semibold text-white">Manage your money</h2>
              </div>
              <button onClick={() => setIsMoreMenuOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close more menu"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setIsMoreMenuOpen(false); setIsAffordModalOpen(true); }} className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 text-left text-slate-200 transition-colors hover:bg-slate-800">
                <HelpCircle className="h-5 w-5 shrink-0 text-amber-300" />
                <span className="min-w-0"><span className="block text-sm font-semibold leading-tight">Can I afford this?</span><span className="mt-1 block text-[10px] text-slate-400">Check a purchase</span></span>
              </button>
              <button onClick={() => { setIsMoreMenuOpen(false); setIsTimeMachineModalOpen(true); }} className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 text-left text-slate-200 transition-colors hover:bg-slate-800">
                <History className="h-5 w-5 shrink-0 text-fuchsia-300" />
                <span className="min-w-0"><span className="block text-sm font-semibold leading-tight">Time machine</span><span className="mt-1 block text-[10px] text-slate-400">Explore scenarios</span></span>
              </button>
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return <button key={item.id} onClick={() => navigateMobile(item.id)} className={`relative flex min-h-[72px] items-center gap-3 rounded-2xl border px-3 text-left transition-colors ${isActive ? 'border-cyan-400/50 bg-cyan-400/15 text-white' : 'border-slate-800 bg-slate-950/50 text-slate-200 hover:bg-slate-800'}`}>
                  <Icon className="h-5 w-5 shrink-0 text-cyan-300" />
                  <span className="min-w-0"><span className="block text-sm font-semibold leading-tight">{item.label}</span><span className="mt-1 block text-[10px] text-slate-400">{item.caption}</span></span>
                  {item.badge ? <span className="absolute right-2 top-2 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950">{item.badge}</span> : null}
                </button>;
              })}
            </div>
          </section>
        </div>
      )}

      <nav className="mobile-tabbar fixed inset-x-2 bottom-2 z-50 rounded-2xl border border-slate-700/70 bg-slate-900/95 px-1.5 py-1.5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-0.5">
          {mobilePrimaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navigateMobile(item.id)}
                className={`mobile-tab-btn relative flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 transition-colors ${
                  isActive ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400 hover:bg-slate-800/85'
                }`}
                aria-label={item.label}
                aria-pressed={isActive}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-[11px] font-semibold leading-none">{item.id === 'overview' ? 'Home' : item.id === 'goals' ? 'Goals' : item.id === 'smart-guidance' ? 'Plan' : 'Ask AI'}</span>
                {item.badge ? <span className="absolute right-1 top-1 rounded-full bg-emerald-400 px-1 py-0.5 text-[9px] font-bold text-emerald-950">{item.badge}</span> : null}
              </button>
            );
          })}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={`mobile-tab-btn relative flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 transition-colors ${!activeMobilePrimary ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400 hover:bg-slate-800/85'}`}
            aria-label="More destinations"
            aria-expanded={isMoreMenuOpen}
          >
            <Menu className="h-[18px] w-[18px]" />
            <span className="text-[11px] font-semibold leading-none">More</span>
          </button>
        </div>
      </nav>

      <Suspense fallback={null}>
      {dashboardData && <MetricDetailsModal
        isOpen={mobileMetricDetails !== null}
        onClose={() => setMobileMetricDetails(null)}
        type={mobileMetricDetails}
        summary={dashboardData.summary}
        monthlyTrends={dashboardData.monthlyTrends || []}
        transactions={transactions}
      />}
      {/* Add / Edit Transaction Modal */}
      {isModalOpen && <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => undefined}
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        onSubmitTransaction={handleSaveTransaction}
        onOpenDebtModal={() => setIsDebtModalOpen(true)}
        editingTransaction={editingTransaction}
      />}

      {/* Add Debt / Loan Modal */}
      {isDebtModalOpen && <AddDebtModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        onSuccess={() => fetchAllData()}
        accounts={accounts}
      />}

      {/* Add Subscription Modal */}
      {isSubscriptionModalOpen && <AddSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSuccess={() => fetchAllData()}
        accounts={accounts}
        categories={categories}
      />}

      {/* "Can I Afford This?" Affordability Modal */}
      {isAffordModalOpen && <CanIAffordThisModal
        isOpen={isAffordModalOpen}
        onClose={() => setIsAffordModalOpen(false)}
        dashboardData={dashboardData}
      />}

      {/* Financial Time Machine Future Simulator Modal */}
      {isTimeMachineModalOpen && <TimeMachineModal
        isOpen={isTimeMachineModalOpen}
        onClose={() => setIsTimeMachineModalOpen(false)}
        dashboardData={dashboardData}
      />}
      </Suspense>

      {/* Right-Side Utility Dock (Calculator, Privacy Shield, Daily Cap, Runway, Power BI Hub) */}
      <UtilityDock
        dashboardData={dashboardData}
        categories={categories}
        onExportPowerBI={() => exportPowerBIDataset(transactions, dashboardData)}
      />

      {isExportModalOpen && (
        <ExportPeriodModal
          transactions={transactions}
          onClose={() => setIsExportModalOpen(false)}
          onExportCSV={(selectedTransactions, periodLabel) => {
            const filenamePeriod = periodLabel.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
            exportTransactionsToCSV(selectedTransactions, `FinTrack_Transactions_${filenamePeriod}.csv`);
          }}
          onExportPDF={async (selectedTransactions, periodLabel, password) => {
            if (!currentUser?.username) throw new Error('Your session has expired. Please sign in again.');
            try {
              await api.login({ username: currentUser.username, password });
            } catch (error) {
              const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : 'Unable to verify your password.';
              throw new Error(message);
            }
            printPDFReport(selectedTransactions, periodLabel);
          }}
          onEmailPDF={async (input) => {
            try {
              await api.emailReport(input);
              addToast(`PDF report sent to ${input.email}`, 'success');
            } catch (error) {
              const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : 'Unable to send the PDF report.';
              addToast(message, 'error');
              throw new Error(message);
            }
          }}
        />
      )}

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default App;
