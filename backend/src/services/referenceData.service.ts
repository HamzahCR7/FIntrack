import { prisma } from '../config/prisma';
import { accountTypeOptions, indianInstitutionOptions, paymentMethodOptions } from '../data/financialReferenceData';

export const defaultPaymentMethods = paymentMethodOptions.map(
  ([code, label, region, category, allowedAccountCategories], sortOrder) => ({
    code,
    label,
    region,
    category,
    allowedAccountCategories,
    sortOrder,
    isActive: true,
  }),
);

export const defaultAccountTypes = accountTypeOptions.map(([code, label, category], sortOrder) => ({
  code,
  label,
  category,
  sortOrder,
  isActive: true,
}));

export const defaultFinancialInstitutions = indianInstitutionOptions.map(([code, label], sortOrder) => ({
  code,
  label,
  country: 'IN',
  category: 'BANK',
  sortOrder,
  isActive: true,
}));

let initialization: Promise<void> | undefined;

export function ensureFinancialReferenceData(): Promise<void> {
  initialization ??= prisma.$transaction(async (database) => {
    for (const [sortOrder, [code, label, region, category, allowedAccountCategories]] of paymentMethodOptions.entries()) {
      await database.paymentMethodOption.upsert({
        where: { code },
        update: { label, region, category, allowedAccountCategories, sortOrder, isActive: true },
        create: { code, label, region, category, allowedAccountCategories, sortOrder },
      });
    }

    for (const [sortOrder, [code, label]] of indianInstitutionOptions.entries()) {
      await database.financialInstitutionOption.upsert({
        where: { code },
        update: { label, country: 'IN', category: 'BANK', sortOrder, isActive: true },
        create: { code, label, country: 'IN', category: 'BANK', sortOrder },
      });
    }

    for (const [sortOrder, [code, label, category]] of accountTypeOptions.entries()) {
      await database.accountTypeOption.upsert({
        where: { code },
        update: { label, category, sortOrder, isActive: true },
        create: { code, label, category, sortOrder },
      });
    }
  }).catch((error) => {
    initialization = undefined;
    throw error;
  });

  return initialization;
}
