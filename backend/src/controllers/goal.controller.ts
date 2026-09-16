import { Request, Response, NextFunction, Router } from 'express';
import { GoalService } from '../services/goal.service';
import { validateBody } from '../common/middleware/validateRequest';
import { CreateGoalSchema, UpdateGoalSchema } from '../dtos/goal.dto';

export class GoalController {
  public router = Router();
  private goalService = new GoalService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', this.getAllGoals);
    this.router.get('/active', this.getActiveGoals);
    this.router.get('/:id', this.getGoalById);
    this.router.post('/', validateBody(CreateGoalSchema), this.createGoal);
    this.router.patch('/:id', validateBody(UpdateGoalSchema), this.updateGoal);
    this.router.post('/:id/progress', this.updateGoalProgress);
    this.router.post('/:id/increment', this.incrementGoalProgress);
    this.router.post('/:id/complete', this.completeGoal);
    this.router.post('/:id/pause', this.pauseGoal);
    this.router.post('/:id/resume', this.resumeGoal);
    this.router.delete('/:id', this.deleteGoal);
  }

  private getAllGoals = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const goals = await this.goalService.getAllGoals();
      res.status(200).json({ status: 'success', data: goals });
    } catch (err) {
      next(err);
    }
  };

  private getActiveGoals = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const goals = await this.goalService.getActiveGoals();
      res.status(200).json({ status: 'success', data: goals });
    } catch (err) {
      next(err);
    }
  };

  private getGoalById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const goal = await this.goalService.getGoalById(id);
      res.status(200).json({ status: 'success', data: goal });
    } catch (err) {
      next(err);
    }
  };

  private createGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goal = await this.goalService.createGoal(req.body);
      res.status(201).json({ status: 'success', data: goal });
    } catch (err) {
      next(err);
    }
  };

  private updateGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const goal = await this.goalService.updateGoal(id, req.body);
      res.status(200).json({ status: 'success', data: goal });
    } catch (err) {
      next(err);
    }
  };

  private updateGoalProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { currentAmount } = req.body;

      if (currentAmount === undefined || typeof currentAmount !== 'number') {
        res.status(400).json({ status: 'error', message: 'currentAmount is required and must be a number' });
        return;
      }

      const goal = await this.goalService.updateGoalProgress(id, currentAmount);
      res.status(200).json({ status: 'success', data: goal });
    } catch (err) {
      next(err);
    }
  };

  private incrementGoalProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      if (amount === undefined || typeof amount !== 'number') {
        res.status(400).json({ status: 'error', message: 'amount is required and must be a number' });
        return;
      }

      const goal = await this.goalService.incrementGoalProgress(id, amount);
      res.status(200).json({ status: 'success', data: goal });
    } catch (err) {
      next(err);
    }
  };

  private completeGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const goal = await this.goalService.completeGoal(id);
      res.status(200).json({ status: 'success', data: goal });
    } catch (err) {
      next(err);
    }
  };

  private pauseGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const goal = await this.goalService.pauseGoal(id);
      res.status(200).json({ status: 'success', data: goal });
    } catch (err) {
      next(err);
    }
  };

  private resumeGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const goal = await this.goalService.resumeGoal(id);
      res.status(200).json({ status: 'success', data: goal });
    } catch (err) {
      next(err);
    }
  };

  private deleteGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.goalService.deleteGoal(id);
      res.status(200).json({ status: 'success', message: 'Goal deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
