/**
 * Phase-one, non-destructive ownership backfill. This never deletes/recreates rows or changes IDs.
 * Run against a backup first, then apply the reviewed Prisma migration that makes userId NOT NULL.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const tables = ['Account', 'Category', 'Transaction', 'Subscription', 'Debt', 'FinancialProfile', 'InsightFeedback', 'ReportSettings', 'ReportDelivery', 'QuickItem', 'Budget', 'Goal'];

async function main() {
  const users = await db.$queryRawUnsafe<Array<{ id: string; username: string }>>('SELECT id, username FROM "User"');
  const requested = (process.env.OWNER_USERNAME || process.env.ADMIN_USERNAME || 'Hamzah').toLowerCase();
  const matches = users.filter(user => user.username.toLowerCase() === requested);
  const owner = matches.length === 1 ? matches[0] : (matches.length === 0 && users.length === 1 ? users[0] : null);
  if (!owner) throw new Error(`Ownership backfill aborted: expected exactly one owner (${requested}); found ${matches.length} matching users and ${users.length} total users.`);

  const postgres = (process.env.DATABASE_URL || '').startsWith('postgres');
  await db.$transaction(async tx => {
    for (const table of tables) {
      if (postgres) {
        await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "userId" TEXT`);
      } else {
        const columns = await tx.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${table}")`);
        if (!columns.some(column => column.name === 'userId')) await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "userId" TEXT`);
      }
      if (postgres) await tx.$executeRawUnsafe(`UPDATE "${table}" SET "userId" = $1 WHERE "userId" IS NULL`, owner.id);
      else await tx.$executeRawUnsafe(`UPDATE "${table}" SET "userId" = ? WHERE "userId" IS NULL`, owner.id);
      const remaining = await tx.$queryRawUnsafe<Array<{ count: bigint | number }>>(`SELECT COUNT(*) AS count FROM "${table}" WHERE "userId" IS NULL`);
      if (Number(remaining[0]?.count || 0) !== 0) throw new Error(`Backfill verification failed for ${table}`);
    }
  });
  console.log(`Ownership backfill complete for ${tables.length} tables; legacy rows belong to ${owner.username} (${owner.id}).`);
  console.log('No IDs or financial values were changed. Review counts, then apply the generated Prisma schema migration.');
}

main().finally(() => db.$disconnect());
