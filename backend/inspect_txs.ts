import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectTransactions() {
  const allTxs = await prisma.transaction.findMany({
    where: { type: 'EXPENSE' },
    include: { category: true, subcategory: true },
    orderBy: { transactionDate: 'desc' }
  });
  for (const t of allTxs) {
    console.log(`Date: ${t.transactionDate.toISOString()} | Amount: ${t.amount} | Cat: ${t.category?.name} | Subcat: ${t.subcategory?.name} | Desc: ${t.description}`);
  }
}

inspectTransactions().finally(() => prisma.$disconnect());
