import { NextFunction, Request, Response, Router } from 'express';
import { validateBody } from '../common/middleware/validateRequest';
import { EmailReportDto, EmailReportSchema } from '../dtos/report.dto';
import { ReportService } from '../services/report.service';

export class ReportController {
  public router = Router();
  private reports = new ReportService();

  constructor() {
    this.router.get('/settings', this.getSettings);
    this.router.post('/email', validateBody(EmailReportSchema), this.emailReport);
  }

  private getSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.reports.getSettings();
      res.json({ status: 'success', data: settings });
    } catch (error) { next(error); }
  };

  private emailReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as EmailReportDto;
      const result = await this.reports.emailReport({
        email: body.email,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        periodLabel: body.periodLabel,
        enableMonthly: body.enableMonthly,
      });
      res.json({ status: 'success', message: 'PDF report sent successfully.', data: result });
    } catch (error) { next(error); }
  };
}
