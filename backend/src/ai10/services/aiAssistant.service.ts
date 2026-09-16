import { FinancialToolRegistry } from '../tools/financialToolRegistry';
import { IAIProvider, AIQueryRequest, AIQueryResponse, AIToolCall } from '../providers/aiProvider.interface';
import { SecureOnlineAIProvider } from '../providers/secureOnlineProvider';
import { BadRequestError } from '../../common/errors';
import { FinancialContextService, FinancialContextKey } from './financialContext.service';
import { FinancialDecisionService } from './financialDecision.service';
import { FinancialQueryEngine } from './financialQueryEngine';

export class AIAssistantService {
  constructor(
    private toolRegistry = new FinancialToolRegistry(),
    private provider: IAIProvider = new SecureOnlineAIProvider(),
    private contextService = new FinancialContextService(toolRegistry),
    private decisionService = new FinancialDecisionService(),
    private queryEngine = new FinancialQueryEngine(toolRegistry)
  ) {}

  async processUserQuery(request: AIQueryRequest): Promise<AIQueryResponse> {
    if (!request.query || request.query.trim().length === 0) {
      throw new BadRequestError('Query cannot be empty');
    }

    // 0. Deterministic financial query layer.
    // Basic ledger facts/calculations never depend on the LLM. This prevents a
    // simple question such as 'how much did I save in July?' from being routed
    // into generic financial reasoning or current-month analysis.
    console.log('🔥 AI10 QUERY ENGINE START');
    const direct = await this.queryEngine.tryExecute(request.query);
    console.log('🔥 AI10 DIRECT RESULT:', direct?.answer);
console.log('🔥 AI10 DIRECT CONTRACT:', direct?.contract);
    if (direct) {
      return {
        query: request.query,
        intent: `${direct.contract.subject}_${direct.contract.operation}`,
        capability: direct.toolUsed,
        toolUsed: direct.toolUsed,
        toolCallsExecuted: direct.toolCallsExecuted,
        toolParameters: direct.contract,
        data: direct.data,
        answer: direct.answer,
        suggestedFollowUps: this.generateSuggestedFollowUps(direct.contract.subject),
      };
    }

    // 1. Determine orchestration plan (intent, level, array of tool calls)
    const plan = await this.provider.processQuery(request);

    if (plan.clarification) {
      return {
        query: request.query,
        intent: plan.intent,
        capability: plan.capability,
        toolUsed: 'none',
        toolCallsExecuted: [],
        data: null,
        answer: plan.clarification,
        suggestedFollowUps: ['Can I afford a purchase?', 'How much did I spend this month?'],
      };
    }

    if (plan.intent === 'GENERAL_CONVERSATION' || plan.intent === 'FINANCIAL_KNOWLEDGE') {
      return {
        query: request.query,
        intent: plan.intent,
        capability: plan.capability,
        toolUsed: 'none',
        toolCallsExecuted: [],
        data: null,
        answer: this.formatGeneralResponse(plan.intent, request.query),
        suggestedFollowUps: ['How much did I spend this month?', 'Can I afford a purchase?'],
      };
    }

    if (plan.capability === 'PURCHASE_AFFORDABILITY' || plan.capability === 'SCENARIO_ANALYSIS' || plan.capability === 'SAVINGS_GOAL' || plan.capability === 'MONTHLY_SAVINGS_PLAN' || plan.capability === 'SAVINGS_RATE_PLAN' || plan.capability === 'INVESTMENT_DECISION') {
      const context = await this.contextService.gather(
        (plan.requiredContext || ['FINANCIAL_OVERVIEW', 'CASH_FLOW']) as FinancialContextKey[],
        { category: plan.entities?.category }
      );
      const data = plan.capability === 'PURCHASE_AFFORDABILITY'
        ? this.decisionService.evaluateAffordability(plan.entities || {}, context)
        : plan.capability === 'SAVINGS_GOAL'
          ? this.decisionService.evaluateSavingsGoal({
              targetAmount: plan.entities?.amount,
              targetMonths: plan.entities?.targetMonths,
              itemName: plan.entities?.description,
            }, context)
          : plan.capability === 'MONTHLY_SAVINGS_PLAN'
            ? this.decisionService.evaluateMonthlySavingsPlan(
                Number(plan.entities?.targetMonthlySavings ?? plan.entities?.amount),
                context
              )
            : plan.capability === 'SAVINGS_RATE_PLAN'
              ? this.decisionService.evaluateSavingsRatePlan(
                  Number(plan.entities?.targetSavingsRate),
                  context
                )
              : plan.capability === 'INVESTMENT_DECISION'
                ? this.decisionService.evaluateInvestmentContribution(
                    {
                      amount: plan.entities?.amount,
                      frequency: plan.entities?.frequency,
                      instrument: plan.entities?.instrument,
                    },
                    context
                  )
                : this.decisionService.evaluateScenario(plan.entities?.amount, context);

      // Second-pass LLM reasoning over verified backend facts. The model does not
      // calculate ledger values itself; it explains the backend-verified result.
      if (this.provider.reasonOverFinancialContext) {
        try {
          const reasoning = await this.provider.reasonOverFinancialContext(
            request,
            plan,
            { context, decision: data }
          );
          return {
            query: request.query,
            intent: plan.intent,
            capability: plan.capability,
            toolUsed: plan.capability,
            toolCallsExecuted: plan.toolCalls,
            toolParameters: plan.entities,
            data,
            answer: reasoning.answer,
            suggestedFollowUps: reasoning.suggestedFollowUps || this.generateSuggestedFollowUps(plan.intent),
          };
        } catch {
          // Never make financial answers depend on external AI availability.
        }
      }

      return {
        query: request.query,
        intent: plan.intent,
        capability: plan.capability,
        toolUsed: plan.capability,
        toolCallsExecuted: plan.toolCalls,
        toolParameters: plan.entities,
        data,
        answer: this.formatGenericDecisionResponse(plan.capability, plan.entities || {}, data),
        suggestedFollowUps: ['What if I spend ₹2,000 tonight?', 'How can I save more?'],
      };
    }

    // 2. Execute all planned financial tools in parallel
    const toolResultsMap: Record<string, any> = {};
    await Promise.all(
      plan.toolCalls.map(async (call) => {
        const result = await this.executeTool(call.toolName, call.toolParams || {});
        toolResultsMap[call.toolName] = result;
      })
    );

    const primaryTool = plan.toolCalls[0] ? plan.toolCalls[0].toolName : 'none';
    const primaryParams = plan.toolCalls[0] ? plan.toolCalls[0].toolParams : {};
    const primaryData = primaryTool === 'none' ? null : toolResultsMap[primaryTool];

    // 3. Second-pass reasoning: the LLM now sees verified backend results and
    // turns them into a contextual answer. Arithmetic and ledger facts remain
    // backend-owned; the model is the reasoning/explanation layer.
    let answer: string;
    let suggestedFollowUps: string[];

    if (this.provider.reasonOverFinancialContext) {
      try {
        const reasoning = await this.provider.reasonOverFinancialContext(
          request,
          plan,
          { toolResults: toolResultsMap }
        );
        answer = reasoning.answer;
        suggestedFollowUps = reasoning.suggestedFollowUps || this.generateSuggestedFollowUps(plan.intent);
      } catch {
        // External AI is an enhancement, never a single point of failure.
        answer = this.formatFactGroundedResponse(plan.intent, plan.level, request.query, toolResultsMap, primaryParams);
        suggestedFollowUps = this.generateSuggestedFollowUps(plan.intent);
      }
    } else {
      answer = this.formatFactGroundedResponse(plan.intent, plan.level, request.query, toolResultsMap, primaryParams);
      suggestedFollowUps = this.generateSuggestedFollowUps(plan.intent);
    }

    return {
      query: request.query,
      intent: plan.intent,
      capability: plan.capability || plan.intent,
      toolUsed: primaryTool,
      toolCallsExecuted: plan.toolCalls,
      toolParameters: primaryParams,
      data: primaryData,
      answer,
      suggestedFollowUps,
    };
  }

