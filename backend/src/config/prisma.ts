import { PrismaClient } from '@prisma/client';
import { currentUserId } from '../common/auth/requestContext';

const ownedModels = new Set([
  'Account', 'Category', 'Transaction', 'Subscription', 'Debt', 'FinancialProfile',
  'InsightFeedback', 'ReportSettings', 'ReportDelivery', 'QuickItem', 'Budget', 'Goal',
]);

export const prisma = new PrismaClient();

// A single enforcement point protects repository code, AI queries, reports, and future routes.
prisma.$use(async (params, next) => {
  const userId = currentUserId();
  if (!userId || !params.model || !ownedModels.has(params.model)) return next(params);
  params.args ||= {};
  const ownedWhere = (where: Record<string, unknown> = {}) => ({ AND: [where, { userId }] });

  if (['findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(params.action)) {
    params.args.where = ownedWhere(params.args.where);
  } else if (params.action === 'findUnique' || params.action === 'findUniqueOrThrow') {
    // Prisma 5 permits additional non-unique filters alongside the unique selector.
    params.args.where = { ...params.args.where, userId };
  } else if (params.action === 'create') {
    const { userId: _ignored, ...data } = params.args.data;
    params.args.data = { ...data, user: { connect: { id: userId } } };
  } else if (params.action === 'createMany') {
    const rows = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
    params.args.data = rows.map((row: object) => ({ ...row, userId }));
  } else if (['update', 'delete'].includes(params.action)) {
    const delegate = (prisma as any)[params.model.charAt(0).toLowerCase() + params.model.slice(1)];
    const found = await delegate.findFirst({ where: ownedWhere(params.args.where), select: { id: true } });
    if (!found) throw new Error(`${params.model} not found`);
  } else if (params.action === 'upsert') {
    const { userId: _ignored, ...create } = params.args.create;
    params.args.create = { ...create, user: { connect: { id: userId } } };
  }
  return next(params);
});
