import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { SpendingSection } from './components/SpendingSection';
import { DailySpendingSection } from './components/DailySpendingSection';
import { TrendsSection } from './components/TrendsSection';
import { RunwaySimulatorCard } from './components/RunwaySimulatorCard';
import { AccountsSection } from './components/AccountsSection';
import { RecurringSection } from './components/RecurringSection';
import { DebtsSection } from './components/DebtsSection';
import { TransactionsSection } from './components/TransactionsSection';
import { AIInsightsPlaceholder } from './components/AIInsightsPlaceholder';
import { AIAssistantChat } from './components/AIAssistantChat';
import { AIPersonalizationSection } from './components/AIPersonalizationSection';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AddDebtModal } from './components/AddDebtModal';
import { AddSubscriptionModal } from './components/AddSubscriptionModal';
import { BillRemindersSection } from './components/BillRemindersSection';
import { CanIAffordThisModal } from './components/CanIAffordThisModal';
import { TimeMachineModal } from './components/TimeMachineModal';
import { UtilityDock } from './components/UtilityDock';
import { LoginScreen } from './components/LoginScreen';
import { AccordionSection } from './components/AccordionSection';
import { ToastContainer } from './components/ToastContainer';
import { BudgetsSection } from './components/BudgetsSection';
import { GoalsSection } from './components/GoalsSection';
import { DashboardBudgetsAndGoals } from './components/DashboardBudgetsAndGoals';
import { SpendForecastCard } from './components/SpendForecastCard';
import { SmartGuidancePanel } from './components/SmartGuidancePanel';
import { useToast } from './utils/toastStore';
import { api } from './api/client';
import { exportTransactionsToCSV, printPDFReport, exportPowerBIDataset } from './utils/exportUtils';
import { DashboardData, Transaction, Category, Account, TransactionFilters, Budget, Goal } from './types';
import { AlertCircle, RefreshCw, LayoutDashboard, ReceiptText, Landmark, HandCoins, Repeat, Sparkles, BellRing, HelpCircle, History, Target, PieChart, Flag, Gauge } from 'lucide-react';

type DashboardTab = 'overview' | 'smart-guidance' | 'reminders' | 'transactions' | 'accounts' | 'debts' | 'subscriptions' | 'budgets' | 'goals' | 'forecast' | 'ai';

