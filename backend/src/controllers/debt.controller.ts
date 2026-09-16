import { Request, Response, NextFunction, Router } from 'express';
import { DebtService } from '../services/debt.service';
import { validateBody, validateQuery } from '../common/middleware/validateRequest';
import { CreateDebtSchema, SettleDebtSchema, QueryDebtSchema } from '../dtos/debt.dto';

export class DebtController {
  public router = Router();
  private debtService = new DebtService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', validateQuery(QueryDebtSchema), this.getDebts);
    this.router.get('/summary', this.getDebtSummary);
    this.router.get('/:id', this.getDebtById);
    this.router.post('/', validateBody(CreateDebtSchema), this.createDebt);
    this.router.patch('/:id', validateBody(CreateDebtSchema), this.updateDebt);
    this.router.post('/:id/settle', validateBody(SettleDebtSchema), this.settleDebt);
    this.router.delete('/:id', this.deleteDebt);
  }

  private getDebts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const debts = await this.debtService.getDebts(req.query as any);
      res.status(200).json({ status: 'success', count: debts.length, data: debts });
    } catch (err) {
      next(err);
    }
  };

  private getDebtSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await this.debtService.getDebtSummary();
      res.status(200).json({ status: 'success', data: summary });
    } catch (err) {
      next(err);
    }
  };

  private getDebtById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const debt = await this.debtService.getDebtById(req.params.id);
      res.status(200).json({ status: 'success', data: debt });
    } catch (err) {
      next(err);
    }
  };

  private createDebt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const debt = await this.debtService.createDebt(req.body);
      res.status(201).json({ status: 'success', data: debt });
    } catch (err) {
      next(err);
    }
  };

  private updateDebt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const debt = await this.debtService.updateDebt(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: debt });
    } catch (err) {
      next(err);
    }
  };

  private settleDebt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const debt = await this.debtService.settleDebt(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: debt });
    } catch (err) {
      next(err);
    }
  };

  private deleteDebt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const debt = await this.debtService.deleteDebt(req.params.id);
      res.status(200).json({ status: 'success', message: 'Debt record deleted', data: debt });
    } catch (err) {
      next(err);
    }
  };
}
