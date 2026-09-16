import { IAIProvider, AIQueryRequest, AIOrchestrationPlan } from './aiProvider.interface';
import { prisma } from '../../config/prisma';
import { isDynamicMatch, tokenizeAndNormalize } from '../tools/financialToolRegistry';

export function parseAmount(query: string): number | undefined {
  const normalized = query.toLowerCase().replace(/,/g, '');
  const lakh = normalized.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)/);
  if (lakh) return Number(lakh[1]) * 100000;
  const thousand = normalized.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (thousand) return Number(thousand[1]) * 1000;
  const amount = normalized.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/i) || normalized.match(/\b(\d{3,8})\b/);
  return amount ? Number(amount[1]) : undefined;
}

function parseTargetAmountAndItem(query: string): { targetAmount?: number; itemName?: string; targetMonths?: number } {
  const q = query.toLowerCase();
  let targetAmount: number | undefined;
  let itemName: string | undefined;

  // Amount parsing: reuse the canonical parser so ₹3,00,000, 300000, 3 lakh and 90k behave consistently.
  targetAmount = parseAmount(query);

  // Item parsing
  const itemKeywords = [
    'laptop',
    'mobile',
    'phone',
    'car',
    'bike',
    'tv',
    'ac',
    'house',
    'flat',
    'trip',
    'watch',
    'camera',
    'iphone',
    'macbook',
    'ipad',
    'playstation',
    'ps5',
    'vehicle',
    'gold',
  ];
  for (const item of itemKeywords) {
    if (q.includes(item)) {
      itemName = item;
      break;
    }
  }

  if (!itemName) {
    const buyMatch = q.match(
      /(?:buy|purchase|get|afford)\s+(?:a|an|the)?\s*([a-z0-9\s]+?)(?:\s+of|\s+for|\s+costing|\s+worth|\s+around|\s+in|\s*,|\s*\.|\s*$)/i
    );
    if (buyMatch && buyMatch[1]) {
      const candidate = buyMatch[1].trim();
      if (candidate.length > 1 && !['a', 'an', 'the', 'some', 'any'].includes(candidate)) {
        itemName = candidate;
      }
    }
  }

  // Timeframe / months parsing. Supports both digits and natural-language numbers.
  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  };
  let targetMonths: number | undefined;
  const monthMatch = q.match(/(?:in|within|over|after|for|during)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:month|months|mth|mths)\b/i);
  if (monthMatch && monthMatch[1]) {
    targetMonths = numberWords[monthMatch[1].toLowerCase()] || parseInt(monthMatch[1], 10);
  } else {
    const yearMatch = q.match(/(?:in|within|over|after|for|during)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:year|years|yr|yrs)\b/i);
    if (yearMatch && yearMatch[1]) {
      const years = numberWords[yearMatch[1].toLowerCase()] || parseInt(yearMatch[1], 10);
      targetMonths = years * 12;
    }
  }

  return { targetAmount, itemName, targetMonths };
}

function editDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex++) {
    const current = [firstIndex];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex++) {
      const substitutionCost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + substitutionCost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[second.length];
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  'Utilities': ['utility', 'utilities', 'utilies', 'electricity', 'water', 'gas', 'wifi', 'internet', 'power', 'bill', 'bills', 'light bill', 'current bill', 'utility bill', 'utility bills'],
  'Food & Dining': ['food', 'dining', 'restaurant', 'restaurants', 'eating', 'eat', 'fooding', 'dinner', 'lunch', 'breakfast'],
  'Groceries': ['grocery', 'groceries', 'goceries', 'kirana', 'supermarket', 'zepto', 'blinkit', 'instamart'],
  'Rent & Housing': ['rent', 'housing', 'house', 'home rent', 'flat rent', 'accommodation', 'room rent'],
  'Transport': ['transport', 'transportation', 'travel', 'fuel', 'petrol', 'diesel', 'cab', 'cabs', 'auto', 'taxi', 'commute', 'uber', 'ola', 'train', 'rail', 'railway', 'flight', 'air', 'airfare', 'airline'],
  'Shopping': ['shopping', 'clothes', 'clothing', 'apparel', 'garments', 'amazon', 'flipkart', 'myntra'],
  'Entertainment': ['entertainment', 'movie', 'movies', 'cinema', 'theatre', 'gaming', 'games', 'fun', 'netflix', 'spotify'],
  'Health & Medical': ['health', 'medical', 'medicine', 'medicines', 'doctor', 'hospital', 'pharmacy', 'clinic', 'medical bill'],
  'Education Loan': ['education', 'loan', 'tuition', 'college', 'school', 'fees', 'fee', 'student loan'],
  'Salary & Income': ['salary', 'income', 'earnings', 'paycheck', 'wages'],
  'Pocket Allowance': ['pocket money', 'pocket allowance', 'allowance'],
  'Self Grooming': ['self groom', 'self grooming', 'grooming', 'shaving', 'shavings', 'haircut', 'hair cut', 'hair cutting', 'de-tan', 'detan', 'de-tanned', 'salon', 'barber', 'facial', 'massage', 'spa'],
  'Miscellaneous': ['misc', 'miscellaneous', 'other', 'others'],
};

