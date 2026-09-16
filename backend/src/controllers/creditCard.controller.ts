import { Request, Response, NextFunction, Router } from 'express';
import { CreditCardService } from '../services/creditCard.service';
import { validateBody } from '../common/middleware/validateRequest';
import { UpdateCreditCardStatementSchema, PayCreditCardBillSchema } from '../dtos/creditCard.dto';

export class CreditCardController {
  public router = Router();
  private creditCardService = new CreditCardService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', this.getAllCreditCards);
    this.router.get('/analytics', this.getCreditCardAnalytics);
    this.router.get('/:id', this.getCreditCardById);
    this.router.get('/:id/transactions', this.getCardTransactions);
    this.router.patch('/:id/statement', validateBody(UpdateCreditCardStatementSchema), this.updateStatementDetails);
    this.router.post('/pay-bill', validateBody(PayCreditCardBillSchema), this.payCreditCardBill);
  }

  private getAllCreditCards = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const cards = await this.creditCardService.getAllCreditCards();
      res.status(200).json({ status: 'success', count: cards.length, data: cards });
    } catch (err) {
      next(err);
    }
  };

  private getCreditCardAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await this.creditCardService.getCreditCardAnalytics();
      res.status(200).json({ status: 'success', data: analytics });
    } catch (err) {
      next(err);
    }
  };

  private getCreditCardById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await this.creditCardService.getCreditCardById(req.params.id);
      res.status(200).json({ status: 'success', data: card });
    } catch (err) {
      next(err);
    }
  };

  private getCardTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactions = await this.creditCardService.getCardTransactions(req.params.id);
      res.status(200).json({ status: 'success', count: transactions.length, data: transactions });
    } catch (err) {
      next(err);
    }
  };

  private updateStatementDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await this.creditCardService.updateStatementDetails(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: card });
    } catch (err) {
      next(err);
    }
  };

  private payCreditCardBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.creditCardService.payCreditCardBill(req.body);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  };
}