export const App: React.FC = () => {
  const { addToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; name?: string } | null>(null);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledgerTransactions, setLedgerTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isAffordModalOpen, setIsAffordModalOpen] = useState<boolean>(false);
  const [isTimeMachineModalOpen, setIsTimeMachineModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | Partial<Transaction> | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
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
  const displayName = currentUser?.name || currentUser?.username || 'there';
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('fintrack_theme_mode', 'dark');
  }, []);

  // Verify stored session on mount
  useEffect(() => {
    const token = localStorage.getItem('fintrack_auth_token');
    const storedUser = localStorage.getItem('fintrack_user');

    if (token) {
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch {}
      }

      api
        .getMe()
        .then((data) => {
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          setAuthChecking(false);
          fetchAllData();
        })
        .catch(() => {
          localStorage.removeItem('fintrack_auth_token');
          localStorage.removeItem('fintrack_user');
          setIsAuthenticated(false);
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

      setDashboardData(dash);
      setTransactions(txs);
      setLedgerTransactions(txs);
      setCategories(cats);
      setAccounts(accs);
      setBudgets(budgetsData || []);
      setGoals(goalsData || []);

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
    try {
      if (id) {
        await api.updateTransaction(id, data);
        addToast('Transaction updated successfully', 'success');
      } else {
        await api.createTransaction(data);
        addToast('Transaction saved successfully', 'success');
      }
      setEditingTransaction(null);
    } catch (error: any) {
      addToast(error?.response?.data?.message || error?.message || 'Failed to save transaction', 'error');
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction? Account balances will be reverted.')) {
      try {
        await api.deleteTransaction(id);
        fetchAllData();
      } catch (err) {
        console.error(err);
      }
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
    { id: 'ai', label: 'Ask FinTrack', caption: 'Personal money guide', icon: Sparkles, color: 'fuchsia' },
  ];
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
        onExportCSV={() => exportTransactionsToCSV(transactions)}
        onExportPDF={() => dashboardData && printPDFReport(dashboardData, transactions)}
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
      <main className="dashboard-main dashboard-enter flex-1 max-w-[96rem] w-full mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 pb-32 md:pb-8 space-y-6 sm:space-y-8">
        <section className="hero-banner relative overflow-hidden rounded-[2rem] border border-slate-700/70 bg-slate-900/85 p-5 shadow-2xl shadow-slate-950/35 backdrop-blur-sm sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-400/25 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-14 h-64 w-64 rounded-full bg-gradient-to-tr from-orange-400/25 to-transparent blur-2xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300/90">Financial command center</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {dayGreeting}, {displayName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-[15px]">
                {todayLabel} at a glance. Track cashflow, prioritize due items, and take the next best action quickly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:gap-3">
              <div className="hero-metric-card rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/90">Due now</p>
                <p className="mt-1 text-lg font-semibold text-cyan-100">{dueTimelineCount}</p>
              </div>
              <div className="hero-metric-card rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/90">This month</p>
                <p className="mt-1 text-lg font-semibold text-emerald-100">{ledgerTransactionCount}</p>
              </div>
              <button
                onClick={() => setIsAffordModalOpen(true)}
                className="hero-action-btn rounded-2xl border border-amber-300/35 bg-amber-400/10 px-3 py-2.5 text-left text-amber-200 transition-colors hover:bg-amber-400/20"
              >
                <p className="text-[10px] uppercase tracking-[0.16em]">Quick check</p>
                <p className="mt-1 text-sm font-semibold">Can I afford this?</p>
              </button>
              <button
                onClick={() => setIsTimeMachineModalOpen(true)}
                className="hero-action-btn rounded-2xl border border-fuchsia-300/35 bg-fuchsia-400/10 px-3 py-2.5 text-left text-fuchsia-200 transition-colors hover:bg-fuchsia-400/20"
              >
                <p className="text-[10px] uppercase tracking-[0.16em]">Scenario plan</p>
                <p className="mt-1 text-sm font-semibold">Open time machine</p>
              </button>
            </div>
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
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
            {/* 1. TOP SUMMARY CARDS (Accordion Section) */}
            <AccordionSection
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

            {/* 2. MONEY COCKPIT NAVIGATION */}
            <section
              className="dashboard-cockpit hidden md:block relative overflow-hidden rounded-[1.75rem] border border-slate-700/70 bg-gradient-to-br from-slate-900/95 via-slate-900 to-slate-950 p-4 shadow-2xl shadow-slate-950/40 sm:p-5"
            >
              <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[24px] border-blue-500/10" />
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
              <div className="space-y-6">
                <AccordionSection
                  title="Monthly Spending Analytics"
                  subtitle="Category breakdown & payment method distribution"
                  icon={ReceiptText}
                  defaultOpen={true}
                >
                  <SpendingSection
                    spendingThisMonth={dashboardData.summary.spendingThisMonth}
                    spendingByCategory={dashboardData.spendingByCategory}
                    spendingByPaymentMethod={dashboardData.spendingByPaymentMethod}
                    totalIncome={dashboardData.summary.totalIncome}
                    totalExpenses={dashboardData.summary.totalExpenses}
                    incomeThisMonth={dashboardData.summary.incomeThisMonth}
                    savingsThisMonth={dashboardData.summary.savingsThisMonth}
                    monthlyTrends={dashboardData.monthlyTrends}
                    transactions={transactions}
                  />
                </AccordionSection>

                <AccordionSection
                  title="Upcoming Dues & Bill Reminders"
                  subtitle="Credit cards, active debts & subscription renewals"
                  icon={BellRing}
                  badge={dashboardData.recurring.upcomingSubscriptions.length + dashboardData.debts.activeDebts.length}
                  badgeColor="bg-amber-500/10 text-amber-300 border-amber-500/20"
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

                <AccordionSection
                  title="Daily Spending Activity"
                  subtitle="Day-by-day expenses for the selected month"
                  icon={ReceiptText}
                  defaultOpen={true}
                >
                  <DailySpendingSection
                    transactions={transactions}
                    onAddTransactionForDate={(dateStr) => {
                      setEditingTransaction({ transactionDate: dateStr, type: 'EXPENSE' });
                      setIsModalOpen(true);
                    }}
                  />
                </AccordionSection>

                <AccordionSection
                  title="6-Month Financial Trends"
                  subtitle="Historical income vs expense vs net savings trends"
                  icon={Sparkles}
                  defaultOpen={true}
                >
                  <TrendsSection monthlyTrends={dashboardData.monthlyTrends} />
                </AccordionSection>

                <AccordionSection
                  title="Cashflow Runway Simulator"
                  subtitle="Model 3-24 month balance scenarios with salary, rent, and EMI changes"
                  icon={Gauge}
                  defaultOpen={false}
                >
                  <RunwaySimulatorCard />
                </AccordionSection>
              </div>
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
                  onExportPDF={() => dashboardData && printPDFReport(dashboardData, transactions)}
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
                  onAddSubscription={() => setIsSubscriptionModalOpen(true)}
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
            {activeTab === 'ai' && (
              <AccordionSection
                title="FinTrack AI Financial Guide"
                subtitle="Instant answers, spending analysis & affordability checks"
                icon={Sparkles}
                defaultOpen={true}
              >
                <div className="space-y-6">
                  <AIPersonalizationSection />
                  <AIAssistantChat />
                </div>
              </AccordionSection>
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-6 text-center text-xs text-slate-500 backdrop-blur-sm">
        <p>FinTrack Personal Financial System — Developed by Hamzah</p>
      </footer>

      <nav className="mobile-tabbar fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-slate-700/70 bg-slate-900/95 px-2 py-2 shadow-2xl shadow-slate-950/40 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navigationItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`mobile-tab-btn relative flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                  isActive ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400 hover:bg-slate-800/85'
                }`}
                aria-label={item.label}
                aria-pressed={isActive}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-semibold leading-none">{item.label.split(' ')[0]}</span>
                {item.badge ? <span className="absolute right-1.5 top-1 rounded-full bg-emerald-400 px-1 py-0.5 text-[9px] font-bold text-emerald-950">{item.badge}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-1">
          {navigationItems.slice(5).map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`truncate rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                  isActive ? 'bg-sky-400/20 text-sky-200' : 'text-slate-400 hover:bg-slate-800/80'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => fetchAllData()}
        accounts={accounts}
        categories={categories}
        onSubmitTransaction={handleSaveTransaction}
        onOpenDebtModal={() => setIsDebtModalOpen(true)}
        editingTransaction={editingTransaction}
      />

      {/* Add Debt / Loan Modal */}
      <AddDebtModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        onSuccess={() => fetchAllData()}
        accounts={accounts}
      />

      {/* Add Subscription Modal */}
      <AddSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSuccess={() => fetchAllData()}
        accounts={accounts}
        categories={categories}
      />

      {/* "Can I Afford This?" Affordability Modal */}
      <CanIAffordThisModal
        isOpen={isAffordModalOpen}
        onClose={() => setIsAffordModalOpen(false)}
        dashboardData={dashboardData}
      />

      {/* Financial Time Machine Future Simulator Modal */}
      <TimeMachineModal
        isOpen={isTimeMachineModalOpen}
        onClose={() => setIsTimeMachineModalOpen(false)}
        dashboardData={dashboardData}
      />

      {/* Right-Side Utility Dock (Calculator, Privacy Shield, Daily Cap, Runway, Power BI Hub) */}
      <UtilityDock
        dashboardData={dashboardData}
        categories={categories}
        onExportPowerBI={() => exportPowerBIDataset(transactions, dashboardData)}
      />

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default App;
