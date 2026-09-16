import { Request, Response, NextFunction, Router } from 'express';
import { FinancialProfileService } from '../services/financialProfile.service';
import { validateBody } from '../common/middleware/validateRequest';
import { UpdateFinancialProfileSchema } from '../dtos/financialProfile.dto';

export class FinancialProfileController {
  public router = Router();
  private profileService = new FinancialProfileService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', this.getProfile);
    this.router.patch('/', validateBody(UpdateFinancialProfileSchema), this.updateProfile);
  }

  private getProfile = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.profileService.getProfile();
      res.status(200).json({ status: 'success', data: profile });
    } catch (err) {
      next(err);
    }
  };

  private updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.profileService.updateProfile(req.body);
      res.status(200).json({ status: 'success', data: profile });
    } catch (err) {
      next(err);
    }
  };
}
