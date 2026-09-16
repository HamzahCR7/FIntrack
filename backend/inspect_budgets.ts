import { PrismaClient } from '@prisma/client';
import { BudgetService } from './src/services/budget.service';

const prisma = new PrismaClient();
const budgetService = new BudgetService();

async function inspect() {
  const rawBudgets = await prisma.budget.findMany();
  console.log('--- RAW BUDGETS ---');
  console.log(JSON.stringify(rawBudgets, null, 2));

  const budgets = await budgetService.getAllBudgets();
  console.log('--- ENRICHED BUDGETS ---');
  console.log(JSON.stringify(budgets, null, 2));
}

inspect().finally(() => prisma.$disconnect());
