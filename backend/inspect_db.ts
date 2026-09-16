import { PrismaClient } from '@prisma/client';
import { BudgetService } from './src/services/budget.service';

const prisma = new PrismaClient();
const budgetService = new BudgetService();

async function inspect() {
  const budgets = await budgetService.getAllBudgets();
  console.log('--- ENRICHED BUDGETS ---');
  console.log(JSON.stringify(budgets, null, 2));

  const rawBudgets = await prisma.budget.findMany();
  console.log('--- RAW BUDGETS ---');
  console.log(JSON.stringify(rawBudgets, null, 2));

  const expenses = await prisma.transaction.findMany({
    where: { type: 'EXPENSE' },
    include: { category: true, subcategory: true },
  });
  console.log('--- EXPENSES ---');
  console.log(JSON.stringify(expenses, null, 2));

  const categories = await prisma.category.findMany();
  console.log('--- CATEGORIES ---');
  console.log(JSON.stringify(categories, null, 2));
}

inspect().finally(() => prisma.$disconnect());
