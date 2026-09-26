import axios from 'axios';
import { DashboardData, Transaction, Account, Category, Subscription, Debt, QuickItem, QuickItemType, QuickItemPriority, TransactionFilters, ParsedReceipt, RunwaySimulationResponse } from '../types';
import { resolveApiOrigin } from './config';

export const API_TIMEOUT_MS = 25000;

const apiClient = axios.create({
  timeout: API_TIMEOUT_MS,
});

const API_ORIGIN = resolveApiOrigin();
const API_BASE = `${API_ORIGIN}/api/v1`;

// Attach authorization header automatically if logged in
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('fintrack_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isTimeout = error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
    const isNetworkError = !error?.response && /network|fetch|failed|timeout/i.test(error?.message || '');

    if (isTimeout || isNetworkError) {
      const coldStartError = new Error('The backend is waking up. Please retry in a few seconds.');
      (coldStartError as Error & { isColdStart?: boolean }).isColdStart = true;
      return Promise.reject(coldStartError);
    }

    return Promise.reject(error);
  }
);

export const api = {
  // Authentication
  login: async (credentials: { username: string; password: string }) => {
    const res = await apiClient.post(`${API_BASE}/auth/login`, credentials);
    return res.data.data;
  },

  register: async (data: { username: string; password: string; name?: string }) => {
    const res = await apiClient.post(`${API_BASE}/auth/register`, data);
    return res.data.data;
  },

  getMe: async () => {
    const res = await apiClient.get(`${API_BASE}/auth/me`);
    return res.data.data;
  },

  // Quick notes, todos, and reminders
  getQuickItems: async (): Promise<QuickItem[]> => {
    const res = await apiClient.get(`${API_BASE}/quick-items`);
    return res.data.data;
  },

  createQuickItem: async (data: { type: QuickItemType; title: string; details?: string; price?: number; category?: string; priority?: QuickItemPriority; dueDate?: string }): Promise<QuickItem> => {
    const res = await apiClient.post(`${API_BASE}/quick-items`, data);
    return res.data.data;
  },

  updateQuickItem: async (id: string, data: Partial<QuickItem>): Promise<QuickItem> => {
    const res = await apiClient.patch(`${API_BASE}/quick-items/${id}`, data);
    return res.data.data;
  },

  deleteQuickItem: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE}/quick-items/${id}`);
  },

  // Dashboard & Analytics
  getDashboard: async (): Promise<DashboardData> => {
    const res = await apiClient.get(`${API_BASE}/analytics/dashboard`);
    return res.data.data;
  },

  getForecast: async () => {
    const res = await apiClient.get(`${API_BASE}/analytics/forecast`);
    return res.data.data;
  },

  getRunwaySimulation: async (payload: {
    months: number;
    salaryChangePercent: number;
    rentChangePercent: number;
    cancelSubscriptionsCount: number;
    extraMonthlyEmi: number;
  }): Promise<RunwaySimulationResponse> => {
    const res = await apiClient.post(`${API_BASE}/analytics/runway-simulation`, payload);
    return res.data.data;
  },

  getFinancialProfile: async () => {
    const res = await apiClient.get(`${API_BASE}/profile`);
    return res.data.data;
  },

  updateFinancialProfile: async (data: Record<string, number>) => {
    const res = await apiClient.patch(`${API_BASE}/profile`, data);
    return res.data.data;
  },

  saveInsightFeedback: async (insightId: string, isUseful: boolean) => {
    await apiClient.post(`${API_BASE}/analytics/insights/${insightId}/feedback`, { isUseful });
  },

  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    const res = await apiClient.get(`${API_BASE}/accounts`);
    return res.data.data;
  },

  // Credit Cards
  getCreditCards: async (): Promise<Account[]> => {
    const res = await apiClient.get(`${API_BASE}/credit-cards`);
    return res.data.data;
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const res = await apiClient.get(`${API_BASE}/categories`);
    return res.data.data;
  },

  // Subscriptions
  getSubscriptions: async (): Promise<Subscription[]> => {
    const res = await apiClient.get(`${API_BASE}/subscriptions`);
    return res.data.data;
  },

  getUpcomingSubscriptions: async (): Promise<Subscription[]> => {
    const res = await apiClient.get(`${API_BASE}/subscriptions/upcoming`);
    return res.data.data;
  },

  // Debts (Owed to me / I owe)
  getDebts: async (): Promise<Debt[]> => {
    const res = await apiClient.get(`${API_BASE}/debts`);
    return res.data.data;
  },

  createDebt: async (data: Partial<Debt> & { accountId?: string }): Promise<Debt> => {
    const res = await apiClient.post(`${API_BASE}/debts`, data);
    return res.data.data;
  },

  updateDebt: async (id: string, data: Partial<Debt>): Promise<Debt> => {
    const res = await apiClient.patch(`${API_BASE}/debts/${id}`, data);
    return res.data.data;
  },

  settleDebt: async (id: string, amountToSettle: number, accountId?: string): Promise<Debt> => {
    const res = await apiClient.post(`${API_BASE}/debts/${id}/settle`, { amountToSettle, accountId });
    return res.data.data;
  },

  deleteDebt: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE}/debts/${id}`);
  },

  // Transactions
  getTransactions: async (filters?: TransactionFilters): Promise<Transaction[]> => {
    const res = await apiClient.get(`${API_BASE}/transactions`, { params: filters });
    return res.data.data;
  },

  createTransaction: async (data: Partial<Transaction>): Promise<Transaction> => {
    const res = await apiClient.post(`${API_BASE}/transactions`, data);
    return res.data.data;
  },

  updateTransaction: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    const res = await apiClient.put(`${API_BASE}/transactions/${id}`, data);
    return res.data.data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE}/transactions/${id}`);
  },

  parseReceipt: async (data: { imageBase64: string; mimeType?: string }): Promise<ParsedReceipt> => {
    const res = await apiClient.post(`${API_BASE}/receipts/parse`, data);
    return res.data.data;
  },

  createAccount: async (data: Partial<Account>): Promise<Account> => {
    const res = await apiClient.post(`${API_BASE}/accounts`, data);
    return res.data.data;
  },

  // Budgets
  getBudgets: async () => {
    const res = await apiClient.get(`${API_BASE}/budgets`);
    return res.data.data;
  },

  getBudgetById: async (id: string) => {
    const res = await apiClient.get(`${API_BASE}/budgets/${id}`);
    return res.data.data;
  },

  getBudgetStatus: async (id: string) => {
    const res = await apiClient.get(`${API_BASE}/budgets/status/${id}`);
    return res.data.data;
  },

  createBudget: async (data: any) => {
    const res = await apiClient.post(`${API_BASE}/budgets`, data);
    return res.data.data;
  },

  updateBudget: async (id: string, data: any) => {
    const res = await apiClient.patch(`${API_BASE}/budgets/${id}`, data);
    return res.data.data;
  },

  deleteBudget: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE}/budgets/${id}`);
  },

  // Goals
  getGoals: async () => {
    const res = await apiClient.get(`${API_BASE}/goals`);
    return res.data.data;
  },

  getActiveGoals: async () => {
    const res = await apiClient.get(`${API_BASE}/goals/active`);
    return res.data.data;
  },

  getGoalById: async (id: string) => {
    const res = await apiClient.get(`${API_BASE}/goals/${id}`);
    return res.data.data;
  },

  createGoal: async (data: any) => {
    const res = await apiClient.post(`${API_BASE}/goals`, data);
    return res.data.data;
  },

  updateGoal: async (id: string, data: any) => {
    const res = await apiClient.patch(`${API_BASE}/goals/${id}`, data);
    return res.data.data;
  },

  updateGoalProgress: async (id: string, currentAmount: number) => {
    const res = await apiClient.post(`${API_BASE}/goals/${id}/progress`, { currentAmount });
    return res.data.data;
  },

  incrementGoalProgress: async (id: string, amount: number) => {
    const res = await apiClient.post(`${API_BASE}/goals/${id}/increment`, { amount });
    return res.data.data;
  },

  completeGoal: async (id: string) => {
    const res = await apiClient.post(`${API_BASE}/goals/${id}/complete`);
    return res.data.data;
  },

  pauseGoal: async (id: string) => {
    const res = await apiClient.post(`${API_BASE}/goals/${id}/pause`);
    return res.data.data;
  },

  resumeGoal: async (id: string) => {
    const res = await apiClient.post(`${API_BASE}/goals/${id}/resume`);
    return res.data.data;
  },

  deleteGoal: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE}/goals/${id}`);
  },
};