function matchCategory(term: string, dbCategories: { name: string }[] = []): string | null {
  const normTerm = term.toLowerCase().trim();
  if (!normTerm || normTerm.length < 2) return null;

  // 1. Check direct category aliases
  for (const [catName, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      if (normTerm === alias || normTerm.includes(alias) || alias.includes(normTerm)) {
        return catName;
      }
    }
  }

  // 2. Check DB categories
  for (const cat of dbCategories) {
    const normCat = cat.name.toLowerCase();
    if (normCat === normTerm || normCat.includes(normTerm) || normTerm.includes(normCat)) {
      return cat.name;
    }
  }

  // 3. Fuzzy edit distance matching against aliases
  for (const [catName, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      if (alias.length >= 4 && normTerm.length >= 4) {
        const allowed = alias.length > 7 ? 2 : 1;
        if (editDistance(alias, normTerm) <= allowed) {
          return catName;
        }
      }
    }
  }

  // 4. Fuzzy edit distance matching against DB category names
  for (const cat of dbCategories) {
    const normCat = cat.name.toLowerCase();
    if (normCat.length >= 4 && normTerm.length >= 4) {
      const allowed = normCat.length > 7 ? 2 : 1;
      if (editDistance(normCat, normTerm) <= allowed) {
        return cat.name;
      }
    }
  }

  return null;
}

function merchantMatchScore(merchant: string, target: string): number {
  const m = merchant.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!m || !t) return -1;
  if (m === t) return 10000;
  if (m.includes(t)) return 9000;
  if (t.includes(m)) return 8500;

  const mt = tokenizeAndNormalize(m);
  const tt = tokenizeAndNormalize(t);
  let best = -1;

  for (const qToken of tt) {
    for (const mToken of mt) {
      if (mToken === qToken) best = Math.max(best, 8000);
      else if (mToken.startsWith(qToken) || qToken.startsWith(mToken)) best = Math.max(best, 7000);
      else if (qToken.length >= 4 && mToken.length >= 4) {
        const distance = editDistance(mToken, qToken);
        const allowed = Math.max(mToken.length, qToken.length) >= 8 ? 2 : 1;
        if (distance <= allowed) best = Math.max(best, 5000 - distance * 100);
      }
    }
  }
  return best;
}

function resolveBestMerchant(target: string, merchants: { merchant: string }[]): { merchant: string } | null {
  const candidates = merchants
    .map(m => ({ m, score: merchantMatchScore(m.merchant, target) }))
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  // Do not use a weak fuzzy match for a named merchant. This prevents
  // \"zomato\" from resolving to unrelated merchants such as \"Amazon Pay\".
  if (!candidates.length || candidates[0].score < 5000) return null;
  return candidates[0].m;
}

