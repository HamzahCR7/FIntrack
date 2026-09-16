import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { FinancialAnalysisEngine } from './financialAnalysis.engine';
import { AnalyticsService } from './analytics.service';
import { CreditCardService } from './creditCard.service';
import { SubscriptionService } from './subscription.service';
import { FinancialProfileService } from './financialProfile.service';

export interface ProactiveInsight {
  id: string;
  type: 'SPENDING_INCREASE' | 'ANOMALY_DETECTED' | 'CREDIT_DEBT_ALERT' | 'SUBSCRIPTION_SHARE' | 'SAVINGS_RATE_HEALTH' | 'FORECAST_OVERSPEND';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  observation: string;
  supportingData: string;
  comparisonBaseline: string;
  recommendation: string;
}

export class ProactiveInsightsService {
  constructor(
    private db: PrismaClient = defaultPrisma,
    private analysisEngine = new FinancialAnalysisEngine(db),
    private analyticsService = new AnalyticsService(db),
    private creditCardService = new CreditCardService(db),
    private subscriptionService = new SubscriptionService(db),
    private profileService = new FinancialProfileService(db)
  ) {}

  async generateInsights(): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    const fmt = (val: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    const dashboard = await this.analyticsService.getDashboardData();
    const catAnalysis = await this.analysisEngine.getCategoryAnalysis();
    const anomalies = await this.analysisEngine.getSpendingAnomalies();
    const cards = await this.creditCardService.getCreditCardAnalytics();
    const subs = await this.subscriptionService.getSubscriptionAnalytics();
    const profile = await this.profileService.getProfile();
    const forecast = await this.analysisEngine.getSpendForecast();

    // 1. Top Category Spending Driver Insight
    if (catAnalysis.topDriver && catAnalysis.topDriver.deltaFromAverage > 0) {
      const top = catAnalysis.topDriver;
      insights.push({
        id: 'insight-category-driver',
        type: 'SPENDING_INCREASE',
        severity: top.percentageChange > 30 ? 'HIGH' : 'MEDIUM',
        observation: `Unusual spending increase detected in '${top.categoryName}'.`,
        supportingData: `Current month spend is ${fmt(top.currentAmount)}, which is +${top.percentageChange}% higher than your historical baseline.`,
        comparisonBaseline: `Historical monthly average: ${fmt(top.historicalAverage)}.`,
        recommendation: `Review category expenses in '${top.categoryName}' to save approximately ${fmt(top.deltaFromAverage)} monthly.`,
      });
    }

    // 2. Outlier Transaction Anomaly Insight
    if (anomalies.anomalyCount && anomalies.anomalyCount > 0 && anomalies.anomalies && anomalies.anomalies.length > 0) {
      const topAnomaly = anomalies.anomalies[0];
      insights.push({
        id: 'insight-anomaly-detected',
        type: 'ANOMALY_DETECTED',
        severity: 'HIGH',
        observation: `Large unusual transaction detected: ${fmt(topAnomaly.amount)} at '${topAnomaly.merchant}'.`,
        supportingData: `Transaction of ${fmt(topAnomaly.amount)} on ${new Date(topAnomaly.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} via ${topAnomaly.paymentMethod}.`,
        comparisonBaseline: `Exceeds calculated anomaly threshold of ${fmt(anomalies.thresholdAmount || 0)}.`,
        recommendation: `Verify if this large expense was a one-time payment or needs recurring budget adjustment.`,
      });
    }

    // 3. High Credit Card Outstanding Debt Insight
    if (cards.totalOutstandingAmount > 0) {
      const highestCard = cards.cards.sort((a, b) => b.currentOutstanding - a.currentOutstanding)[0];
      insights.push({
        id: 'insight-credit-debt',
        type: 'CREDIT_DEBT_ALERT',
        severity: highestCard && highestCard.utilizationPercentage > 50 ? 'HIGH' : 'MEDIUM',
        observation: `Active credit card debt of ${fmt(cards.totalOutstandingAmount)} across ${cards.totalCreditCardsCount} card(s).`,
        supportingData: `${highestCard.name} has ${fmt(highestCard.currentOutstanding)} debt (${highestCard.utilizationPercentage}% credit limit utilization).`,
        comparisonBaseline: `Available total credit: ${fmt(cards.totalAvailableCredit)}.`,
        recommendation: `Pay off active credit card balances to avoid high interest charges and preserve your credit score.`,
      });
    }

    // 4. Subscriptions Share Insight
    if (subs.activeSubscriptionCount > 0) {
      const totalExp = dashboard.summary.spendingThisMonth || dashboard.summary.totalExpenses;
      const share = totalExp > 0 ? Number(((subs.totalNormalizedMonthlyCost / totalExp) * 100).toFixed(1)) : 0;
      insights.push({
        id: 'insight-subscriptions-share',
        type: 'SUBSCRIPTION_SHARE',
        severity: share > 15 ? 'MEDIUM' : 'LOW',
        observation: `You have ${subs.activeSubscriptionCount} active subscription(s) costing ${fmt(subs.totalNormalizedMonthlyCost)}/month.`,
        supportingData: `Subscriptions account for ${share}% of your total monthly expenses (${fmt(subs.totalNormalizedAnnualCost)} projected yearly).`,
        comparisonBaseline: `Healthy subscription threshold is < 10% of total monthly expenses.`,
        recommendation: `Review unused subscriptions to lower fixed monthly recurring costs.`,
      });
    }

    // 5. Savings Rate Health Insight
    const inc = dashboard.summary.incomeThisMonth || dashboard.summary.totalIncome;
    const sav = dashboard.summary.savingsThisMonth;
    const savingsRate = inc > 0 ? Number(((sav / inc) * 100).toFixed(1)) : 0;
    insights.push({
      id: 'insight-savings-health',
      type: 'SAVINGS_RATE_HEALTH',
      severity: savingsRate >= 20 ? 'LOW' : 'HIGH',
      observation: `Current monthly savings rate is ${savingsRate}% (${fmt(sav)} saved out of ${fmt(inc)} income).`,
      supportingData: `Previous month savings carried over: ${fmt(dashboard.summary.previousMonthSavings)}.`,
      comparisonBaseline: `Your savings-rate target is ${profile.preferredSavingsRate || 20}%.`,
      recommendation: savingsRate >= (profile.preferredSavingsRate || 20)
        ? `Great job! Your savings rate is healthy. Keep building your liquid emergency fund.`
        : `Aim to increase your savings rate to at least ${profile.preferredSavingsRate || 20}% by curbing discretionary spending.`,
    });

    // 6. Spend Forecast Overspend Warning
    if (forecast.willOverspend) {
      insights.push({
        id: 'insight-forecast-overspend',
        type: 'FORECAST_OVERSPEND',
        severity: forecast.projectedOverspend > forecast.incomeThisMonth * 0.15 ? 'HIGH' : 'MEDIUM',
        observation: `At your current pace, you're projected to overspend by ${fmt(forecast.projectedOverspend)} this month.`,
        supportingData: `Spent ${fmt(forecast.spendingSoFar)} in ${forecast.daysElapsed} day(s), averaging ${fmt(forecast.dailyBurnRate)}/day. Projected month-end spend: ${fmt(forecast.projectedMonthEndSpend)}.`,
        comparisonBaseline: `Monthly income: ${fmt(forecast.incomeThisMonth)}.`,
        recommendation: `Cut daily spending by roughly ${fmt(forecast.projectedOverspend / Math.max(1, forecast.daysRemaining))} for the remaining ${forecast.daysRemaining} day(s) to stay within income.`,
      });
    }

    // 7. Budget-At-Risk Forecast Insight
    const budgetAtRisk = forecast.budgetForecasts.find((b) => b.willExceed);
    if (budgetAtRisk) {
      insights.push({
        id: 'insight-forecast-budget-risk',
        type: 'FORECAST_OVERSPEND',
        severity: 'MEDIUM',
        observation: `Budget '${budgetAtRisk.budgetName}' is projected to exceed its limit this cycle.`,
        supportingData: `Spent ${fmt(budgetAtRisk.spentSoFar)} so far; projected to reach ${fmt(budgetAtRisk.projectedSpend)} against a limit of ${fmt(budgetAtRisk.budgetAmount)}.`,
        comparisonBaseline: `Budget limit: ${fmt(budgetAtRisk.budgetAmount)}.`,
        recommendation: `Cut back spending in this budget's categories by ${fmt(budgetAtRisk.projectedOverBudget)} to stay on track.`,
      });
    }

    const rejectedInsights = await this.db.insightFeedback.findMany({ where: { isUseful: false } });
    const rejectedIds = new Set(rejectedInsights.map((feedback) => feedback.insightId));
    return insights.filter((insight) => !rejectedIds.has(insight.id));
  }

  async saveFeedback(insightId: string, isUseful: boolean) {
    return this.db.insightFeedback.upsert({
      where: { insightId },
      create: { insightId, isUseful },
      update: { isUseful },
    });
  }
}
