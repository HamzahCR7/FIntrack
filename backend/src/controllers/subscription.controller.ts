import { Request, Response, NextFunction, Router } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { validateBody, validateQuery } from '../common/middleware/validateRequest';
import {
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  QuerySubscriptionSchema,
} from '../dtos/subscription.dto';
import { SubscriptionStatus } from '../types/enums';

export class SubscriptionController {
  public router = Router();
  private subscriptionService = new SubscriptionService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', validateQuery(QuerySubscriptionSchema), this.getAllSubscriptions);
    this.router.get('/analytics', this.getSubscriptionAnalytics);
    this.router.get('/upcoming', this.getUpcomingPayments);
    this.router.get('/:id', this.getSubscriptionById);
    this.router.post('/', validateBody(CreateSubscriptionSchema), this.createSubscription);
    this.router.patch('/:id', validateBody(UpdateSubscriptionSchema), this.updateSubscription);
    this.router.post('/:id/cancel', this.cancelSubscription);
    this.router.post('/:id/status', this.toggleStatus);
    this.router.post('/:id/process-payment', this.processPayment);
  }

  private getAllSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscriptions = await this.subscriptionService.getAllSubscriptions(req.query as any);
      res.status(200).json({ status: 'success', count: subscriptions.length, data: subscriptions });
    } catch (err) {
      next(err);
    }
  };

  private getSubscriptionAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await this.subscriptionService.getSubscriptionAnalytics();
      res.status(200).json({ status: 'success', data: analytics });
    } catch (err) {
      next(err);
    }
  };

  private getUpcomingPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string, 10) : 30;
      const upcoming = await this.subscriptionService.getUpcomingPayments(daysAhead);
      res.status(200).json({ status: 'success', count: upcoming.length, data: upcoming });
    } catch (err) {
      next(err);
    }
  };

  private getSubscriptionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await this.subscriptionService.getSubscriptionById(req.params.id);
      res.status(200).json({ status: 'success', data: subscription });
    } catch (err) {
      next(err);
    }
  };

  private createSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await this.subscriptionService.createSubscription(req.body);
      res.status(201).json({ status: 'success', data: subscription });
    } catch (err) {
      next(err);
    }
  };

  private updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await this.subscriptionService.updateSubscription(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: subscription });
    } catch (err) {
      next(err);
    }
  };

  private cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await this.subscriptionService.cancelSubscription(req.params.id);
      res.status(200).json({ status: 'success', message: 'Subscription cancelled', data: subscription });
    } catch (err) {
      next(err);
    }
  };

  private toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.body.status as SubscriptionStatus;
      const subscription = await this.subscriptionService.toggleStatus(req.params.id, status);
      res.status(200).json({ status: 'success', data: subscription });
    } catch (err) {
      next(err);
    }
  };

  private processPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.subscriptionService.processPayment(req.params.id);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  };
}
