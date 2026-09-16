import { FinancialToolRegistry } from '../tools/financialToolRegistry';

export type QueryMode = 'RETRIEVE' | 'CALCULATE' | 'ANALYZE' | 'PLAN' | 'RECOMMEND' | 'SCENARIO' | 'KNOWLEDGE' | 'EXTERNAL_RESEARCH';
export type FinancialSubject = 'SPENDING' | 'INCOME' | 'SAVINGS' | 'DEBT' | 'RECEIVABLES' | 'BALANCE' | 'SUBSCRIPTIONS' | 'INVESTMENTS' | 'CREDIT_CARD' | 'CATEGORY' | 'MERCHANT' | 'UNKNOWN';

export interface FinancialQueryContract {
  mode: QueryMode;
  subject: FinancialSubject;
  operation: 'TOTAL' | 'TREND' | 'COMPARE' | 'LIST' | 'DETAIL' | 'RATE' | 'TARGET' | 'ADVICE' | 'SCENARIO' | 'UNKNOWN';
  month?: number;
  year?: number;
  merchant?: string;
  category?: string;
  amount?: number;
  rawQuery: string;
}

export interface DirectQueryResult {
  contract: FinancialQueryContract;
  answer: string;
  data: any;
  toolUsed: string;
  toolCallsExecuted: Array<{ toolName: string; toolParams?: Record<string, any> }>;
}

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9,
  sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

const CATEGORY_TERMS = [
  'rent', 'housing', 'food', 'dining', 'groceries', 'grocery', 'transport', 'fuel',
  'train', 'rail', 'flight', 'airfare',
  'shopping', 'entertainment', 'medical', 'health', 'education', 'utilities', 'utility',
  'loan', 'travel', 'insurance', 'subscription',
];

function money(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function clean(text: string): string {
  return text.toLowerCase().replace(/[,?!.₹]/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseAmount(text: string): number | undefined {
  const q = text.toLowerCase().replace(/,/g, '');
  const lakh = q.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)/);
  if (lakh) return Number(lakh[1]) * 100000;
  const thousand = q.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (thousand) return Number(thousand[1]) * 1000;
  const rupees = q.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/i);
  return rupees ? Number(rupees[1]) : undefined;
}

function parsePeriod(query: string): { month?: number; year?: number } {
  const q = clean(query);
  const now = new Date();
  let month: number | undefined;
  let year: number | undefined;
  for (const [name, value] of Object.entries(MONTHS)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(q)) { month = value; break; }
  }
  const yearMatch = q.match(/\b(20\d{2})\b/);
  if (yearMatch) year = Number(yearMatch[1]);
  if (month && !year) year = now.getFullYear();
  if (/\bthis month\b|\bcurrent month\b/.test(q)) { month = now.getMonth() + 1; year = now.getFullYear(); }
  if (/\blast month\b|\bprevious month\b/.test(q)) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); month = d.getMonth() + 1; year = d.getFullYear();
  }
  return { month, year };
}

function extractQuotedEntity(query: string, prefixes: string[]): string | undefined {
  const escaped = prefixes.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = query.match(new RegExp(`(?:${escaped})\\s+(?:on|at|from|for|to)?\\s*([^?.,]+?)(?:\\s+(?:this|last|in)\\b|\\?|$)`, 'i'));
  return match?.[1]?.trim();
}

