# Safe ownership rollout

Do not run `db push` against the live database. Back it up and record per-table row counts and financial totals first.

1. Deploy/run the phase-one script with the old application stopped: `OWNER_USERNAME=Hamzah npm run ownership:backfill`.
2. The script aborts before altering anything when owner selection is ambiguous. It only adds nullable columns and fills null values; existing IDs and relationships are retained.
3. Recheck counts and totals, then generate and review a Prisma migration from the updated schema. The reviewed migration must make every `userId` required, add its foreign key/index, replace global category-name uniqueness with `(userId, name)`, and replace report/feedback uniqueness with their per-user constraints.
4. Deploy the user-scoped backend before enabling Google sign-in.
5. Confirm the original owner dashboard totals and run two-user isolation tests before opening registration.

SQLite rebuilds tables when adding required foreign keys. This is expected, but must only be performed by Prisma's reviewed migration after the backfill and backup—not by this script.
