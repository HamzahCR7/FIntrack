import { NextFunction, Request, Response, Router } from 'express';
import { validateBody } from '../common/middleware/validateRequest';
import { ParseReceiptSchema } from '../dtos/receipt.dto';
import { ReceiptService } from '../services/receipt.service';

export class ReceiptController {
  public router = Router();
  private receiptService = new ReceiptService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.post('/parse', validateBody(ParseReceiptSchema), this.parseReceipt);
  }

  private parseReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await this.receiptService.parseReceipt(req.body);
      res.status(200).json({ status: 'success', data: parsed });
    } catch (err) {
      next(err);
    }
  };
}