export function interpretFinancialQuery(query: string): FinancialQueryContract {
  const q = clean(query);
  const period = parsePeriod(query);
  const amount = parseAmount(query);

  const has = (...terms: string[]) => terms.some(t => q.includes(t));

  // Retrieval/fact questions are classified before recommendation/planning words.
  // This prevents "how much", "show", "what", etc. from falling into generic reasoning.
  if (has('how much', 'what is', 'what was', 'show', 'list', 'who', 'tell me')) {
    if (has('owe me', 'owed to me', 'people owe', 'money people owe', 'receivable', 'receivables')) {
      return { mode: 'RETRIEVE', subject: 'RECEIVABLES', operation: 'TOTAL', rawQuery: query };
    }
    if (has('i owe', 'i owe others', 'my debt', 'debts', 'loan outstanding', 'owe others')) {
      return { mode: 'RETRIEVE', subject: 'DEBT', operation: 'TOTAL', rawQuery: query };
    }
    if (has('saved', 'savings', 'save')) {
      const operation = has('trend', 'history', 'over time', 'changed', 'change') ? 'TREND' : 'TOTAL';
      return { mode: 'RETRIEVE', subject: 'SAVINGS', operation, ...period, rawQuery: query };
    }
    if (has('earned', 'income', 'salary', 'earning')) {
      const operation = has('trend', 'history', 'over time') ? 'TREND' : 'TOTAL';
      return { mode: 'RETRIEVE', subject: 'INCOME', operation, ...period, rawQuery: query };
    }
    if (has('spent', 'spend', 'expense', 'expenses', 'sent', 'paid')) {
      if (has('trend', 'history', 'over time')) return { mode: 'RETRIEVE', subject: 'SPENDING', operation: 'TREND', ...period, rawQuery: query };
      const merchant = extractQuotedEntity(query, ['on', 'at', 'to']);
      const category = CATEGORY_TERMS.find(c => q.includes(c));
      if (merchant && !category) return { mode: 'RETRIEVE', subject: 'MERCHANT', operation: 'TOTAL', merchant, ...period, rawQuery: query };
      if (category) return { mode: 'RETRIEVE', subject: 'CATEGORY', operation: 'TOTAL', category, ...period, rawQuery: query };
      return { mode: 'RETRIEVE', subject: 'SPENDING', operation: 'TOTAL', ...period, rawQuery: query };
    }
    if (has('balance', 'account balance', 'cash')) return { mode: 'RETRIEVE', subject: 'BALANCE', operation: 'TOTAL', rawQuery: query };
    if (has('subscription', 'subscriptions', 'renew')) return { mode: 'RETRIEVE', subject: 'SUBSCRIPTIONS', operation: 'LIST', rawQuery: query };
    if (has('credit card', 'credit cards', 'card outstanding')) return { mode: 'RETRIEVE', subject: 'CREDIT_CARD', operation: 'TOTAL', rawQuery: query };
  }

  if (has('should i', 'can i', 'is it a good idea', 'worth it')) {
    if (has('sip', 'invest', 'investment')) return { mode: 'RECOMMEND', subject: 'INVESTMENTS', operation: 'ADVICE', amount, rawQuery: query };
    return { mode: 'RECOMMEND', subject: 'UNKNOWN', operation: 'ADVICE', amount, rawQuery: query };
  }
  if (has('how can i save', 'want to save', 'need to save', 'save per month', 'savings target')) {
    return { mode: 'PLAN', subject: 'SAVINGS', operation: 'TARGET', amount, rawQuery: query };
  }
  if (has('what if', 'if i spend', 'if my salary', 'scenario')) return { mode: 'SCENARIO', subject: 'UNKNOWN', operation: 'SCENARIO', amount, rawQuery: query };

  return { mode: 'KNOWLEDGE', subject: 'UNKNOWN', operation: 'UNKNOWN', rawQuery: query };
}

/**
 * Deterministic query layer for ledger facts. The LLM is deliberately bypassed for
 * questions whose answer can be obtained/calculated exactly from the user's ledger.
 */
export class FinancialQueryEngine {
  constructor(private readonly tools = new FinancialToolRegistry()) {}

  async tryExecute(query: string): Promise<DirectQueryResult | null> {
    const contract = interpretFinancialQuery(query);
    if (contract.mode !== 'RETRIEVE') return null;

    switch (contract.subject) {
      case 'SAVINGS': return this.savings(contract);
      case 'INCOME': return this.income(contract);
      case 'SPENDING': return this.spending(contract);
      case 'MERCHANT': return this.merchant(contract);
      case 'CATEGORY': return this.category(contract);
      case 'RECEIVABLES': return this.receivables(contract);
      case 'DEBT': return this.debts(contract);
      case 'BALANCE': return this.balance(contract);
      case 'SUBSCRIPTIONS': return this.subscriptions(contract);
      case 'CREDIT_CARD': return this.creditCard(contract);
      default: return null;
    }
  }

  private async savings(c: FinancialQueryContract): Promise<DirectQueryResult> {
    if (c.operation === 'TREND') {
      const trend = await this.tools.getSpendingTrend();
      const months = (trend.monthlyTrends || []).map((m: any) => ({
        period: m.month || m.period,
        income: Number(m.income ?? m.totalIncome ?? 0),
        expenses: Number(m.expenses ?? m.spending ?? m.totalExpenses ?? 0),
        savings: Number(m.savings ?? ((m.income ?? m.totalIncome ?? 0) - (m.expenses ?? m.spending ?? m.totalExpenses ?? 0))),
      }));
      return {
        contract: c,
        toolUsed: 'getSpendingTrend',
        toolCallsExecuted: [{ toolName: 'getSpendingTrend' }],
        data: { monthlySavings: months },
        answer: months.length ? `Here is your savings trend:\n${months.map((m: any) => `• ${m.period}: ${money(m.savings)}`).join('\n')}` : 'I do not have enough historical monthly data to show a savings trend.',
      };
    }
    const [income, expenses] = await Promise.all([
      this.tools.getMonthlyIncome(c.month, c.year),
      this.tools.getMonthlyExpenses(c.month, c.year),
    ]);
    const savings = Number((income.totalIncome - expenses.totalExpenses).toFixed(2));
    return {
      contract: c,
      toolUsed: 'calculateSavings',
      toolCallsExecuted: [
        { toolName: 'getMonthlyIncome', toolParams: { month: c.month, year: c.year } },
        { toolName: 'getMonthlyExpenses', toolParams: { month: c.month, year: c.year } },
      ],
      data: { period: income.period, income: income.totalIncome, expenses: expenses.totalExpenses, savings },
      answer: `You saved ${money(savings)} in ${income.period}. That is calculated as ${money(income.totalIncome)} income minus ${money(expenses.totalExpenses)} expenses.`,
    };
  }

