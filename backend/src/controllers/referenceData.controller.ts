import { Request, Response, Router } from 'express';
import { prisma } from '../config/prisma';
import {
  defaultAccountTypes,
  defaultFinancialInstitutions,
  defaultPaymentMethods,
  ensureFinancialReferenceData,
} from '../services/referenceData.service';

export class ReferenceDataController {
  public router = Router();

  constructor() {
    this.router.get('/payment-methods', this.getPaymentMethods);
    this.router.get('/account-types', this.getAccountTypes);
    this.router.get('/institutions', this.getInstitutions);
  }

  private getPaymentMethods = async (_req: Request, res: Response) => {
    try {
      await ensureFinancialReferenceData();
      const methods = await prisma.paymentMethodOption.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      });
      res.status(200).json({ status: 'success', data: methods });
    } catch (error) {
      console.warn('Using built-in payment methods because reference-data storage is unavailable:', error);
      res.status(200).json({ status: 'success', data: defaultPaymentMethods, source: 'fallback' });
    }
  };

  private getAccountTypes = async (_req: Request, res: Response) => {
    try {
      await ensureFinancialReferenceData();
      const types = await prisma.accountTypeOption.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      });
      res.status(200).json({ status: 'success', data: types });
    } catch (error) {
      console.warn('Using built-in account types because reference-data storage is unavailable:', error);
      res.status(200).json({ status: 'success', data: defaultAccountTypes, source: 'fallback' });
    }
  };

  private getInstitutions = async (_req: Request, res: Response) => {
    try {
      await ensureFinancialReferenceData();
      const institutions = await prisma.financialInstitutionOption.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      });
      res.status(200).json({ status: 'success', data: institutions });
    } catch (error) {
      console.warn('Using built-in institutions because reference-data storage is unavailable:', error);
      res.status(200).json({ status: 'success', data: defaultFinancialInstitutions, source: 'fallback' });
    }
  };
}
