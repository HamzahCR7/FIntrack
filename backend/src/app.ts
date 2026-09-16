import express, { Application } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { AccountController } from './controllers/account.controller';
import { CategoryController } from './controllers/category.controller';
import { TransactionController } from './controllers/transaction.controller';
import { SummaryController } from './controllers/summary.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { CreditCardController } from './controllers/creditCard.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { DebtController } from './controllers/debt.controller';
import { FinancialProfileController } from './controllers/financialProfile.controller';
import { AuthController } from './controllers/auth.controller';
import { AIController } from './ai10/controllers/ai.controller';
import { QuickItemController } from './controllers/quickItem.controller';
import { BudgetController } from './controllers/budget.controller';
import { GoalController } from './controllers/goal.controller';
import { ReceiptController } from './controllers/receipt.controller';
import { errorHandler } from './common/middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '12mb' }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'FinTrack API', phase: 5 });
  });

  // API V1 Routes
  const accountController = new AccountController();
  const categoryController = new CategoryController();
  const transactionController = new TransactionController();
  const summaryController = new SummaryController();
  const subscriptionController = new SubscriptionController();
  const creditCardController = new CreditCardController();
  const analyticsController = new AnalyticsController();
  const debtController = new DebtController();
  const profileController = new FinancialProfileController();
  const authController = new AuthController();
  const aiController = new AIController();
  const quickItemController = new QuickItemController();
  const budgetController = new BudgetController();
  const goalController = new GoalController();
  const receiptController = new ReceiptController();

  app.use('/api/v1/auth', authController.router);
  app.use('/api/v1/accounts', accountController.router);
  app.use('/api/v1/categories', categoryController.router);
  app.use('/api/v1/transactions', transactionController.router);
  app.use('/api/v1/summary', summaryController.router);
  app.use('/api/v1/subscriptions', subscriptionController.router);
  app.use('/api/v1/credit-cards', creditCardController.router);
  app.use('/api/v1/analytics', analyticsController.router);
  app.use('/api/v1/debts', debtController.router);
  app.use('/api/v1/profile', profileController.router);
  app.use('/api/v1/ai', aiController.router);
  app.use('/api/v1/quick-items', quickItemController.router);
  app.use('/api/v1/budgets', budgetController.router);
  app.use('/api/v1/goals', goalController.router);
  app.use('/api/v1/receipts', receiptController.router);

  // Serve the production PWA from the same origin as the API when it has been built.
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (_req, res, next) => {
      if (_req.path.startsWith('/api/')) {
        next();
        return;
      }

      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
