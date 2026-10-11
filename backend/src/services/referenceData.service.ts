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
  initialization ??= (async () => {
    await prisma.$transaction(
      paymentMethodOptions.map(([code, label, region, category, allowedAccountCategories], sortOrder) =>
        prisma.paymentMethodOption.upsert({
          where: { code },
          update: { label, region, category, allowedAccountCategories, sortOrder, isActive: true },
          create: { code, label, region, category, allowedAccountCategories, sortOrder },
        }),
      ),
    );

    await prisma.$transaction(
      indianInstitutionOptions.map(([code, label], sortOrder) =>
        prisma.financialInstitutionOption.upsert({
          where: { code },
          update: { label, country: 'IN', category: 'BANK', sortOrder, isActive: true },
          create: { code, label, country: 'IN', category: 'BANK', sortOrder },
        }),
      ),
    );

    await prisma.$transaction(
      accountTypeOptions.map(([code, label, category], sortOrder) =>
        prisma.accountTypeOption.upsert({
          where: { code },
          update: { label, category, sortOrder, isActive: true },
          create: { code, label, category, sortOrder },
        }),
      ),
    );
  })().catch((error) => {
    initialization = undefined;
    throw error;
  });

  return initialization;
}
