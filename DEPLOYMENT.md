# Free deployment: Render + Neon

The React frontend and Express API run together on one Render web service.
Neon Free stores the PostgreSQL database. Local development continues using SQLite.
Render's free plan sleeps when idle, which makes the Android app feel stuck for up to ~2 minutes on the first login or save after a period of inactivity. For a free-only setup, keep the service on the free tier and add a periodic health-check ping from a free external monitor (for example, UptimeRobot) to keep it warm.
See https://render.com/docs/free and https://neon.com/pricing for current limits.
Do not select Render's free PostgreSQL database: it expires after 30 days.

## Android and iOS apps

The same React frontend also ships through Capacitor. Before building a native app:

1. Copy `frontend/.env.native.example` to `frontend/.env.native` and replace its URL
   with the public HTTPS URL of this backend.
2. Run `npm --prefix frontend run android` to sync and open Android Studio, or
   `npm --prefix frontend run ios` to sync and open Xcode.
3. Build, sign, and run the app from Android Studio or Xcode. Xcode requires macOS;
   Android Studio requires an installed Android SDK.

After changing React code, rerun the matching command. `native:sync` refreshes both
native projects without opening an IDE. The browser/PWA deployment remains unchanged.

## 1. Create and import the database

1. Create a **Free** Neon project at https://console.neon.tech. Choose a nearby region.
2. Open its SQL Editor for a new, empty database.
3. Run the contents of `deployment-data/schema-postgres.sql` to create tables.
4. Run the contents of `deployment-data/import-postgres-20260917T095830.sql` to import the latest verified snapshot.
   The older `import-postgres.sql` is out of date; keep it only as an archive.
   The import covers financial/utility records across ten tables, checks row counts,
   and runs inside a transaction. It refuses a database that already contains data.
5. Copy the PostgreSQL connection string from Neon's Connect dialog, including its
   SSL parameters. Use it only in Render's secret environment settings.

The prepared snapshot is from this setup session. If local records change before
migration, move the existing `deployment-data` folder aside and regenerate:

```sh
python3 scripts/backup-db.py
node scripts/prepare-postgres.cjs
python3 scripts/export-postgres.py
npm --prefix backend exec -- prisma migrate diff --from-empty --to-schema-datamodel backend/prisma/schema.postgresql.prisma --script > deployment-data/schema-postgres.sql
```

Keep the SQLite backup until the online data is verified. Avoid editing local data
while switching to the online app; local and hosted databases do not sync.
The export intentionally excludes legacy plaintext login credentials. Production
uses the owner credentials configured below. Never commit `deployment-data` or `.env`.

## 2. Publish the code and create the Render service

Push the deployment changes to your GitHub repository (`HamzahCR7/FIntrack`).
In https://dashboard.render.com select **New > Blueprint**, connect that repository,
and select the branch containing `render.yaml`. Use the repository root directory.
Confirm that the service plan is **Free** and no persistent disk is attached.

Supply these prompted environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon connection string with SSL parameters |
| `ADMIN_USERNAME` | Your chosen login username |
| `ADMIN_PASSWORD` | A unique password with at least 16 characters |

Render generates `SESSION_SECRET` automatically. Do not use the previous demo login.
The Blueprint installs dependencies, builds both applications, generates the
PostgreSQL Prisma client, and starts the API serving the frontend on the same URL.
Startup applies safe schema changes with `prisma db push`; destructive changes fail
instead of accepting data loss. For future complex schema changes, use reviewed migrations.

## 3. Verify the hosted app

- Visit the assigned `https://fintrack-....onrender.com` URL and sign in.
- Compare account balances, transactions, budgets, goals and notes with the local app.
- Sign out and confirm `/api/v1/accounts` returns HTTP 401.
- Create a temporary note, restart the service, and verify the note persists; then delete it.
- Keep using the hosted version once the migration is verified.

Production login allows 10 attempts per minute across the service, then returns
HTTP 429 with a retry time. This shared limit avoids trusting proxy headers. It can
temporarily delay your login during an attack; existing sessions remain usable.
The counter resets on restart and is intended for this single-instance deployment.

Sessions last 30 days by default. Set `SESSION_DURATION_DAYS` to a value from 1 to
365 to change this. Changing `SESSION_SECRET` invalidates all sessions.
This remains a single-owner tracker; the ledger is shared, with no per-user tenancy.
In production all API routes, including UPI ingestion, require the owner's Bearer
session token. Existing webhook integrations must supply it (and their existing
webhook secret), and renew it when it expires.
Optional online AI requires separately configured provider keys and may incur costs;
leave them unset for the free deterministic functionality.

## Verification status

The frontend/backend build and PostgreSQL schema validation were checked locally.
The SQLite backup passed its integrity check. Production authentication has targeted
unit tests. A live PostgreSQL import and hosted smoke test require your Neon/Render
accounts and have not been performed by this setup.

## Data preservation checkpoint

A full backup matching the local database was verified on 2026-09-17:
`deployment-data/fintrack-safety-20260917T095830662439Z.db`.
Its matching import is `deployment-data/import-postgres-20260917T095830.sql`.
The original SQLite database and earlier backups are retained. The importer reads
only the backup and inserts into empty cloud tables inside a transaction. Never
reset or delete your local database during deployment. If you make more local
edits, take another snapshot and export it before switching to the hosted app.
