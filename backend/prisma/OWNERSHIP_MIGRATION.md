# PostgreSQL ownership rollout

This is a manual, two-phase migration from the single-owner PostgreSQL schema to per-user ownership. The application container no longer runs `prisma db push` at startup. Do not run `prisma db push` against production for this rollout.

The SQL migration files are under `backend/prisma/migrations/ownership/`. Phase one adds nullable `userId` columns and assigns legacy rows to one explicitly selected existing `User`. It preserves row IDs and existing relationship columns. In the same transaction it stores row-count and financial-total baselines in `public."_OwnershipMigrationBaseline"`, then aborts and rolls back unless all rows belong to the selected owner and all counts and rounded financial totals match. Phase two validates the baseline and uniqueness preconditions, adds NOT NULL constraints, foreign keys, indexes, and target per-user unique constraints, and aligns the additional target-schema fields on `Category`, `User`, and `ReportSettings` in one transaction.

Phase two specifically replaces global uniqueness on `Category.name`, `InsightFeedback.insightId`, and `(ReportDelivery.periodKey, recipientEmail)` with per-user uniqueness. It adds `(userId, name)` uniqueness for `Account` and `Category`, plus one-row-per-user constraints for `FinancialProfile` and `ReportSettings`. It also adds target `User.email` and `User.googleSubject` uniqueness, `Category.isArchived`, the target nullable user-authentication fields, makes `User.password` nullable, and removes the old `ReportSettings.id` default while preserving its existing ID. It refuses duplicate names, email/Google subjects, or multiple profile/settings rows; resolve any such data manually without deleting or merging records, and review again before retrying.

## Required environment

Configure these as Northflank secrets/environment values, not in the repository:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma PostgreSQL URL used by the app, including the provider-required TLS options. |
| `MIGRATION_DATABASE_URL` | Same database connection for `psql`/`pg_dump`; use a libpq-compatible URL without Prisma-only query parameters such as `schema=public`. |
| `OWNER_USERNAME` | Existing production owner's username, matched case-insensitively. Must match exactly one row in `"User"`. |
| `ADMIN_USERNAME` | Optional fallback for `OWNER_USERNAME` if that is already the configured name in this deployment. |
| `SESSION_SECRET` | Runtime secret of at least 32 characters. |
| `GOOGLE_CLIENT_ID` | Runtime Google Sign-In client ID. |
| `VITE_GOOGLE_CLIENT_ID` | Docker build argument for the frontend bundle. |

Retain all other currently required application secrets and integrations when recreating the service. Never place a database URL, password, or credential in a command committed to source control.

## Northflank procedure

Do these steps in order. Keep the stable service on `feature/northflank-deployment` until both phases and their checks complete.

1. **Back up and verify first.** Create a provider snapshot/backup and record its timestamp and database identity. Also make a custom-format dump from a trusted workstation or secure operations environment, outside the repository:

	```sh
	pg_dump --format=custom --no-owner --file="$BACKUP_FILE" "$MIGRATION_DATABASE_URL"
	pg_restore --list "$BACKUP_FILE" >/dev/null
	shasum -a 256 "$BACKUP_FILE"
	```

	For a restore check, restore that dump into a separate, empty test database, never production:

	```sh
	pg_restore --exit-on-error --no-owner --dbname="$RESTORE_TEST_DATABASE_URL" "$BACKUP_FILE"
	```

	Confirm the provider backup reports success and that the test restore completes. Do not proceed if either check fails. Keep the dump and restore-test URL out of Git.

2. **Prepare a maintenance window.** Confirm the stable production service is healthy and the target image can build. Announce downtime, then stop/scale down the stable app or enable a write-blocking maintenance mode before phase one. Do not allow the stable app or integrations to write between phases: they do not populate `userId`.

3. **Build the target branch image, but do not switch the web service.** Use `feature/multi-user-settings`; supply `VITE_GOOGLE_CLIENT_ID` as a Docker build argument. The image contains `psql`, `pg_dump`/`pg_restore`, and the SQL scripts. Keep the migration job's database variables identical to production, including TLS settings.