  private async executeTool(toolName: string, params: Record<string, any>): Promise<any> {
    switch (toolName) {
      case 'getFinancialOverview':
        return this.toolRegistry.getFinancialOverview();
      case 'getNetWorth':
        return this.toolRegistry.getNetWorth();
      case 'getCurrentBalance':
        return this.toolRegistry.getCurrentBalance();
      case 'getMonthlyIncome':
        return this.toolRegistry.getMonthlyIncome(params.month, params.year);
      case 'getMonthlyExpenses':
        return this.toolRegistry.getMonthlyExpenses(params.month, params.year);
      case 'getCashFlowAnalysis':
        return this.toolRegistry.getCashFlowAnalysis(params.month, params.year);
      case 'getSavingsAnalysis':
        return this.toolRegistry.getSavingsAnalysis();
      case 'getExpensesByCategory':
        return this.toolRegistry.getExpensesByCategory(params.categoryName, params.month, params.year);
      case 'getCategoryAnalysis':
        return this.toolRegistry.getCategoryAnalysis();
      case 'getExpensesByPaymentMethod':
      case 'getPaymentMethodAnalysis':
        return this.toolRegistry.getExpensesByPaymentMethod(params.paymentMethodStr);
      case 'getExpensesByAccount':
      case 'getAccountAnalysis':
        return this.toolRegistry.getExpensesByAccount(params.accountNameStr, params.categoryNameStr);
      case 'getCreditCardOutstanding':
      case 'getCreditCardAnalysis':
        return this.toolRegistry.getCreditCardOutstanding(params.cardNameStr);
      case 'getSubscriptionSummary':
        return this.toolRegistry.getSubscriptionSummary();
      case 'getRecurringExpenseAnalysis':
        return this.toolRegistry.getRecurringExpenseAnalysis();
      case 'getUpcomingSubscriptions':
      case 'getUpcomingObligations':
        return this.toolRegistry.getUpcomingSubscriptions(params.daysAhead);
      case 'getLargeTransactions':
        return this.toolRegistry.getLargeTransactions(params.limit);
      case 'getSpendingAnomalies':
        return this.toolRegistry.getSpendingAnomalies();
      case 'getMerchantAnalysis':
        return this.toolRegistry.getMerchantAnalysis(params.merchantName);
      case 'getMerchantSpending':
        return this.toolRegistry.getMerchantSpending(params.merchantName, params.month, params.year);
      case 'getFinancialProfile':
        return this.toolRegistry.getFinancialProfile();
      case 'comparePeriods':
        return this.toolRegistry.comparePeriods();
      case 'getSpendingTrend':
        return this.toolRegistry.getSpendingTrend();
      case 'getDebtAnalysis':
      case 'getDebtsSummary':
        return this.toolRegistry.getDebtsSummary();
      case 'getFinancialAdvice':
        return this.toolRegistry.getFinancialAdvice();
      case 'runScenarioAnalysis':
        return this.toolRegistry.runScenarioAnalysis(params.type, params.params || {});
      case 'searchFinancialData':
        return this.toolRegistry.searchFinancialData(params.searchTerm);
      default:
        return this.toolRegistry.getMonthlyExpenses();
    }
  }

  private formatGeneralResponse(intent: string, query: string): string {
    if (intent === 'GENERAL_CONVERSATION') {
      return /thank/.test(query.toLowerCase()) ? 'You are welcome.' : 'Hello. How can I help with your finances today?';
    }
    if (query.toLowerCase().includes('compound interest')) {
      return 'Compound interest is interest earned on both the original amount and previously earned interest.';
    }
    if (query.toLowerCase().includes('sip')) {
      return 'A SIP is a systematic investment plan: a fixed amount is invested at regular intervals. Returns are not guaranteed.';
    }
    return 'Credit cards let you borrow up to a limit, while debit cards spend money directly from your bank account.';
  }

