\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';

\ir ownership_financial_totals.sql

DO $block$
DECLARE
  duplicate_found boolean;
BEGIN
  IF (SELECT count(*) FROM public."_OwnershipMigrationBaseline") <> 12 THEN
    RAISE EXCEPTION 'Phase two aborted: phase-one ownership baseline is missing or incomplete';
  END IF;

  SELECT EXISTS (SELECT 1 FROM "Account" GROUP BY "userId", "name" HAVING count(*) > 1)
    INTO duplicate_found;
  IF duplicate_found THEN
    RAISE EXCEPTION 'Phase two aborted: duplicate Account names exist for the same user; resolve without deleting records and rerun';
  END IF;
  SELECT EXISTS (SELECT 1 FROM "Category" GROUP BY "userId", "name" HAVING count(*) > 1)
    INTO duplicate_found;
  IF duplicate_found THEN
    RAISE EXCEPTION 'Phase two aborted: duplicate Category names exist for the same user';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM "FinancialProfile" GROUP BY "userId" HAVING count(*) > 1
  ) INTO duplicate_found;
  IF duplicate_found THEN
    RAISE EXCEPTION 'Phase two aborted: more than one FinancialProfile exists for the selected user';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM "ReportSettings" GROUP BY "userId" HAVING count(*) > 1
  ) INTO duplicate_found;
  IF duplicate_found THEN
    RAISE EXCEPTION 'Phase two aborted: more than one ReportSettings row exists for the selected user';
  END IF;
END;
$block$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleSubject" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredCurrency" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamp(3);
UPDATE "User" SET "authProvider" = 'PASSWORD' WHERE "authProvider" IS NULL;
UPDATE "User" SET "preferredCurrency" = 'INR' WHERE "preferredCurrency" IS NULL;
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "authProvider" SET DEFAULT 'PASSWORD';
ALTER TABLE "User" ALTER COLUMN "authProvider" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "preferredCurrency" SET DEFAULT 'INR';
ALTER TABLE "User" ALTER COLUMN "preferredCurrency" SET NOT NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User" GROUP BY "email" HAVING "email" IS NOT NULL AND count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Phase two aborted: duplicate User.email values prevent the target unique constraint';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "User" GROUP BY "googleSubject" HAVING "googleSubject" IS NOT NULL AND count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Phase two aborted: duplicate User.googleSubject values prevent the target unique constraint';
  END IF;
END;
$block$;

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isArchived" boolean;
UPDATE "Category" SET "isArchived" = false WHERE "isArchived" IS NULL;
ALTER TABLE "Category" ALTER COLUMN "isArchived" SET DEFAULT false;
ALTER TABLE "Category" ALTER COLUMN "isArchived" SET NOT NULL;

ALTER TABLE "ReportSettings" ALTER COLUMN "id" DROP DEFAULT;

DO $block$
DECLARE
  model_name text;
  model_names text[] := ARRAY[
    'Account', 'Category', 'Transaction', 'Subscription', 'Debt',
    'FinancialProfile', 'InsightFeedback', 'ReportSettings', 'ReportDelivery',
    'QuickItem', 'Budget', 'Goal'
  ];
BEGIN
  FOREACH model_name IN ARRAY model_names LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "userId" SET NOT NULL', model_name);
  END LOOP;
END;
$block$;

DO $block$
DECLARE
  model_name text;
  constraint_name text;
  model_names text[] := ARRAY[
    'Account', 'Category', 'Transaction', 'Subscription', 'Debt',
    'FinancialProfile', 'InsightFeedback', 'ReportSettings', 'ReportDelivery',
    'QuickItem', 'Budget', 'Goal'
  ];
BEGIN
  FOREACH model_name IN ARRAY model_names LOOP
    constraint_name := model_name || '_userId_fkey';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = constraint_name AND conrelid = to_regclass(format('%I', model_name))
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE',
        model_name, constraint_name
      );
    END IF;
  END LOOP;
END;
$block$;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";
ALTER TABLE "InsightFeedback" DROP CONSTRAINT IF EXISTS "InsightFeedback_insightId_key";
ALTER TABLE "ReportDelivery" DROP CONSTRAINT IF EXISTS "ReportDelivery_periodKey_recipientEmail_key";

DO $block$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_name_key' AND conrelid = '"Account"'::regclass) THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_name_key" UNIQUE ("userId", "name");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_userId_name_key' AND conrelid = '"Category"'::regclass) THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_name_key" UNIQUE ("userId", "name");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinancialProfile_userId_key' AND conrelid = '"FinancialProfile"'::regclass) THEN
    ALTER TABLE "FinancialProfile" ADD CONSTRAINT "FinancialProfile_userId_key" UNIQUE ("userId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InsightFeedback_userId_insightId_key' AND conrelid = '"InsightFeedback"'::regclass) THEN
    ALTER TABLE "InsightFeedback" ADD CONSTRAINT "InsightFeedback_userId_insightId_key" UNIQUE ("userId", "insightId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReportSettings_userId_key' AND conrelid = '"ReportSettings"'::regclass) THEN
    ALTER TABLE "ReportSettings" ADD CONSTRAINT "ReportSettings_userId_key" UNIQUE ("userId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReportDelivery_userId_periodKey_recipientEmail_key' AND conrelid = '"ReportDelivery"'::regclass) THEN
    ALTER TABLE "ReportDelivery" ADD CONSTRAINT "ReportDelivery_userId_periodKey_recipientEmail_key" UNIQUE ("userId", "periodKey", "recipientEmail");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_email_key' AND conrelid = '"User"'::regclass) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_googleSubject_key' AND conrelid = '"User"'::regclass) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_googleSubject_key" UNIQUE ("googleSubject");
  END IF;
END;
$block$;

CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Category_userId_idx" ON "Category"("userId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Debt_userId_idx" ON "Debt"("userId");
CREATE INDEX IF NOT EXISTS "InsightFeedback_userId_idx" ON "InsightFeedback"("userId");
CREATE INDEX IF NOT EXISTS "ReportDelivery_userId_idx" ON "ReportDelivery"("userId");
CREATE INDEX IF NOT EXISTS "QuickItem_userId_idx" ON "QuickItem"("userId");
CREATE INDEX IF NOT EXISTS "Budget_userId_idx" ON "Budget"("userId");
CREATE INDEX IF NOT EXISTS "Goal_userId_idx" ON "Goal"("userId");

\ir verify.sql

COMMIT;