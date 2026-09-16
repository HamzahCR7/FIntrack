import { Request, Response, NextFunction, Router } from 'express';
import { AccountService } from '../services/account.service';
import { validateBody } from '../common/middleware/validateRequest';
import { CreateAccountSchema, UpdateAccountSchema } from '../dtos/account.dto';

export class AccountController {
  public router = Router();
  private accountService = new AccountService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', this.getAllAccounts);
    this.router.get('/:id', this.getAccountById);
    this.router.post('/', validateBody(CreateAccountSchema), this.createAccount);
    this.router.patch('/:id', validateBody(UpdateAccountSchema), this.updateAccount);
    this.router.delete('/:id', this.deleteAccount);
  }

  private getAllAccounts = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const accounts = await this.accountService.getAllAccounts();
      res.status(200).json({ status: 'success', data: accounts });
    } catch (err) {
      next(err);
    }
  };

  private getAccountById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await this.accountService.getAccountById(req.params.id);
      res.status(200).json({ status: 'success', data: account });
    } catch (err) {
      next(err);
    }
  };

  private createAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await this.accountService.createAccount(req.body);
      res.status(201).json({ status: 'success', data: account });
    } catch (err) {
      next(err);
    }
  };

  private updateAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await this.accountService.updateAccount(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: account });
    } catch (err) {
      next(err);
    }
  };

  private deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await this.accountService.deleteAccount(req.params.id);
      res.status(200).json({ status: 'success', message: 'Account deactivated', data: account });
    } catch (err) {
      next(err);
    }
  };
}