  private formatGenericDecisionResponse(capability: string, entities: Record<string, any>, data: any): string {
    const fmt = (value: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(value || 0);
    // A description is only a usable item name when it's a short noun phrase, not the raw user question.
    const isUsableDescription = typeof entities.description === 'string' &&
      entities.description.length <= 40 && !entities.description.includes('?');
    const item = entities.category || (isUsableDescription ? entities.description : undefined);
    if (capability === 'SAVINGS_RATE_PLAN') {
      const rate = Number(data?.targetSavingsRate || 0);
      if (rate <= 0 || rate > 100) return 'What savings percentage of your income would you like to target?';
      if (!data?.income || data.income <= 0) return 'I need recorded monthly income before I can calculate a savings-rate target.';

      const target = fmt(data.targetMonthlySavings);
      const current = fmt(data.currentMonthlySavings);
      const gap = fmt(data.monthlyGap || 0);
      const lines = [
        `Your target is to save ${rate}% of your monthly income, which is ${target} based on your recorded income of ${fmt(data.income)}.`,
        `Your current monthly savings are ${current} (${data.currentSavingsRate}%), so you need to free up ${gap} more per month to reach ${rate}%.`,
      ];

      if (data.monthlyGap <= 0) {
        lines.push(`You are already meeting this savings-rate target. Keep at least ${target} protected as monthly savings before allocating the remaining surplus.`);
      } else if (data.largestCategories?.length) {
        lines.push('The practical next step is to close the gap using your actual spending rather than a generic percentage cut:');
        data.largestCategories.slice(0, 5).forEach((category: any, index: number) => {
          lines.push(`${index + 1}. ${category.name}: ${fmt(category.amount)}/month`);
        });
        lines.push(`You need to reduce or replace ${gap} of monthly outflow (or increase income by the same amount). Do not assume the entire gap should come from one category.`);
      }

      if (data.monthlySubscriptionCost > 0) {
        lines.push(`Your recurring subscriptions are about ${fmt(data.monthlySubscriptionCost)}/month, so non-essential subscriptions are one place to review.`);
      }
      if (data.upcomingAmount > 0) {
        lines.push(`You also have about ${fmt(data.upcomingAmount)} in upcoming obligations in the current window, so keep those commitments covered before treating the target as fully available.`);
      }
      return lines.join('\n');
    }

    if (capability === 'MONTHLY_SAVINGS_PLAN') {
      const target = Number(data?.targetMonthlySavings || 0);
      if (target <= 0) return 'What monthly savings amount would you like to target?';

      const targetFmt = fmt(target);
      const currentFmt = fmt(data.currentMonthlySavings);
      const gapFmt = fmt(data.monthlyGap);

      if (data.alreadyMeetingTarget) {
        return `Your current monthly surplus is ${currentFmt}, so you are already saving at least ${targetFmt} per month. I would keep ${targetFmt} as a protected monthly savings target and treat the remaining ${fmt(data.currentMonthlySavings - target)} as additional buffer or goal savings.`;
      }

      const lines = [
        `To save ${targetFmt} every month, you need to increase your current monthly savings by ${gapFmt}.`,
        `Your current monthly surplus is ${currentFmt}, so your target is ${fmt(target - data.currentMonthlySavings)} higher than your current pace.`,
      ];

      if (data.largestCategories?.length) {
        lines.push('\nLook at your largest actual spending categories first:');
        data.largestCategories.slice(0, 5).forEach((category: any, index: number) => {
          lines.push(`${index + 1}. ${category.name}: ${fmt(category.amount)}/month`);
        });
        lines.push(`\nYou need to find ${gapFmt} of monthly savings. Do not assume you should cut the full amount from one category; use these categories as the starting point and preserve essential expenses.`);
      }

      if (data.monthlySubscriptionCost > 0) {
        lines.push(`Your recurring subscriptions currently cost about ${fmt(data.monthlySubscriptionCost)}/month, so review them for cancellations or downgrades if they are non-essential.`);
      }

      if (data.upcomingAmount > 0) {
        lines.push(`There are also approximately ${fmt(data.upcomingAmount)} in upcoming obligations in the available obligation window, so the ${targetFmt} target should not be treated as guaranteed until those commitments are covered.`);
      }

      return lines.join('\n');
    }

    if (capability === 'SAVINGS_GOAL') {
      if (data.requiredMonthlySavings === undefined) {
        return data.itemName
          ? `I need the target price or budget for the ${data.itemName} before I can calculate how much you should save each month.`
          : 'I need the target amount before I can calculate how much you should save each month.';
      }

      const target = fmt(data.targetAmount);
      const monthly = fmt(data.requiredMonthlySavings);
      const current = fmt(data.currentMonthlySavings);
      const gap = fmt(Math.max(data.monthlyGap || 0, 0));
      const months = data.targetMonths;

      if (data.achievableWithCurrentSurplus) {
        return `To reach ${target} in ${months} months, you need to set aside ${monthly} per month. Your current monthly surplus is ${current}, so this goal fits within your current surplus, subject to upcoming obligations.`;
      }

      return `To reach ${target} in ${months} months, you need to set aside ${monthly} per month. Your current monthly surplus is ${current}, leaving a gap of ${gap} per month. You would need to reduce expenses, increase income, or extend the timeline.`;
    }

    if (capability === 'INVESTMENT_DECISION') {
      const instrument = entities.instrument || 'investment';
      const amount = Number(data.monthlyContribution || entities.amount || 0);
      if (!amount) {
        return `What monthly amount are you considering for the ${instrument}?`;
      }
      if (data.income <= 0) {
        return `I need a reliable monthly income figure before I can assess a ${fmt(amount)} monthly ${instrument} contribution.`;
      }
      const remaining = fmt(data.remainingMonthlySurplus);
      if (data.remainingMonthlySurplus < 0) {
        return `A ${fmt(amount)} monthly ${instrument} contribution would exceed your current monthly surplus of ${fmt(data.currentMonthlySurplus)} by ${fmt(Math.abs(data.remainingMonthlySurplus))}. I would not treat it as comfortably affordable without reducing expenses or increasing income.`;
      }
      return `A ${fmt(amount)} monthly ${instrument} contribution would use about ${data.contributionOfIncome}% of your income and ${data.contributionOfSurplus}% of your current monthly surplus, leaving about ${remaining} of monthly surplus. Before committing, I would also check your emergency cash, upcoming obligations, and outstanding debt. This is a cash-flow assessment, not a guarantee that the investment itself is suitable.`;
    }

    if (capability === 'SCENARIO_ANALYSIS') {
      if (entities.amount === undefined) return 'What amount would you like me to model for this scenario?';
      return `If you spend ${fmt(entities.amount)} now, your calculated monthly savings would change from ${fmt(data.currentMonthlySavings)} to ${fmt(data.projectedMonthlySavings)}${data.balanceAfterSpend === undefined ? '.' : `, and your projected balance would be ${fmt(data.balanceAfterSpend)}.`}`;
    }
    if (data.amount === undefined) {
      const pace = data.expenses > 0 && data.income > 0 && data.expenses / data.income >= 0.85 ? 'higher than your normal target' : 'within your normal target';
      const subject = item || 'discretionary spending today';
      return `Based on your current financial position, your monthly spending pace is ${pace}. Your recorded monthly surplus is ${fmt(data.monthlySurplus)}, so ${subject} may be affordable within a safe one-time spending range of about ${fmt(data.safeSingleSpend)}. Consider any upcoming obligations before deciding.`;
    }
    const result = data.affordable ? 'appears affordable' : 'would exceed the current conservative spending limit';
    return `${item || 'This purchase'} at ${fmt(data.amount)} ${result}. Your recorded monthly surplus is ${fmt(data.monthlySurplus)}, and the conservative single-spend limit is ${fmt(data.safeSingleSpend)}.`;
  }

  private formatFactGroundedResponse(
    intent: string,
    level: number,
    query: string,
    results: Record<string, any>,
    primaryParams?: any
  ): string {
    const fmt = (val: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
        val || 0
      );

    // Universal fallback when no external reasoning model is available. It gives
    // verified facts without pretending that the backend knows a recommendation
    // it has not actually calculated.
    if (intent === 'FINANCIAL_REASONING') {
      const overview = results['getFinancialOverview'] || {};
      const cashFlow = results['getCashFlowAnalysis'] || {};
      const savings = results['getSavingsAnalysis'] || {};
      const income = Number(cashFlow.inflow ?? overview.totalIncome ?? 0);
      const expenses = Number(cashFlow.outflow ?? overview.totalExpenses ?? 0);
      const surplus = Number(cashFlow.netCashFlow ?? (income - expenses));
      const parts = [
        `Based on your recorded financial data, your monthly income is ${fmt(income)}, expenses are ${fmt(expenses)}, and current monthly surplus is ${fmt(surplus)}.`,
      ];
      if (savings.currentSavingsRate !== undefined) parts.push(`Your current savings rate is ${savings.currentSavingsRate}%.`);
      parts.push('I can use these verified figures to evaluate the specific decision, plan or scenario in your question.');
      return parts.join(' ');
    }

    // LEVEL 4 SCENARIOS
    if (intent === 'SCENARIO_REDUCE_SPEND') {
      const scenario = results['runScenarioAnalysis'];
      if (!scenario) return `Scenario analysis calculated based on current spend metrics.`;

      return [
        `SCENARIO ANALYSIS: Reducing ${scenario.categoryName} Spend`,
        ``,
        `FACTS:`,
        `• Current ${scenario.categoryName} Monthly Spend: ${fmt(scenario.currentSpend)}`,
        `• Proposed Reduction: 20% (${fmt(scenario.reductionAmount)})`,
        ``,
        `ANALYSIS:`,
        `• New Monthly Category Spend: ${fmt(scenario.newCategorySpend)}`,
        `• Monthly Savings Increase: ${fmt(scenario.currentMonthlySavings)} → ${fmt(scenario.newMonthlySavings)}`,
        ``,
        `RECOMMENDATION:`,
        `• Cutting 20% in ${scenario.categoryName} adds ${fmt(scenario.annualSavingsIncrease)} to your annual net worth!`,
      ].join('\n');
    }

    if (intent === 'SCENARIO_SAVINGS_GOAL') {
      const scenario = results['runScenarioAnalysis'];
      if (!scenario) return `Savings goal projection calculated.`;

      return [
        `SCENARIO ANALYSIS: Reaching ${fmt(scenario.targetAmount)} Savings Target`,
        ``,
        `FACTS:`,
        `• Target Goal: ${fmt(scenario.targetAmount)}`,
        `• Monthly Savings Pace: ${fmt(scenario.monthlySavings)}/month`,
        ``,
        `ANALYSIS:`,
        `• Time Horizon: ${scenario.monthsRequired} month(s) (~${scenario.yearsRequired} years)`,
        ``,
        `RECOMMENDATION:`,
        `• Maintaining your savings pace of ${fmt(scenario.monthlySavings)} will achieve your ${fmt(scenario.targetAmount)} goal in ${scenario.monthsRequired} month(s).`,
      ].join('\n');
    }

    if (intent === 'SAVINGS_TARGET_PROJECTION') {
      const savings = results['getSavingsAnalysis'];
      if (!savings || savings.expectedNextMonthIncome <= 0) {
        return `I need recorded income for this month before I can calculate your next-month savings target.`;
      }

      return [
        `SAVINGS TARGET FOR NEXT MONTH`,
        ``,
        `FACTS:`,
        `• Current savings rate: ${savings.currentSavingsRate}% (${fmt(savings.currentMonthlySavings)} saved from ${fmt(savings.expectedNextMonthIncome)} income).`,
        `• Savings-rate goal: ${savings.targetSavingsRate}%.`,
        ``,
        `ANSWER:`,
        `• Save ${fmt(savings.targetMonthlySavings)} next month to achieve a ${savings.targetSavingsRate}% savings rate, assuming income remains ${fmt(savings.expectedNextMonthIncome)}.`,
        `• To bring the average across this month and next month to ${savings.targetSavingsRate}%, save ${fmt(savings.catchUpSavingsTarget)} next month.`,
        `• This month's shortfall against the normal target is ${fmt(savings.currentMonthShortfall)}.`,
      ].join('\n');
    }

    // LEVEL 2 & 4 MULTI-TOOL SPENDING INCREASE ANALYSIS
    if (intent === 'SPENDING_INCREASE_ANALYSIS') {
      const comp = results['comparePeriods'];
      const catAnalysis = results['getCategoryAnalysis'];
      const largeTxs = results['getLargeTransactions'];
      const exp = results['getMonthlyExpenses'];

      const lines: string[] = [];
      lines.push(`ANSWER`);
      lines.push(`Here is your peak spending & category breakdown for this month.`);

      lines.push(``);
      lines.push(`FACTS`);
      lines.push(`• Total Expenses This Month: ${fmt(exp?.totalExpenses || 0)} (${exp?.count || 0} transactions)`);
      if (comp) {
        const diff = comp.comparison.spendingDifference;
        const diffText = diff >= 0 ? `${fmt(diff)} more` : `${fmt(Math.abs(diff))} less`;
        lines.push(`• Comparison vs Last Month: ${diffText} (${fmt(comp.currentMonth.expenses)} vs ${fmt(comp.previousMonth.expenses)})`);
      }

      if (catAnalysis && catAnalysis.categories && catAnalysis.categories.length > 0) {
        lines.push(``);
        lines.push(`TOP SPENDING CATEGORIES`);
        catAnalysis.categories.slice(0, 3).forEach((cat: any) => {
          lines.push(`• ${cat.categoryName}: ${fmt(cat.currentAmount)} (historical avg: ${fmt(cat.historicalAverage)})`);
        });
      }

      if (largeTxs && largeTxs.largeTransactions && largeTxs.largeTransactions.length > 0) {
        lines.push(``);
        lines.push(`LARGEST INDIVIDUAL TRANSACTIONS (PEAK SPENDING DATES)`);
        largeTxs.largeTransactions.slice(0, 5).forEach((tx: any) => {
          const dateStr = new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
          lines.push(`• ${fmt(tx.amount)} on ${dateStr} at '${tx.merchant}' (${tx.category || 'General'})`);
        });
      }

      return lines.join('\n');
    }

    // LEVEL 4 DISCRETIONARY DECISION ANALYSIS
    if (intent === 'DISCRETIONARY_DECISION') {
      const overview = results['getFinancialOverview'];
      const cashFlow = results['getCashFlowAnalysis'];
      const catData = results['getExpensesByCategory'];

      const totalLiquid = overview?.totalBalance || 0;
      const income = cashFlow?.inflow || overview?.totalIncome || 0;
      const expenses = cashFlow?.outflow || overview?.totalExpenses || 0;
      const monthlySurplus = Math.max(0, income - expenses);
      const savingsRate = cashFlow?.savingsRate || (income > 0 ? Number(((monthlySurplus / income) * 100).toFixed(1)) : 0);

      const targetItem = primaryParams?.itemName || 'outings';
      const catName = catData?.categoryName || 'Food & Dining';
      const catSpent = catData?.totalSpent || 0;

      const lines: string[] = [];
      lines.push(`ANSWER`);

      if (monthlySurplus > 5000 && savingsRate >= 15) {
        lines.push(`🟢 YES, IT'S A GOOD IDEA! You have a healthy monthly savings surplus of ${fmt(monthlySurplus)} (${savingsRate}% savings rate). Going to a ${targetItem} today is affordable within your discretionary budget.`);
      } else if (monthlySurplus > 0) {
        lines.push(`🟡 MODERATE / PROCEED WITH CAUTION: You have a positive monthly surplus of ${fmt(monthlySurplus)} (${savingsRate}% savings rate). You can afford going to a ${targetItem} today as long as you keep your spending modest.`);
      } else {
        lines.push(`🔴 NOT RECOMMENDED: Your monthly expenses (${fmt(expenses)}) currently equal or exceed your income (${fmt(income)}). It is recommended to minimize discretionary spending on ${targetItem} today to protect your cash reserves.`);
      }

      lines.push(``);
      lines.push(`FACTS & FINANCIAL HEALTH`);
      lines.push(`• Total Liquid Assets (Bank, Cash, UPI): ${fmt(totalLiquid)}`);
      lines.push(`• Monthly Income: ${fmt(income)} | Monthly Expenses: ${fmt(expenses)}`);
      lines.push(`• Net Monthly Savings Surplus: ${fmt(monthlySurplus)}/month (${savingsRate}% savings rate)`);
      if (catData && catData.found) {
        lines.push(`• '${catName}' Spend This Month: ${fmt(catSpent)} across ${catData.count} transaction(s)`);
      }

      lines.push(``);
      lines.push(`RECOMMENDED DISCRETIONARY CAP`);
      const recommendedSingleCap = Math.round(monthlySurplus * 0.1);
      lines.push(`• Safe Single Outing Limit: Keep today's ${targetItem} bill under ${fmt(Math.max(500, recommendedSingleCap))} (max 10% of monthly surplus).`);

      return lines.join('\n');
    }

    // LEVEL 4 AFFORDABILITY ANALYSIS
    if (intent === 'AFFORDABILITY_ANALYSIS') {
      const overview = results['getFinancialOverview'];
      const cashFlow = results['getCashFlowAnalysis'];

      const totalLiquid = overview?.totalBalance || 0;
      const income = cashFlow?.inflow || overview?.totalIncome || 0;
      const expenses = cashFlow?.outflow || overview?.totalExpenses || 0;
      const monthlySurplus = Math.max(0, income - expenses);

      const targetAmount = primaryParams?.targetAmount;
      const itemName = primaryParams?.itemName || 'item';
      const targetMonths = primaryParams?.targetMonths;

      const lines: string[] = [];
      lines.push(`ANSWER`);
      if (targetAmount) {
        if (targetMonths) {
          lines.push(`Here is your custom Savings Trend & Affordability Breakdown to buy a ${itemName} (${fmt(targetAmount)}) in ${targetMonths} month(s).`);
        } else {
          lines.push(`Here is your custom Purchase & Affordability Breakdown for buying a ${itemName} priced at ${fmt(targetAmount)}.`);
        }
      } else {
        lines.push(`Here is your personalized Affordability Analysis based on your actual live financial ledger.`);
      }

      lines.push(``);
      lines.push(`FACTS`);
      lines.push(`• Total Liquid Assets (Bank, Cash, UPI): ${fmt(totalLiquid)}`);
      lines.push(`• Monthly Income: ${fmt(income)} | Monthly Expenses: ${fmt(expenses)}`);
      lines.push(`• Net Monthly Savings Surplus: ${fmt(monthlySurplus)}/month`);

      if (targetAmount) {
        lines.push(`• Target Purchase (${itemName}): ${fmt(targetAmount)}${targetMonths ? ` within ${targetMonths} month(s)` : ''}`);

        if (targetMonths && targetMonths > 0) {
          const requiredMonthlySavings = Math.ceil(targetAmount / targetMonths);
          const requiredSavingsRate = income > 0 ? Number(((requiredMonthlySavings / income) * 100).toFixed(1)) : 0;
          const currentSavingsRate = income > 0 ? Number(((monthlySurplus / income) * 100).toFixed(1)) : 0;

          lines.push(``);
          lines.push(`REQUIRED SAVINGS TREND (${targetMonths} MONTHS)`);
          lines.push(`• Required Monthly Savings Trend: ${fmt(requiredMonthlySavings)}/month (${requiredSavingsRate}% of your monthly income)`);
          lines.push(`• Current Monthly Savings Trend: ${fmt(monthlySurplus)}/month (${currentSavingsRate}% of your monthly income)`);

          if (monthlySurplus >= requiredMonthlySavings) {
            const extraSurplus = monthlySurplus - requiredMonthlySavings;
            lines.push(`🟢 ON TRACK: Your current savings surplus of ${fmt(monthlySurplus)}/month exceeds the required target of ${fmt(requiredMonthlySavings)}/month (${requiredSavingsRate}% savings rate). You are already on track to purchase your ${itemName} in ${targetMonths} months with a buffer of ${fmt(extraSurplus)}/month!`);
          } else {
            const gap = requiredMonthlySavings - monthlySurplus;
            lines.push(`🟡 ADJUSTMENT NEEDED: Your current savings surplus of ${fmt(monthlySurplus)}/month is ${fmt(gap)}/month short of the required ${fmt(requiredMonthlySavings)}/month target (${requiredSavingsRate}% savings rate). To hit your ${targetMonths}-month goal, you need to reduce discretionary expenses by ${fmt(gap)}/month or boost your savings rate to ${requiredSavingsRate}%.`);
          }
        }

        lines.push(``);
        lines.push(`FINANCIAL FEASIBILITY & RECOMMENDED STRATEGY`);

        if (targetAmount <= totalLiquid * 0.3) {
          lines.push(`🟢 FULL CASH PURCHASE: Safe! The price (${fmt(targetAmount)}) is well within your 30% liquid cap (${fmt(Math.round(totalLiquid * 0.3))}). You can buy it in full cash immediately.`);
        } else if (targetAmount <= totalLiquid) {
          lines.push(`🟡 CASH WITH CAUTION: You have enough cash (${fmt(totalLiquid)}), but paying ${fmt(targetAmount)} in full cash consumes ${((targetAmount / totalLiquid) * 100).toFixed(0)}% of your total liquid reserves, leaving a reduced emergency buffer of ${fmt(totalLiquid - targetAmount)}.`);
        } else {
          lines.push(`🔴 FULL CASH WARNING: The cost (${fmt(targetAmount)}) exceeds your current liquid cash balance (${fmt(totalLiquid)}). Paying 100% upfront is not possible without taking a loan.`);
        }

        lines.push(``);
        lines.push(`RECOMMENDED BUYING OPTIONS:`);

        const monthsToUse = targetMonths || 6;
        const emiTarget = Math.round(targetAmount / monthsToUse);
        const emi12 = Math.round(targetAmount / 12);

        const emiTargetPercent = monthlySurplus > 0 ? Math.round((emiTarget / monthlySurplus) * 100) : 100;
        const emi12Percent = monthlySurplus > 0 ? Math.round((emi12 / monthlySurplus) * 100) : 100;

        lines.push(`1. ${monthsToUse}-Month Savings / EMI Plan (Target Timeline):`);
        lines.push(`   • Monthly Target: ${fmt(emiTarget)}/month for ${monthsToUse} months.`);
        lines.push(`   • Impact: Consumes ${emiTargetPercent}% of your ${fmt(monthlySurplus)} monthly surplus. Leaves ${fmt(Math.max(0, monthlySurplus - emiTarget))} free savings every month.`);

        if (monthsToUse !== 12) {
          lines.push(`2. 12-Month Extended EMI / Savings Plan (Lower Monthly Impact):`);
          lines.push(`   • Monthly Target: ${fmt(emi12)}/month for 12 months.`);
          lines.push(`   • Impact: Consumes ${emi12Percent}% of your monthly surplus. Leaves ${fmt(Math.max(0, monthlySurplus - emi12))} free savings every month.`);
        }

        const monthsToSave = monthlySurplus > 0 ? (targetAmount / monthlySurplus).toFixed(1) : 'N/A';
        lines.push(`3. Full Cash Accumulation Strategy:`);
        lines.push(`   • Accumulate your monthly surplus of ${fmt(monthlySurplus)} for ~${monthsToSave} months to purchase it 100% debt-free.`);
      } else {
        const safeOneTimeCap = Math.round(totalLiquid * 0.3);
        const safeEmiCap = Math.round(monthlySurplus * 0.3);

        lines.push(``);
        lines.push(`ANALYSIS & AFFORDABILITY LIMITS`);
        lines.push(`• Safe One-Time Full Cash Limit: ${fmt(safeOneTimeCap)} (maintains 70%+ emergency runway buffer)`);
        lines.push(`• Safe Monthly EMI Commitment Cap: ${fmt(safeEmiCap)}/month (max 30% of monthly surplus)`);

        lines.push(``);
        lines.push(`RECOMMENDATION`);
        lines.push(`1. Cash Purchase: If the purchase costs under ${fmt(safeOneTimeCap)}, you can comfortably afford it without compromising your cash reserves.`);
        lines.push(`2. EMI Purchase: For higher cost purchases, keep monthly EMI payments below ${fmt(safeEmiCap)}/month.`);
        lines.push(`3. Instant Tool: Click the "Can I Afford This?" button in the top action bar to simulate exact prices, EMI plans, and cash flow impacts!`);
      }

      return lines.join('\n');
    }

    // LEVEL 4 FINANCIAL ADVICE
    if (intent === 'FINANCIAL_ADVICE') {
      const overview = results['getFinancialOverview'];
      const cashFlow = results['getCashFlowAnalysis'];
      const catAnalysis = results['getCategoryAnalysis'];
      const cards = results['getCreditCardAnalysis'];
      const recurring = results['getRecurringExpenseAnalysis'];
      const debts = results['getDebtsSummary'];

      const income = cashFlow?.inflow || overview?.totalIncome || 0;
      const expenses = cashFlow?.outflow || overview?.totalExpenses || 0;
      const savings = cashFlow?.netCashFlow || overview?.netSavings || 0;
      const savingsRate = cashFlow?.savingsRate || 0;

      const lines: string[] = [];
      lines.push(`ANSWER`);
      lines.push(`Here is your comprehensive personal financial health analysis & savings guidance.`);

      lines.push(``);
      lines.push(`FACTS`);
      lines.push(`• Monthly Income: ${fmt(income)} | Expenses: ${fmt(expenses)} | Savings: ${fmt(savings)}`);
      lines.push(`• Savings Rate: ${savingsRate}% | Total Liquid Assets: ${fmt(overview?.totalBalance || 0)}`);
      if (cards && cards.totalOutstandingAmount > 0) {
        lines.push(`• Credit Card Outstanding Debt: ${fmt(cards.totalOutstandingAmount)}`);
      }
      if (recurring) {
        lines.push(`• Active Subscriptions: ${recurring.activeSubscriptionsCount} (${fmt(recurring.monthlySubscriptionCost)}/month)`);
      }

      lines.push(``);
      lines.push(`ANALYSIS`);
      if (catAnalysis && catAnalysis.topDriver) {
        lines.push(`• Primary Expense Area: '${catAnalysis.topDriver.categoryName}' at ${fmt(catAnalysis.topDriver.currentAmount)} (${catAnalysis.topDriver.percentageChange}% change vs historical avg).`);
      }
      if (debts && debts.totalOwedToMe > 0) {
        lines.push(`• Pending Loans Owed to You: ${fmt(debts.totalOwedToMe)}.`);
      }

      lines.push(``);
      lines.push(`RECOMMENDATION`);
      let count = 1;
      if (cards && cards.totalOutstandingAmount > 0) {
        lines.push(`${count++}. Clear high-interest credit card debt of ${fmt(cards.totalOutstandingAmount)} to boost net worth.`);
      }
      if (catAnalysis && catAnalysis.topDriver) {
        const potential = Number((catAnalysis.topDriver.currentAmount * 0.2).toFixed(0));
        lines.push(`${count++}. Trim 20% in '${catAnalysis.topDriver.categoryName}' to save an additional ${fmt(potential)}/month.`);
      }
      if (recurring && recurring.activeSubscriptionsCount > 0) {
        lines.push(`${count++}. Audit active subscriptions (${fmt(recurring.annualSubscriptionCost)}/year) to eliminate unused plans.`);
      }

      return lines.join('\n');
    }

    // LEVEL 1 SIMPLE FACTS
    const singleData = results[Object.keys(results)[0]];

    switch (intent) {
      case 'SEARCH_FINANCIAL_DATA': {
        const data = singleData;
        const parts: string[] = [];

        if (data && data.matchingDebts && data.matchingDebts.length > 0) {
          parts.push(`Debt/Loan Records matching '${data.searchTerm}':`);
          data.matchingDebts.forEach((d: any) => {
            const rel = d.type === 'OWED_TO_ME' ? 'Owes you' : 'You owe them';
            parts.push(`• ${d.personName}: ${rel} ${fmt(d.remainingAmount)} (Total: ${fmt(d.amount)}, Settled: ${fmt(d.settledAmount)}, Status: ${d.status})${d.notes ? ` - "${d.notes}"` : ''}`);
          });
        }

        if (data && data.matchingTransactions && data.matchingTransactions.length > 0) {
          if (parts.length > 0) parts.push('');
          parts.push(`Transactions matching '${data.searchTerm}':`);
          data.matchingTransactions.slice(0, 5).forEach((t: any) => {
            const dateStr = new Date(t.transactionDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
            parts.push(`• ${t.type} of ${fmt(t.amount)} on ${dateStr} (${t.merchant || t.description || 'Transaction'}) via ${t.paymentMethod}`);
          });
          if (data.matchingTransactions.length > 5) {
            parts.push(`...and ${data.matchingTransactions.length - 5} more matching transaction(s).`);
          }
        }

        if (data && data.matchingSubscriptions && data.matchingSubscriptions.length > 0) {
          if (parts.length > 0) parts.push('');
          parts.push(`Subscriptions matching '${data.searchTerm}':`);
          data.matchingSubscriptions.forEach((s: any) => {
            parts.push(`• ${s.name}: ${fmt(s.amount)} (${s.billingCycle}) - Status: ${s.status}`);
          });
        }

        if (parts.length === 0) {
          return `I searched your financial ledger for '${data?.searchTerm || query}', but found no matching debt records, transactions, subscriptions, or accounts.`;
        }

        return parts.join('\n');
      }

      case 'EXPENSE_BY_CATEGORY':
        if (!singleData || singleData.found === false) {
          return `I searched your records, but '${query}' was not found. Available categories are: ${singleData?.availableCategories?.join(', ')}.`;
        }
        if (singleData.totalSpent === 0) {
          return `You haven't recorded any expenses under '${singleData.categoryName}' for ${singleData.period}.`;
        }

        const accountTotals: Record<string, number> = {};
        singleData.transactions.forEach((transaction: any) => {
          const accountName = transaction.account || 'Unknown account';
          accountTotals[accountName] = (accountTotals[accountName] || 0) + transaction.amount;
        });

        const accountBreakdown = Object.entries(accountTotals).map(
          ([accountName, total]) => `• ${accountName}: ${fmt(total)}`
        );

        const transactionDetails = singleData.transactions.map((transaction: any) => {
          const date = new Date(transaction.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const merchant = transaction.merchant || transaction.description || 'Unknown merchant';

          return `• ${fmt(transaction.amount)} on ${date} at ${merchant} from ${transaction.account} via ${transaction.paymentMethod}`;
        });

        return [
          `You spent ${fmt(singleData.totalSpent)} on '${singleData.categoryName}' for ${singleData.period} across ${singleData.count} transaction(s).`,
          '',
          'By account:',
          ...accountBreakdown,
          '',
          'Transaction details:',
          ...transactionDetails,
        ].join('\n');

      case 'EXPENSE_BY_ACCOUNT_AND_CATEGORY':
        return `Your spending under '${singleData?.categoryFilter}' using '${singleData?.accountFilter}' totals ${fmt(singleData?.totalSpent)} across ${singleData?.count} transaction(s).`;

      case 'MERCHANT_SPENDING': {
        if (singleData?.count === 0) {
          return `You have no recorded expenses matching '${singleData?.merchantName}' for ${singleData?.period}.`;
        }

        const merchantTxDetails = (singleData?.transactions || []).map((t: any) => {
          const date = new Date(t.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const itemDesc = t.merchant || t.description || 'Expense';
          const cat = t.category || 'Uncategorized';
          const acc = t.account || 'Account';
          return `• ${fmt(t.amount)} on ${date} (${itemDesc}) [Category: ${cat}] from ${acc} via ${t.paymentMethod}`;
        });

        return [
          `You spent ${fmt(singleData?.totalSpent)} matching '${singleData?.merchantName}' for ${singleData?.period} across ${singleData?.count} transaction(s).`,
          ...(merchantTxDetails.length > 0 ? ['', 'Transaction details:', ...merchantTxDetails] : []),
        ].join('\n');
      }

      case 'EXPENSE_BY_PAYMENT_METHOD':
        return `Your spending using '${singleData?.paymentMethod}' is ${fmt(singleData?.totalSpent)} (${singleData?.percentage}% of total expenses).`;

      case 'MONTHLY_EXPENSES':
        return `Your total expenses for ${singleData?.period} are ${fmt(singleData?.totalExpenses)} across ${singleData?.count} transaction(s).`;

      case 'MONTHLY_INCOME':
        return `Your verified income for ${singleData?.period} is ${fmt(singleData?.totalIncome)} across ${singleData?.count} payment(s).`;

      case 'CURRENT_BALANCE':
        return `Your current total liquid balance is ${fmt(singleData?.totalBalance)} (Bank: ${fmt(singleData?.bankBalances)}, UPI: ${fmt(singleData?.upiBalances)}, Cash: ${fmt(singleData?.cashBalances)}, Prev Month Saved: ${fmt(singleData?.previousMonthSavings)}).`;

      case 'CREDIT_CARD_SUMMARY':
        return `Your total credit card outstanding debt is ${fmt(singleData?.totalOutstandingAmount)} with available credit of ${fmt(singleData?.totalAvailableCredit)}. Total card spending is ${fmt(singleData?.totalCreditCardSpending)}.`;

      case 'SUBSCRIPTION_SUMMARY':
        return `You have ${singleData?.activeSubscriptionCount} active recurring subscription(s) costing ${fmt(singleData?.totalNormalizedMonthlyCost)} per month (projected ${fmt(singleData?.totalNormalizedAnnualCost)} annually).`;

      case 'DEBT_SUMMARY':
        return `People owe you ${fmt(singleData?.totalOwedToMe)} (They Owe Me) and you owe others ${fmt(singleData?.totalIOwe)} (I Owe). Net debt balance is ${fmt(singleData?.netOutstanding)}.`;

      default:
        return `Here is your requested financial summary based on your actual ledger records.`;
    }
  }

  private generateSuggestedFollowUps(intent: string): string[] {
    switch (intent) {
      case 'FINANCIAL_ADVICE':
      case 'SPENDING_INCREASE_ANALYSIS':
        return [
          'What if I reduce food spending by ₹3,000/month?',
          'When will I reach 5 Lakh savings?',
          'What are my largest recurring expenses?',
          'How much did I spend using my credit card?',
        ];
      case 'SCENARIO_REDUCE_SPEND':
      case 'SCENARIO_SAVINGS_GOAL':
        return [
          'When will I reach 10 Lakh savings?',
          'How can I save more?',
          'Compare this month with last month.',
        ];
      case 'EXPENSE_BY_CATEGORY':
        return [
          'How much did I spend using my credit card?',
          'What are my recurring expenses?',
          'Compare this month with last month.',
        ];
      default:
        return [
          'Why did I spend more this month?',
          'How can I save more?',
          'What if I reduce food spending by ₹3,000/month?',
          'How much money do people owe me?',
        ];
    }
  }
}

