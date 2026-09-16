import { Request, Response, NextFunction, Router } from 'express';
import { BudgetService } from '../services/budget.service';
import { validateBody } from '../common/middleware/validateRequest';
import { CreateBudgetSchema, UpdateBudgetSchema } from '../dtos/budget.dto';

export class BudgetController {
  public router = Router();
  private budgetService = new BudgetService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', this.getAllBudgets);
    this.router.get('/status/:id', this.getBudgetStatus);
    this.router.get('/:id', this.getBudgetById);
    this.router.post('/', validateBody(CreateBudgetSchema), this.createBudget);
    this.router.patch('/:id', validateBody(UpdateBudgetSchema), this.updateBudget);
    this.router.delete('/:id', this.deleteBudget);
  }

  private getAllBudgets = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const budgets = await this.budgetService.getAllBudgets();
      res.status(200).json({ status: 'success', data: budgets });
    } catch (err) {
      next(err);
    }
  };

  private getBudgetById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const budget = await this.budgetService.getBudgetById(id);
      res.status(200).json({ status: 'success', data: budget });
    } catch (err) {
      next(err);
    }
  };

  private getBudgetStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const status = await this.budgetService.getBudgetStatus(id);
      res.status(200).json({ status: 'success', data: status });
    } catch (err) {
      next(err);
    }
  };

  private createBudget = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const budget = await this.budgetService.createBudget(req.body);
      res.status(201).json({ status: 'success', data: budget });
    } catch (err) {
      next(err);
    }
  };

  private updateBudget = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const budget = await this.budgetService.updateBudget(id, req.body);
      res.status(200).json({ status: 'success', data: budget });
    } catch (err) {
      next(err);
    }
  };

  private deleteBudget = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.budgetService.deleteBudget(id);
      res.status(200).json({ status: 'success', message: 'Budget deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
