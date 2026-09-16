import { Request, Response, NextFunction, Router } from 'express';
import { TransactionService } from '../services/transaction.service';
import { validateBody, validateQuery } from '../common/middleware/validateRequest';
import { CreateTransactionSchema, QueryTransactionSchema } from '../dtos/transaction.dto';
import { AutoUpiIngestSchema } from '../dtos/upiAutoIngest.dto';
import { UnauthorizedError, BadRequestError } from '../common/errors';
import { UpiAutoIngestService } from '../services/upiAutoIngest.service';

export class TransactionController {
  public router = Router();
  private transactionService = new TransactionService();
  private upiAutoIngestService = new UpiAutoIngestService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', validateQuery(QueryTransactionSchema), this.getTransactions);
    this.router.get('/:id', this.getTransactionById);
    this.router.post('/auto-upi-ingest', validateBody(AutoUpiIngestSchema), this.autoIngestUpiTransaction);
    this.router.post('/', validateBody(CreateTransactionSchema), this.createTransaction);
    this.router.put('/:id', validateBody(CreateTransactionSchema), this.updateTransaction);
    this.router.patch('/:id', validateBody(CreateTransactionSchema), this.updateTransaction);
    this.router.delete('/:id', this.deleteTransaction);
  }

  private autoIngestUpiTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configuredSecret = process.env.UPI_WEBHOOK_SECRET;
      if (!configuredSecret) {
        throw new BadRequestError('UPI auto-ingest is not configured. Set UPI_WEBHOOK_SECRET in backend environment.');
      }

      const providedSecret = req.header('x-upi-webhook-secret');
      if (!providedSecret || providedSecret !== configuredSecret) {
        throw new UnauthorizedError('Invalid webhook secret for UPI auto-ingest endpoint.');
      }

      const result = await this.upiAutoIngestService.ingestFromMessage(req.body);

      res.status(result.created ? 201 : 200).json({
        status: 'success',
        autoIngested: result.created,
        duplicate: result.duplicate,
        data: result.transaction,
      });
    } catch (err) {
      next(err);
    }
  };

  private getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactions = await this.transactionService.getTransactions(req.query as any);
      res.status(200).json({ status: 'success', count: transactions.length, data: transactions });
    } catch (err) {
      next(err);
    }
  };

  private getTransactionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await this.transactionService.getTransactionById(req.params.id);
      res.status(200).json({ status: 'success', data: transaction });
    } catch (err) {
      next(err);
    }
  };

  private createTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await this.transactionService.createTransaction(req.body);
      res.status(201).json({ status: 'success', data: transaction });
    } catch (err) {
      next(err);
    }
  };

  private updateTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await this.transactionService.updateTransaction(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: transaction });
    } catch (err) {
      next(err);
    }
  };

  private deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await this.transactionService.deleteTransaction(req.params.id);
      res.status(200).json({ status: 'success', message: 'Transaction deleted and account balances reverted', data: transaction });
    } catch (err) {
      next(err);
    }
  };
}
