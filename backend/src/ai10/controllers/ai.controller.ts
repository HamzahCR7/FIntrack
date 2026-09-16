import { Request, Response, NextFunction, Router } from 'express';
import { AIAssistantService } from '../services/aiAssistant.service';
import { validateBody } from '../../common/middleware/validateRequest';
import { AIQuerySchema } from '../dtos/aiQuery.dto';

export class AIController {
  public router = Router();
  private aiService = new AIAssistantService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.post('/query', validateBody(AIQuerySchema), this.processQuery);
  }

  private processQuery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await this.aiService.processUserQuery(req.body);
      res.status(200).json({ status: 'success', engine: 'ai10-canonical-v13', data: response });
    } catch (err) {
      next(err);
    }
  };
}
