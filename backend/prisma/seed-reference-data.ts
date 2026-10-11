import { PrismaClient } from '@prisma/client';
import { accountTypeOptions, indianInstitutionOptions, paymentMethodOptions } from '../src/data/financialReferenceData';

const prisma = new PrismaClient();

async function main() {
  for (const [sortOrder, [code, label, region, category, allowedAccountCategories]] of paymentMethodOptions.entries()) {
    await prisma.paymentMethodOption.upsert({
      where: { code },
      update: { label, region, category, allowedAccountCategories, sortOrder, isActive: true },
      create: { code, label, region, category, allowedAccountCategories, sortOrder },
    });
  }

  for (const [sortOrder, [code, label]] of indianInstitutionOptions.entries()) {
    await prisma.financialInstitutionOption.upsert({
      where: { code },
      update: { label, country: 'IN', category: 'BANK', sortOrder, isActive: true },
      create: { code, label, country: 'IN', category: 'BANK', sortOrder },
    });
  }

  for (const [sortOrder, [code, label, category]] of accountTypeOptions.entries()) {
    await prisma.accountTypeOption.upsert({
      where: { code },
      update: { label, category, sortOrder, isActive: true },
      create: { code, label, category, sortOrder },
    });
  }

  console.log(`Seeded ${paymentMethodOptions.length} payment methods and ${accountTypeOptions.length} account types.`);
}

main()
  .finally(() => prisma.$disconnect());