export class DeterministicAIProvider implements IAIProvider {
  async processQuery(request: AIQueryRequest): Promise<AIOrchestrationPlan> {
    const rawQ = request.query.trim();
    const q = rawQ.toLowerCase();

    const isGreeting = /^(hello|hi|hey|thanks|thank you|good morning|good evening)\b/.test(q);
    if (isGreeting) {
      return { intent: 'GENERAL_CONVERSATION', level: 1, capability: 'CONVERSATION', toolCalls: [] };
    }

    const isFinancialKnowledge =
      q.includes('compound interest') || q.includes('what is sip') || q.includes('explain sip') ||
      q.includes('difference between credit and debit');
    if (isFinancialKnowledge) {
      return { intent: 'FINANCIAL_KNOWLEDGE', level: 1, capability: 'FINANCIAL_KNOWLEDGE', toolCalls: [] };
    }

    // Load database vocabulary early. Specific ledger queries must be resolved
    // before generic queries such as "how much did I spend this month?".
    // Otherwise "how much on Zomato?" or "how much on rent this month?"
    // can be swallowed by the generic monthly-expenses rule.
    let dbCategories: { name: string }[] = [];
    let dbMerchants: { merchant: string }[] = [];
    try {
      dbCategories = await prisma.category.findMany({ select: { name: true } });
      const rawTx = await prisma.transaction.findMany({ select: { merchant: true } });
      dbMerchants = rawTx
        .filter((t): t is { merchant: string } => Boolean(t.merchant))
        .filter((t, i, arr) => arr.findIndex(x => x.merchant.toLowerCase() === t.merchant.toLowerCase()) === i);
    } catch (e) {
      // Continue with static aliases if DB vocabulary is unavailable.
    }

    const asksForSpendingAmount =
      /\b(?:how much|what did i spend|how much did i spend|total|amount)\b/i.test(q) &&
      (
        /\b(?:spent|spend|spending|expense|expenses|paid|cost|costs|money)\b/i.test(q) ||
        /\b(?:on|at|for|with)\b/i.test(q)
      );

    // Specific category/merchant spending queries have priority over all
    // generic financial fallbacks. This is a semantic data lookup, not advice.
    if (asksForSpendingAmount) {
      const targetMatch =
        q.match(/(?:how much|what amount|total|amount)(?:\s+did)?(?:\s+i)?\s*(?:spend|spent|spending|pay|paid)?\s*(?:money)?\s*(?:on|at|for|with)\s+(.+?)(?:\s+(?:this|last)\s+(?:month|week|year))?[?!.]*$/i) ||
        q.match(/(?:spend|spent|spending|paid|cost|expenses?)\s+(?:on|at|for|with)\s+(.+?)(?:\s+(?:this|last)\s+(?:month|week|year))?[?!.]*$/i);

      if (targetMatch?.[1]) {
        const target = targetMatch[1].trim().replace(/[?!.]+$/, '');
        const catMatch = matchCategory(target, dbCategories);
        if (catMatch) {
          return {
            intent: 'EXPENSE_BY_CATEGORY',
            level: 1,
            capability: 'EXPENSE_BY_CATEGORY',
            action: 'QUERY',
            object: 'EXPENSE_CATEGORY',
            questionType: 'FACT',
            entities: { category: catMatch, description: rawQ },
            toolCalls: [{ toolName: 'getExpensesByCategory', toolParams: { categoryName: catMatch } }],
          };
        }

        // Resolve the user's wording to the actual merchant stored in the ledger.
        // Resolve the user's merchant by BEST MATCH, never by the first fuzzy match.
        // Example: "zomato" must prefer "Zomato and others" over a merchant
        // such as "Amazon Pay" that happens to be edit-distance similar.
        const matchedMerchant = resolveBestMerchant(target, dbMerchants);
        if (matchedMerchant) {
          return {
            intent: 'MERCHANT_SPENDING',
            level: 1,
            capability: 'MERCHANT_SPENDING',
            action: 'QUERY',
            object: 'MERCHANT',
            questionType: 'FACT',
            entities: { itemName: matchedMerchant.merchant, description: rawQ },
            toolCalls: [{ toolName: 'getMerchantSpending', toolParams: { merchantName: matchedMerchant.merchant } }],
          };
        }

        // A named target that isn't in the DB should still use the merchant tool;
        // the tool can return zero matches instead of falling into an unrelated query.
        if (target.length > 1) {
          return {
            intent: 'MERCHANT_SPENDING',
            level: 1,
            capability: 'MERCHANT_SPENDING',
            action: 'QUERY',
            object: 'MERCHANT',
            questionType: 'FACT',
            entities: { itemName: target, description: rawQ },
            toolCalls: [{ toolName: 'getMerchantSpending', toolParams: { merchantName: target } }],
          };
        }
      }
    }

    // Only now handle the broad "how much did I spend this month?" question.
    if (/how much.*(?:spent|spend|expenses?).*this month/.test(q)) {
      return {
        intent: 'FINANCIAL_DATA_QUERY',
        level: 1,
        capability: 'MONTHLY_EXPENSES',
        requiredContext: ['CASH_FLOW'],
        toolCalls: [{ toolName: 'getMonthlyExpenses' }],
      };
    }

    if (q.includes('why did i spend more') || q.includes('why spending increased')) {
      return {
        intent: 'FINANCIAL_ANALYSIS',
        level: 2,
        capability: 'SPENDING_TREND_ANALYSIS',
        requiredContext: ['CASH_FLOW', 'CATEGORY_SPENDING', 'SPENDING_TREND'],
        toolCalls: [
          { toolName: 'getMonthlyExpenses' },
          { toolName: 'comparePeriods' },
          { toolName: 'getCategoryAnalysis' },
        ],
      };
    }

    // Savings-rate target: "I want monthly savings to be 25% of income"
    // This is a planning request, not merchant/entity search and not purchase affordability.
    const savingsRateMatch = q.match(
      /(?:save|savings|saving|set aside|put aside)[^%\d]*(\d+(?:\.\d+)?)\s*%\s*(?:of|from)\s*(?:my|the)?\s*(?:monthly\s+)?income/i
    ) || q.match(
      /(?:monthly\s+)?savings\s+(?:to|at|target(?:ed)?\s+at)\s*(\d+(?:\.\d+)?)\s*%\s*(?:of|from)\s*(?:my|the)?\s*(?:monthly\s+)?income/i
    );

    if (savingsRateMatch) {
      const targetSavingsRate = Number(savingsRateMatch[1]);
      if (targetSavingsRate > 0 && targetSavingsRate <= 100) {
        return {
          intent: 'FINANCIAL_GOAL',
          level: 4,
          capability: 'SAVINGS_RATE_PLAN',
          action: 'SAVE',
          object: 'MONEY',
          questionType: 'PLAN',
          entities: { targetSavingsRate, description: rawQ },
          requiredContext: [
            'FINANCIAL_OVERVIEW',
            'CASH_FLOW',
            'CATEGORY_SPENDING',
            'RECURRING_EXPENSES',
            'UPCOMING_OBLIGATIONS',
          ],
          toolCalls: [
            { toolName: 'getFinancialOverview' },
            { toolName: 'getCashFlowAnalysis' },
            { toolName: 'getCategoryAnalysis' },
            { toolName: 'getRecurringExpenseAnalysis' },
            { toolName: 'getUpcomingObligations' },
          ],
        };
      }
    }

    const amount = parseAmount(rawQ);
    const parsedGoal = parseTargetAmountAndItem(rawQ);

    // A monthly savings target is a distinct planning problem.
    // Example: "How can I save ₹30,000 per month?"
    // Detect it before generic advice/affordability rules.
    const monthlySavingsTargetMatch = q.match(
      /(?:save|saving|set aside|put aside|keep aside)[^\d₹]*(?:₹|rs\.?|inr)?\s*(\d+(?:[,.]\d+)?)\s*(k|thousand|lakh|lakhs)?[^\d]*(?:per month|a month|each month|every month|monthly)/i
    ) || q.match(
      /(?:how can i|how do i|how should i|i want to|i need to)\s*(?:save|saving|set aside|put aside)[^\d₹]*(?:₹|rs\.?|inr)?\s*(\d+(?:[,.]\d+)?)\s*(k|thousand|lakh|lakhs)?\s*(?:per month|a month|each month|every month|monthly)/i
    );

    const hasMonthlySavingsPhrase = /\b(per month|a month|each month|every month|monthly)\b/.test(q);
    const monthlyTargetAmount = monthlySavingsTargetMatch
      ? (() => {
          const raw = monthlySavingsTargetMatch[1].replace(/,/g, '');
          const value = Number(raw);
          const unit = (monthlySavingsTargetMatch[2] || '').toLowerCase();
          if (unit === 'k' || unit === 'thousand') return value * 1000;
          if (unit === 'lakh' || unit === 'lakhs') return value * 100000;
          return value;
        })()
      : undefined;

    if (monthlyTargetAmount !== undefined && monthlyTargetAmount > 0 && hasMonthlySavingsPhrase) {
      return {
        intent: 'FINANCIAL_GOAL',
        level: 4,
        capability: 'MONTHLY_SAVINGS_PLAN',
        action: 'SAVE',
        object: 'MONEY',
        questionType: 'PLAN',
        entities: { targetMonthlySavings: monthlyTargetAmount, amount: monthlyTargetAmount, description: rawQ },
        requiredContext: [
          'FINANCIAL_OVERVIEW',
          'CASH_FLOW',
          'CATEGORY_SPENDING',
          'RECURRING_EXPENSES',
          'UPCOMING_OBLIGATIONS',
          'DEBT_OBLIGATIONS',
        ],
        toolCalls: [
          { toolName: 'getFinancialOverview' },
          { toolName: 'getCashFlowAnalysis' },
          { toolName: 'getCategoryAnalysis' },
          { toolName: 'getRecurringExpenseAnalysis' },
          { toolName: 'getUpcomingObligations' },
          { toolName: 'getDebtsSummary' },
        ],
      };
    }

    // Goal/planning questions must be classified before generic 'should I' / purchase rules.
    // Example: 'If I want to buy a laptop in six months, how should I save?'
    const asksHowToSave = /\b(save|saving|set aside|put aside)\b/.test(q);
    const hasGoalTimeframe = parsedGoal.targetMonths !== undefined;
    const isPurchaseGoal = /\b(buy|purchase|get|afford)\b/.test(q) && hasGoalTimeframe;
    const isExplicitSavingsGoal = /\b(save|saving)\b/.test(q) && (
      hasGoalTimeframe ||
      /\b(goal|target|reach|accumulate)\b/.test(q)
    );

    if (asksHowToSave && (isPurchaseGoal || isExplicitSavingsGoal)) {
      // If amount is missing, ask for the target price rather than applying affordability rules.
      if (parsedGoal.targetAmount === undefined) {
        return {
          intent: 'FINANCIAL_GOAL',
          level: 4,
          capability: 'SAVINGS_GOAL',
          action: 'SAVE',
          object: parsedGoal.itemName || 'MONEY',
          questionType: 'PLAN',
          entities: {
            itemName: parsedGoal.itemName,
            targetMonths: parsedGoal.targetMonths,
            description: rawQ,
          },
          clarification: parsedGoal.itemName
            ? `What is the approximate price or budget for the ${parsedGoal.itemName}? I need the target amount to calculate your required monthly saving.`
            : 'What target amount are you trying to save for, and by when?',
          toolCalls: [],
        };
      }

      return {
        intent: 'FINANCIAL_GOAL',
        level: 4,
        capability: 'SAVINGS_GOAL',
        action: 'SAVE',
        object: parsedGoal.itemName || 'MONEY',
        questionType: 'PLAN',
        entities: {
          amount: parsedGoal.targetAmount,
          targetMonths: parsedGoal.targetMonths,
          description: parsedGoal.itemName || rawQ,
        },
        requiredContext: ['FINANCIAL_OVERVIEW', 'CASH_FLOW', 'UPCOMING_OBLIGATIONS'],
        toolCalls: [
          { toolName: 'getFinancialOverview' },
          { toolName: 'getCashFlowAnalysis' },
          { toolName: 'getUpcomingObligations' },
        ],
      };
    }

    // Investment / SIP decisions are recurring financial commitments, NOT one-time purchases.
    // Handle them before the generic "should I" affordability classifier.
    const isInvestmentQuestion =
      /\b(sip|systematic investment|mutual fund|mutual funds|invest|investment|investing)\b/.test(q) &&
      /\b(should i|can i|is it (good|okay|wise|fine)|would it|how much|per month|monthly|every month|a month)\b/.test(q);

    if (isInvestmentQuestion) {
      const investmentAmount = amount;
      const frequency = /\b(weekly|per week|each week)\b/.test(q)
        ? 'weekly'
        : /\b(yearly|annual|per year|each year)\b/.test(q)
          ? 'yearly'
          : 'monthly';
      const instrument = /\bsip\b/.test(q)
        ? 'SIP'
        : /\bmutual fund/.test(q)
          ? 'mutual fund'
          : 'investment';

      return {
        intent: 'FINANCIAL_DECISION',
        level: 4,
        capability: 'INVESTMENT_DECISION',
        action: 'INVEST',
        object: instrument,
        questionType: 'RECOMMENDATION',
        entities: {
          amount: investmentAmount,
          targetAmount: investmentAmount,
          frequency,
          instrument,
          description: rawQ,
        },
        requiredContext: [
          'FINANCIAL_OVERVIEW',
          'CASH_FLOW',
          'RECURRING_EXPENSES',
          'UPCOMING_OBLIGATIONS',
          'DEBT_OBLIGATIONS',
          'INVESTMENT_CONTEXT',
        ],
        toolCalls: [
          { toolName: 'getFinancialOverview' },
          { toolName: 'getCashFlowAnalysis' },
          { toolName: 'getRecurringExpenseAnalysis' },
          { toolName: 'getUpcomingObligations' },
          { toolName: 'getDebtsSummary' },
          { toolName: 'getFinancialProfile' },
          { toolName: 'getCurrentBalance' },
          { toolName: 'getSavingsAnalysis' },
        ],
      };
    }

    const isScenario = q.includes('what if') || q.includes('what happens if');
    if (isScenario) {
      return {
        intent: 'FINANCIAL_SCENARIO',
        level: 2,
        capability: 'SCENARIO_ANALYSIS',
        entities: { amount, description: rawQ },
        requiredContext: ['FINANCIAL_OVERVIEW', 'CASH_FLOW'],
        toolCalls: [
          { toolName: 'getFinancialOverview' },
          { toolName: 'getCashFlowAnalysis' },
        ],
      };
    }

    const isDecision =
      !asksHowToSave &&
      (q.includes('should i') || q.includes('can i afford') || q.includes('is it a good idea') ||
      q.includes('is it okay') || q.includes('is it fine') || q.includes('is it financially') ||
      q.includes('do i have enough') || q.includes('would') || q.includes('should i buy'));
    if (isDecision) {
      const hasPurchase = amount !== undefined || /buy|purchase|spend|dinner|restaurant|meal|trip|phone|laptop|shopping|subscription|go out|eat out/.test(q);
      if (!hasPurchase) {
        return {
          intent: 'FINANCIAL_REASONING',
          level: 4,
          capability: 'FINANCIAL_REASONING',
          action: /\b(invest|investment|sip)\b/.test(q) ? 'INVEST' : /\b(save|saving)\b/.test(q) ? 'SAVE' : /\b(debt|loan|emi|repay|pay off)\b/.test(q) ? 'REPAY_DEBT' : 'ANALYZE',
          object: /\b(debt|loan|emi)\b/.test(q) ? 'DEBT' : 'FINANCES',
          questionType: 'RECOMMENDATION',
          requiredContext: ['FINANCIAL_OVERVIEW', 'CASH_FLOW', 'RECURRING_EXPENSES', 'UPCOMING_OBLIGATIONS', 'DEBT_OBLIGATIONS', 'INVESTMENT_CONTEXT'],
          toolCalls: [
            { toolName: 'getFinancialOverview' },
            { toolName: 'getCashFlowAnalysis' },
            { toolName: 'getRecurringExpenseAnalysis' },
            { toolName: 'getUpcomingObligations' },
            { toolName: 'getDebtsSummary' },
            { toolName: 'getFinancialProfile' },
            { toolName: 'getCurrentBalance' },
            { toolName: 'getSavingsAnalysis' },
          ],
        };
      }

      const category = /restaurant|dinner|meal|eat out|food/.test(q) ? 'Food & Dining' : undefined;
      return {
        intent: 'FINANCIAL_DECISION',
        level: 4,
        capability: 'PURCHASE_AFFORDABILITY',
        entities: { amount, category, description: rawQ },
        requiredContext: ['FINANCIAL_OVERVIEW', 'CASH_FLOW', ...(category ? ['CATEGORY_SPENDING'] : []), 'UPCOMING_OBLIGATIONS'],
        toolCalls: [
          { toolName: 'getFinancialOverview' },
          { toolName: 'getCashFlowAnalysis' },
          ...(category ? [{ toolName: 'getExpensesByCategory', toolParams: { categoryName: category } }] : []),
          { toolName: 'getUpcomingObligations' },
        ],
      };
    }

    // Universal financial reasoning fallback for novel natural-language questions.
    // This is deliberately broad: the LLM can refine action/object/questionType and the
    // backend can supply a safe financial baseline without guessing a merchant or record.
    const financialSignal = /\b(money|financial|finance|income|salary|expense|spend|spending|save|saving|invest|investment|sip|mutual fund|loan|debt|emi|budget|afford|purchase|buy|goal|target|cash|balance|wealth|net worth|emergency fund|subscription|bill|return|interest)\b/i.test(q);
    if (financialSignal) {
      return {
        intent: 'FINANCIAL_REASONING',
        level: 4,
        capability: 'FINANCIAL_REASONING',
        action: /\b(invest|investment|sip|mutual fund)\b/.test(q) ? 'INVEST' : /\b(save|saving|goal|target)\b/.test(q) ? 'SAVE' : /\b(buy|purchase|afford)\b/.test(q) ? 'PURCHASE' : /\b(loan|debt|emi)\b/.test(q) ? 'ANALYZE' : 'ANALYZE',
        object: /\b(sip|mutual fund|investment)\b/.test(q) ? 'INVESTMENT' : /\b(loan|debt|emi)\b/.test(q) ? 'DEBT' : 'FINANCES',
        questionType: /\b(why|how|should|can i|what if|recommend|suggest)\b/.test(q) ? 'RECOMMENDATION' : 'ANALYSIS',
        requiredContext: ['FINANCIAL_OVERVIEW', 'CASH_FLOW', 'CATEGORY_SPENDING', 'RECURRING_EXPENSES', 'UPCOMING_OBLIGATIONS', 'DEBT_OBLIGATIONS', 'INVESTMENT_CONTEXT'],
        toolCalls: [
          { toolName: 'getFinancialOverview' },
          { toolName: 'getCashFlowAnalysis' },
          { toolName: 'getCategoryAnalysis' },
          { toolName: 'getRecurringExpenseAnalysis' },
          { toolName: 'getUpcomingObligations' },
          { toolName: 'getDebtsSummary' },
          { toolName: 'getFinancialProfile' },
          { toolName: 'getCurrentBalance' },
          { toolName: 'getSavingsAnalysis' },
        ],
      };
    }

    // 0. Discretionary Spending Decision Queries ("is it good idea to go to restaurant today?", "should I eat out tonight?")
    const isDecisionQuery =
      q.includes('good idea') ||
      q.includes('great idea') ||
      q.includes('bad idea') ||
      q.includes('should i') ||
      q.includes('should we') ||
      q.includes('is it okay') ||
      q.includes('is it fine') ||
      q.includes('is it safe') ||
      q.includes('is it wise') ||
      q.includes('can i go') ||
      q.includes('can i eat') ||
      q.includes('can i treat') ||
      q.includes('worth going') ||
      q.includes('worth spending');

    if (isDecisionQuery) {
      const catMatch = matchCategory(q, dbCategories);
      const activityMatch = q.match(/(?:go to|eat at|visit|order|eat|buy|spend on)\s+([a-z0-9&\s-]+)/i);
      const itemName = activityMatch ? activityMatch[1].trim() : 'outings';

      return {
        intent: 'DISCRETIONARY_DECISION',
        level: 4,
        toolCalls: [
          { toolName: 'getFinancialOverview', toolParams: { itemName, categoryName: catMatch || 'Food & Dining' } },
          { toolName: 'getCashFlowAnalysis' },
          { toolName: 'getCategoryAnalysis' },
          { toolName: 'getExpensesByCategory', toolParams: { categoryName: catMatch || 'Food & Dining' } },
        ],
      };
    }

    // 1. Affordability & Purchase Feasibility Queries ("buy a laptop", "can I afford", "how should I buy", "savings trend to buy...")
    if (
      q.includes('afford') ||
      q.includes('buy') ||
      q.includes('purchase') ||
      q.includes('is it affordable') ||
      q.includes('can i spend') ||
      q.includes('can we afford') ||
      q.includes('considering my income') ||
      q.includes('how i shall buy') ||
      q.includes('how to buy') ||
      q.includes('how should i buy') ||
      q.includes('savings trend') ||
      q.includes('savings trends')
    ) {
      const { targetAmount, itemName, targetMonths } = parseTargetAmountAndItem(rawQ);
      return {
        intent: 'AFFORDABILITY_ANALYSIS',
        level: 4,
        toolCalls: [
          { toolName: 'getFinancialOverview', toolParams: { targetAmount, itemName, targetMonths } },
          { toolName: 'getCashFlowAnalysis', toolParams: { targetAmount, itemName, targetMonths } },
        ],
      };
    }

    const asksForSavingsAmount = q.includes('how much') || q.includes('should i save') || q.includes('need to save');
    const asksAboutNextMonth = q.includes('next month') || q.includes('next-month');
    const asksForSavingsRate = q.includes('savings rate') || q.includes('savings target') || /\d+\s*%/.test(q);
    if (q.includes('save') && asksForSavingsAmount && (asksAboutNextMonth || asksForSavingsRate)) {
      return {
        intent: 'SAVINGS_TARGET_PROJECTION',
        level: 2,
        toolCalls: [{ toolName: 'getSavingsAnalysis' }],
      };
    }

    // 1. Cost Reduction / Savings Cuts / Spending Advice Queries ("where do I cut", "which area I should spend less", "save 30000 where to cut")
    if (
      q.includes('cut') ||
      q.includes('less') ||
      q.includes('save') ||
      q.includes('reduce') ||
      q.includes('where to') ||
      q.includes('which area') ||
      q.includes('spending tip') ||
      q.includes('financial advice') ||
      q.includes('recommendation') ||
      q.includes('suggestion') ||
      q.includes('financial health') ||
      q.includes('how am i doing') ||
      q.includes('improve savings')
    ) {
      return {
        intent: 'FINANCIAL_ADVICE',
        level: 4,
        toolCalls: [
          { toolName: 'getFinancialOverview' },
          { toolName: 'getCashFlowAnalysis' },
          { toolName: 'getCategoryAnalysis' },
          { toolName: 'getCreditCardAnalysis' },
          { toolName: 'getRecurringExpenseAnalysis' },
          { toolName: 'getDebtsSummary' },
        ],
      };
    }

    // 2. Peak & Top Spending Queries ("When did I spend the most", "where did money go", "highest expenses")
    if (
      q.includes('most') ||
      q.includes('highest') ||
      q.includes('biggest') ||
      q.includes('largest') ||
      q.includes('top spend') ||
      q.includes('maximum') ||
      q.includes('where did most of my money go') ||
      q.includes('when did i spend') ||
      q.includes('when i spend')
    ) {
      return {
        intent: 'SPENDING_INCREASE_ANALYSIS',
        level: 2,
        toolCalls: [
          { toolName: 'getMonthlyExpenses' },
          { toolName: 'getCategoryAnalysis' },
          { toolName: 'getLargeTransactions', toolParams: { limit: 5 } },
          { toolName: 'comparePeriods' },
        ],
      };
    }

    // 1. Scenario Analysis (What-If questions)
    if (q.includes('what if') || q.includes('what happens if') || q.includes('if i reduce') || q.includes('if i save') || q.includes('when will i reach')) {
      if (q.includes('reach') || q.includes('goal') || q.includes('lakh') || q.includes('target')) {
        let targetAmount = 500000;
        if (q.includes('5 lakh') || q.includes('5lakh')) targetAmount = 500000;
        else if (q.includes('10 lakh')) targetAmount = 1000000;

        return {
          intent: 'SCENARIO_SAVINGS_GOAL',
          level: 4,
          toolCalls: [
            { toolName: 'runScenarioAnalysis', toolParams: { type: 'SAVINGS_GOAL_HORIZON', params: { targetAmount } } },
            { toolName: 'getSavingsAnalysis' },
          ],
        };
      }

      return {
        intent: 'SCENARIO_REDUCE_SPEND',
        level: 4,
        toolCalls: [
          { toolName: 'runScenarioAnalysis', toolParams: { type: 'REDUCE_CATEGORY_SPEND', params: { categoryName: 'Food & Dining', reductionPercent: 20 } } },
          { toolName: 'getCategoryAnalysis' },
        ],
      };
    }

    // 2. Spending Increase & Why Queries (Multi-tool analysis)
    if (q.includes('why did i spend more') || q.includes('why spending increased') || q.includes('spending increase') || q.includes('where did most of my money go')) {
      return {
        intent: 'SPENDING_INCREASE_ANALYSIS',
        level: 2,
        toolCalls: [
          { toolName: 'getMonthlyExpenses' },
          { toolName: 'comparePeriods' },
          { toolName: 'getCategoryAnalysis' },
          { toolName: 'getLargeTransactions', toolParams: { limit: 5 } },
        ],
      };
    }

    // 3. Level 4 Financial Advice / Savings Optimization / Cost Reduction Queries (Multi-tool)
    if (
      q.includes('save more') ||
      q.includes('how can i save') ||
      q.includes('how to save') ||
      q.includes('financial advice') ||
      q.includes('cut cost') ||
      q.includes('reduce expense') ||
      q.includes('spending tip') ||
      q.includes('financial tip') ||
      q.includes('save money') ||
      q.includes('advice') ||
      q.includes('tip') ||
      q.includes('recommendation') ||
      q.includes('suggestion') ||
      q.includes('how am i doing') ||
      q.includes('financial health') ||
      q.includes('improve savings')
    ) {
      return {
        intent: 'FINANCIAL_ADVICE',
        level: 4,
        toolCalls: [
          { toolName: 'getFinancialOverview' },
          { toolName: 'getCashFlowAnalysis' },
          { toolName: 'getCategoryAnalysis' },
          { toolName: 'getCreditCardAnalysis' },
          { toolName: 'getRecurringExpenseAnalysis' },
          { toolName: 'getDebtsSummary' },
        ],
      };
    }

    const hasSpendingQuestion =
      q.includes('how much') ||
      q.includes('total') ||
      q.includes('spent') ||
      q.includes('spend') ||
      q.includes('cost') ||
      q.includes('costs') ||
      q.includes('paid') ||
      q.includes('expense') ||
      q.includes('expenses');

    if (hasSpendingQuestion) {
      const spendTargetMatch =
        q.match(/(?:how much|total|amount|what|show|get)\s*(?:money|cash|did i|did|do|i|was|is)?\s*(?:spent|spend|expenses?|spending|cost|costs|paid)?\s*(?:on|at|for|with|in|to|from|by)\s+([a-z0-9&\s-]+)/i) ||
        q.match(/(?:spent|spend|expenses?|spending|paid)\s+(?:on|for|in|with|at|to|from)\s+([a-z0-9&\s-]+)/i) ||
        q.match(/(?:money|cash)\s+(?:given to|lent to|paid to|sent to|spent on|spent with|for|to|with|on)\s+([a-z0-9&\s-]+)/i);

      if (spendTargetMatch && spendTargetMatch[1]) {
        const entityName = spendTargetMatch[1]
          .replace(/\b(this month|last month|today|yesterday|this year|last year|amount|total|money|cash|please|can you|did i|did|do|i|was|is|my|the|a|an|overall|all)\b/gi, '')
          .trim();
        if (entityName.length > 1) {
          // 1. First check if entity is a Category (exact, alias, or fuzzy editDistance e.g. 'utilies' -> 'Utilities')
          const catMatch = matchCategory(entityName, dbCategories);
          if (catMatch) {
            return {
              intent: 'EXPENSE_BY_CATEGORY',
              level: 1,
              toolCalls: [{ toolName: 'getExpensesByCategory', toolParams: { categoryName: catMatch } }],
            };
          }

          // 2. Check if entity matches a person in debts
          try {
            const knownPersons = await prisma.debt.findMany({ select: { personName: true } });
            const knownPerson = knownPersons.find((p) => isDynamicMatch(p.personName, entityName));
            if (knownPerson) {
              return {
                intent: 'SEARCH_FINANCIAL_DATA',
                level: 1,
                toolCalls: [{ toolName: 'searchFinancialData', toolParams: { searchTerm: knownPerson.personName } }],
              };
            }
          } catch (e) {}

          // 3. Fallback to merchant/entity spending with entityName
          return {
            intent: 'MERCHANT_SPENDING',
            level: 1,
            toolCalls: [{ toolName: 'getMerchantSpending', toolParams: { merchantName: entityName } }],
          };
        }
      }
    }

    // Check if the query itself contains any category name/alias (e.g., 'utilities', 'food', 'groceries', 'rent')
    const generalCatMatch = matchCategory(q, dbCategories);
    if (generalCatMatch && hasSpendingQuestion) {
      return {
        intent: 'EXPENSE_BY_CATEGORY',
        level: 1,
        toolCalls: [{ toolName: 'getExpensesByCategory', toolParams: { categoryName: generalCatMatch } }],
      };
    }

    // 4. Entity / Person Search Prepositions (e.g. "given to Rahul", "lent to Hammad", "paid to Zepto", "money for Abbu")
    const searchMatch =
      q.match(/(?:given to|lent to|borrowed from|paid to|sent to|received from|transfer to|money to|money for)\s+([a-z0-9\s]+)/i) ||
      q.match(/(?:money given|who owes|money owed|debt for)\s+([a-z0-9\s]+)/i);

    if (searchMatch && searchMatch[1]) {
      const candidateTerm = searchMatch[1].replace(/(this month|last month|today|yesterday|money|total|amount|please|can you)/gi, '').trim();
      if (candidateTerm.length > 1) {
        return {
          intent: 'SEARCH_FINANCIAL_DATA',
          level: 1,
          toolCalls: [{ toolName: 'searchFinancialData', toolParams: { searchTerm: candidateTerm } }],
        };
      }
    }

    // 5. Database Entity Lookup (Persons / Merchants / Descriptions / Notes / Categories / Accounts)
    try {
      const knownPersons = await prisma.debt.findMany({ select: { personName: true, notes: true } });
      for (const p of knownPersons) {
        if ((p.personName && isDynamicMatch(p.personName, q)) || (p.notes && isDynamicMatch(p.notes, q))) {
          return {
            intent: 'SEARCH_FINANCIAL_DATA',
            level: 1,
            toolCalls: [{ toolName: 'searchFinancialData', toolParams: { searchTerm: p.personName || q } }],
          };
        }
      }

      const knownTransactions = await prisma.transaction.findMany({
        select: { merchant: true, description: true, category: { select: { name: true } }, sourceAccount: { select: { name: true } } },
      });
      for (const t of knownTransactions) {
        const fields = [t.merchant, t.description, t.category?.name, t.sourceAccount?.name];
        const matchedField = fields.find((f) => isDynamicMatch(f, q));
        if (matchedField) {
          const asksForAmount = q.includes('how much') || q.includes('spent') || q.includes('spend') || q.includes('expense') || q.includes('total') || q.includes('cost');
          if (asksForAmount) {
            return {
              intent: 'MERCHANT_SPENDING',
              level: 1,
              toolCalls: [{ toolName: 'getMerchantSpending', toolParams: { merchantName: matchedField } }],
            };
          }
          return {
            intent: 'SEARCH_FINANCIAL_DATA',
            level: 1,
            toolCalls: [{ toolName: 'searchFinancialData', toolParams: { searchTerm: matchedField } }],
          };
        }
      }
    } catch (e) {
      // Ignore DB lookup errors in provider
    }

    // 6. Category Queries
    if (q.includes('food') || q.includes('dining') || q.includes('eating') || q.includes('restaurant')) {
      return {
        intent: 'EXPENSE_BY_CATEGORY',
        level: 1,
        toolCalls: [{ toolName: 'getExpensesByCategory', toolParams: { categoryName: 'Food & Dining' } }],
      };
    }
    if (q.includes('grocery') || q.includes('groceries') || q.includes('zepto') || q.includes('blinkit')) {
      return {
        intent: 'EXPENSE_BY_CATEGORY',
        level: 1,
        toolCalls: [{ toolName: 'getExpensesByCategory', toolParams: { categoryName: 'Groceries' } }],
      };
    }
    if (q.includes('education') || q.includes('loan') || q.includes('college') || q.includes('tuition')) {
      return {
        intent: 'EXPENSE_BY_CATEGORY',
        level: 1,
        toolCalls: [{ toolName: 'getExpensesByCategory', toolParams: { categoryName: 'Education Loan' } }],
      };
    }
    if (q.includes('salary') || q.includes('income') || q.includes('earned')) {
      return {
        intent: 'MONTHLY_INCOME',
        level: 1,
        toolCalls: [{ toolName: 'getMonthlyIncome', toolParams: {} }],
      };
    }

    // 7. Credit Card Queries
    if (q.includes('credit card') || q.includes('credit-card') || q.includes('card') || q.includes('my zone')) {
      if (q.includes('food') || q.includes('dining') || q.includes('merchant')) {
        return {
          intent: 'EXPENSE_BY_ACCOUNT_AND_CATEGORY',
          level: 1,
          toolCalls: [{ toolName: 'getExpensesByAccount', toolParams: { accountNameStr: 'Credit Card', categoryNameStr: 'Food' } }],
        };
      }
      return {
        intent: 'CREDIT_CARD_SUMMARY',
        level: 1,
        toolCalls: [{ toolName: 'getCreditCardOutstanding', toolParams: {} }],
      };
    }

    // 8. Payment Method Queries
    if (q.includes('upi') || q.includes('gpay') || q.includes('phonepe')) {
      return {
        intent: 'EXPENSE_BY_PAYMENT_METHOD',
        level: 1,
        toolCalls: [{ toolName: 'getExpensesByPaymentMethod', toolParams: { paymentMethodStr: 'UPI' } }],
      };
    }
    if (q.includes('cash')) {
      return {
        intent: 'EXPENSE_BY_PAYMENT_METHOD',
        level: 1,
        toolCalls: [{ toolName: 'getExpensesByPaymentMethod', toolParams: { paymentMethodStr: 'CASH' } }],
      };
    }

    // 9. Subscriptions & Recurring
    if (q.includes('subscription') || q.includes('recurring') || q.includes('netflix') || q.includes('spotify')) {
      if (q.includes('next month') || q.includes('upcoming') || q.includes('due')) {
        return {
          intent: 'UPCOMING_SUBSCRIPTIONS',
          level: 1,
          toolCalls: [{ toolName: 'getUpcomingSubscriptions', toolParams: { daysAhead: 30 } }],
        };
      }
      return {
        intent: 'SUBSCRIPTION_SUMMARY',
        level: 2,
        toolCalls: [
          { toolName: 'getSubscriptionSummary', toolParams: {} },
          { toolName: 'getRecurringExpenseAnalysis', toolParams: {} },
        ],
      };
    }

    // 10. Debt / Money Owed / Borrowed
    if (q.includes('owe') || q.includes('borrowed') || q.includes('lent') || q.includes('debt') || q.includes('loan')) {
      return {
        intent: 'DEBT_SUMMARY',
        level: 1,
        toolCalls: [{ toolName: 'getDebtsSummary', toolParams: {} }],
      };
    }

    // 11. Comparison & Trends
    if (q.includes('compare') || q.includes('comparison') || q.includes('versus') || q.includes('vs')) {
      return {
        intent: 'COMPARE_PERIODS',
        level: 2,
        toolCalls: [
          { toolName: 'comparePeriods', toolParams: {} },
          { toolName: 'getCategoryAnalysis', toolParams: {} },
        ],
      };
    }
    if (q.includes('trend') || q.includes('history') || q.includes('months')) {
      return {
        intent: 'SPENDING_TREND',
        level: 2,
        toolCalls: [{ toolName: 'getSpendingTrend', toolParams: {} }],
      };
    }

    // 12. General Summaries
    if (q.includes('spend') || q.includes('spent') || q.includes('expense')) {
      return {
        intent: 'MONTHLY_EXPENSES',
        level: 1,
        toolCalls: [{ toolName: 'getMonthlyExpenses', toolParams: {} }],
      };
    }

    if (q.includes('balance') || q.includes('net worth') || q.includes('saved') || q.includes('money')) {
      return {
        intent: 'CURRENT_BALANCE',
        level: 1,
        toolCalls: [{ toolName: 'getCurrentBalance', toolParams: {} }],
      };
    }

    // General Natural Language Fallback: Always return comprehensive financial advice & live ledger facts
    return {
      intent: 'FINANCIAL_ADVICE',
      level: 4,
      toolCalls: [
        { toolName: 'getFinancialOverview' },
        { toolName: 'getCashFlowAnalysis' },
        { toolName: 'getCategoryAnalysis' },
        { toolName: 'getCreditCardAnalysis' },
        { toolName: 'getRecurringExpenseAnalysis' },
      ],
    };
  }
}