  private async income(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getMonthlyIncome(c.month, c.year);
    return { contract: c, toolUsed: 'getMonthlyIncome', toolCallsExecuted: [{ toolName: 'getMonthlyIncome', toolParams: { month: c.month, year: c.year } }], data, answer: `Your income in ${data.period} was ${money(data.totalIncome)}.` };
  }

  private async spending(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getMonthlyExpenses(c.month, c.year);
    return { contract: c, toolUsed: 'getMonthlyExpenses', toolCallsExecuted: [{ toolName: 'getMonthlyExpenses', toolParams: { month: c.month, year: c.year } }], data, answer: `You spent ${money(data.totalExpenses)} in ${data.period}.` };
  }

  private async merchant(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getMerchantSpending(c.merchant || '', c.month, c.year);
    return { contract: c, toolUsed: 'getMerchantSpending', toolCallsExecuted: [{ toolName: 'getMerchantSpending', toolParams: { merchantName: c.merchant, month: c.month, year: c.year } }], data, answer: data.count ? `You spent ${money(data.totalSpent)} on ${data.merchantName} in ${data.period} across ${data.count} transaction${data.count === 1 ? '' : 's'}.` : `I couldn't find any spending for ${c.merchant} in ${data.period}.` };
  }

  private async category(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getExpensesByCategory(c.category, c.month, c.year);
    return { contract: c, toolUsed: 'getExpensesByCategory', toolCallsExecuted: [{ toolName: 'getExpensesByCategory', toolParams: { categoryName: c.category, month: c.month, year: c.year } }], data, answer: data.found ? `You spent ${money(data.totalSpent ?? 0)} on ${data.categoryName} in ${data.period}.` : `I couldn't find a matching spending category for ${c.category}.` };
  }

  private async receivables(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getDebtsSummary();
    const total = Number(data.totalOwedToMe || 0);
    const pending = (data.debts || []).filter((d: any) => d.type === 'THEY_OWE' && d.status !== 'SETTLED');
    return { contract: c, toolUsed: 'getDebtsSummary', toolCallsExecuted: [{ toolName: 'getDebtsSummary' }], data: { totalOwedToMe: total, receivables: pending }, answer: total > 0 ? `People currently owe you ${money(total)}.` : 'No one currently owes you money according to your recorded debt records.' };
  }

  private async debts(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getDebtsSummary();
    const total = Number(data.totalIOwe || 0);
    return { contract: c, toolUsed: 'getDebtsSummary', toolCallsExecuted: [{ toolName: 'getDebtsSummary' }], data, answer: total > 0 ? `You currently owe ${money(total)} according to your recorded debt records.` : 'You currently have no outstanding amount recorded as owed by you.' };
  }

  private async balance(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getCurrentBalance();
    return { contract: c, toolUsed: 'getCurrentBalance', toolCallsExecuted: [{ toolName: 'getCurrentBalance' }], data, answer: `Your recorded current balance is ${money(data.totalBalance)}.` };
  }

  private async subscriptions(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getSubscriptionSummary();
    return { contract: c, toolUsed: 'getSubscriptionSummary', toolCallsExecuted: [{ toolName: 'getSubscriptionSummary' }], data, answer: `Your active subscriptions cost about ${money(data.totalNormalizedMonthlyCost)} per month.` };
  }

  private async creditCard(c: FinancialQueryContract): Promise<DirectQueryResult> {
    const data = await this.tools.getCreditCardAnalysis();
    return { contract: c, toolUsed: 'getCreditCardAnalysis', toolCallsExecuted: [{ toolName: 'getCreditCardAnalysis' }], data, answer: `Your recorded credit-card outstanding amount is ${money(data.totalOutstandingAmount)}.` };
  }
}
