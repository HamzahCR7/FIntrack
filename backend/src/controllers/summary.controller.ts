import { Request, Response, NextFunction, Router } from 'express';
import { TransactionService } from '../services/transaction.service';

export class SummaryController {
  public router = Router();
  private transactionService = new TransactionService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', this.getSummary);
  }

  private getSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await this.transactionService.getFinancialSummary();
      res.status(200).json({ status: 'success', data: summary });
    } catch (err) {
      next(err);
    }
  };
}
