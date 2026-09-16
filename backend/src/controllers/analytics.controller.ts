import { Request, Response, NextFunction, Router } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { ProactiveInsightsService } from '../services/proactiveInsights.service';
import { FinancialAnalysisEngine } from '../services/financialAnalysis.engine';
import { z } from 'zod';

export class AnalyticsController {
  public router = Router();
  private analyticsService = new AnalyticsService();
  private insightsService = new ProactiveInsightsService();
  private analysisEngine = new FinancialAnalysisEngine();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/dashboard', this.getDashboardData);
    this.router.get('/insights', this.getInsights);
    this.router.get('/forecast', this.getForecast);
    this.router.post('/runway-simulation', this.getRunwaySimulation);
    this.router.post('/insights/:id/feedback', this.saveInsightFeedback);
  }

  private getDashboardData = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.analyticsService.getDashboardData();
      const insights = await this.insightsService.generateInsights();
      const forecast = await this.analysisEngine.getSpendForecast();
      res.status(200).json({ status: 'success', data: { ...data, proactiveInsights: insights, forecast } });
    } catch (err) {
      next(err);
    }
  };

  private getInsights = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const insights = await this.insightsService.generateInsights();
      res.status(200).json({ status: 'success', data: insights });
    } catch (err) {
      next(err);
    }
  };

  private getForecast = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const forecast = await this.analysisEngine.getSpendForecast();
      res.status(200).json({ status: 'success', data: forecast });
    } catch (err) {
      next(err);
    }
  };

  private getRunwaySimulation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = z
        .object({
          months: z.number().int().min(3).max(24).default(12),
          salaryChangePercent: z.number().min(-90).max(300).default(0),
          rentChangePercent: z.number().min(-90).max(300).default(0),
          cancelSubscriptionsCount: z.number().int().min(0).max(20).default(0),
          extraMonthlyEmi: z.number().min(0).max(10000000).default(0),
        })
        .parse(req.body);

      const result = await this.analysisEngine.getRunwaySimulation(payload);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  };

  private saveInsightFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { isUseful } = z.object({ isUseful: z.boolean() }).parse(req.body);
      await this.insightsService.saveFeedback(req.params.id, isUseful);
      res.status(200).json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  };
}