4. **Run phase one as a one-off Northflank job** using that target image, working directory `/app/backend`, and command:

	```sh
	npm run ownership:phase1
	```

	Set `MIGRATION_DATABASE_URL` and `OWNER_USERNAME` on that job. `ADMIN_USERNAME` can be used only as a fallback. The job exits nonzero and rolls back if the owner is missing/ambiguous, ownership is already mixed, a table is missing, or a row count/financial total changes. Do not proceed on any error.

5. **Verify phase one before phase two.** Run a separate one-off job against the same target image and database:

	```sh
	npm run ownership:verify
	```

	It asserts all 12 row counts, ownership assignments, and financial aggregates match the stored pre-migration baseline and prints that baseline. Independently inspect null and wrong-owner counts:

	```sql
	SELECT 'Account' AS table_name, count(*) FILTER (WHERE t."userId" IS NULL) AS null_owner,
			 count(*) FILTER (WHERE t."userId" <> b."ownerId") AS wrong_owner
	FROM "Account" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'Account'
	UNION ALL SELECT 'Category', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "Category" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'Category'
	UNION ALL SELECT 'Transaction', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "Transaction" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'Transaction'
	UNION ALL SELECT 'Subscription', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "Subscription" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'Subscription'
	UNION ALL SELECT 'Debt', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "Debt" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'Debt'
	UNION ALL SELECT 'FinancialProfile', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "FinancialProfile" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'FinancialProfile'
	UNION ALL SELECT 'InsightFeedback', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "InsightFeedback" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'InsightFeedback'
	UNION ALL SELECT 'ReportSettings', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "ReportSettings" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'ReportSettings'
	UNION ALL SELECT 'ReportDelivery', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "ReportDelivery" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'ReportDelivery'
	UNION ALL SELECT 'QuickItem', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "QuickItem" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'QuickItem'
	UNION ALL SELECT 'Budget', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "Budget" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'Budget'
	UNION ALL SELECT 'Goal', count(*) FILTER (WHERE t."userId" IS NULL), count(*) FILTER (WHERE t."userId" <> b."ownerId") FROM "Goal" t CROSS JOIN public."_OwnershipMigrationBaseline" b WHERE b."modelName" = 'Goal';
	```

	Every `null_owner` and `wrong_owner` value must be zero. Compare printed row counts and financial totals with the pre-migration backup/recorded baseline. Do not continue if anything differs.

6. **Run phase two as a separate one-off job** (same working directory, image, and database):

	```sh
	npm run ownership:phase2
	```

	The transaction uses a five-second lock timeout and aborts on duplicates, missing baseline, constraint errors, or failed post-checks. If it exits nonzero, keep production writes stopped and investigate; do not manually drop constraints or retry with schema push.

7. **Verify phase two and only then switch the web service** back to `feature/multi-user-settings`. Run `npm run ownership:verify` again as a job. Confirm it succeeds, review the ownership constraints/indexes in PostgreSQL, then start the target web service. The target is safe to switch only after both phases committed, the second verification passed, and the target image is healthy. Keep the backup until original-owner balances, transaction totals, accounts, budgets, goals, and reports are confirmed in the app and two-user isolation has been tested.

## Recovery

- If phase one fails, its transaction rolls back. Keep the stable service stopped while investigating; no phase-two changes have been made.
- If phase one succeeds but phase two has not run, do not resume writes on the old app and then reuse this baseline: the old app cannot populate `userId`. Fix the cause and continue from the verified phase-one state, or restore the pre-migration backup into a **separate new database** and point the stable service at that restored database.
- If phase two fails, its transaction rolls back. Keep the stable app stopped because it cannot write rows satisfying the new NOT NULL constraints. Retry only after identifying and resolving the reported issue, or restore the verified backup to a separate new database and repoint the stable service.
- If the new app fails after phase two commits, do not point the old app at the migrated database; its inserts will fail the ownership constraints. Keep writes blocked, diagnose/redeploy the target, or restore the backup to a separate new database and repoint the stable service.
- Never restore over the production database, delete/reset/truncate production tables, or manually reverse the migration as an emergency shortcut. Preserve the migrated database for investigation and retain the pre-migration backup.

The baseline table is an intentional migration audit record and is not part of Prisma's application models. It can be retained after rollout; do not remove it before the migration is accepted and recovery requirements are met.
