\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE _ownership_selected_owner ON COMMIT DROP AS
SELECT "id", "username"
FROM "User"
WHERE lower("username") = lower(:'owner_username');

DO $block$
DECLARE
  owner_count integer;
BEGIN
  SELECT count(*) INTO owner_count FROM pg_temp._ownership_selected_owner;
  IF owner_count <> 1 THEN
    RAISE EXCEPTION 'Ownership migration aborted: owner username must match exactly one existing User; found % matches', owner_count;
  END IF;
END;
$block$;

CREATE TABLE IF NOT EXISTS public."_OwnershipMigrationBaseline" (
  "modelName" text PRIMARY KEY,
  "ownerId" text NOT NULL REFERENCES public."User"("id"),
  "rowCount" bigint NOT NULL,
  "financialTotals" jsonb NOT NULL,
  "capturedAt" timestamptz NOT NULL DEFAULT now()
);

\ir ownership_financial_totals.sql

DO $block$
DECLARE
  model_name text;
  selected_owner_id text;
  existing_models integer;
  existing_owners integer;
  row_count bigint;
  model_names text[] := ARRAY[
    'Account', 'Category', 'Transaction', 'Subscription', 'Debt',
    'FinancialProfile', 'InsightFeedback', 'ReportSettings', 'ReportDelivery',
    'QuickItem', 'Budget', 'Goal'
  ];
BEGIN
  SELECT "id" INTO STRICT selected_owner_id FROM pg_temp._ownership_selected_owner;

  SELECT count(*), count(DISTINCT "ownerId")
    INTO existing_models, existing_owners
    FROM public."_OwnershipMigrationBaseline";
  IF existing_models > 0 AND (existing_models <> array_length(model_names, 1) OR existing_owners <> 1
      OR EXISTS (SELECT 1 FROM public."_OwnershipMigrationBaseline" WHERE "ownerId" <> selected_owner_id)) THEN
    RAISE EXCEPTION 'Ownership migration aborted: stored baseline is incomplete or belongs to a different owner';
  END IF;

  IF existing_models = 0 THEN
    FOREACH model_name IN ARRAY model_names LOOP
      EXECUTE format('SELECT count(*) FROM %I', model_name) INTO row_count;
      INSERT INTO public."_OwnershipMigrationBaseline" ("modelName", "ownerId", "rowCount", "financialTotals")
      VALUES (model_name, selected_owner_id, row_count, pg_temp._ownership_financial_totals(model_name));
    END LOOP;
  END IF;
END;
$block$;

DO $block$
DECLARE
  model_name text;
  selected_owner_id text;
  row_count bigint;
  baseline record;
  model_names text[] := ARRAY[
    'Account', 'Category', 'Transaction', 'Subscription', 'Debt',
    'FinancialProfile', 'InsightFeedback', 'ReportSettings', 'ReportDelivery',
    'QuickItem', 'Budget', 'Goal'
  ];
BEGIN
  SELECT "id" INTO STRICT selected_owner_id FROM pg_temp._ownership_selected_owner;

  FOREACH model_name IN ARRAY model_names LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "userId" text', model_name);
    EXECUTE format('SELECT count(*) FROM %I WHERE "userId" IS NOT NULL AND "userId" <> $1', model_name)
      INTO row_count USING selected_owner_id;
    IF row_count <> 0 THEN
      RAISE EXCEPTION 'Ownership migration aborted: %.userId already contains rows assigned to another user', model_name;
    END IF;
  END LOOP;

  FOREACH model_name IN ARRAY model_names LOOP
    EXECUTE format('UPDATE %I SET "userId" = $1 WHERE "userId" IS NULL', model_name)
      USING selected_owner_id;
    EXECUTE format('SELECT count(*) FROM %I WHERE "userId" IS NULL OR "userId" <> $1', model_name)
      INTO row_count USING selected_owner_id;
    IF row_count <> 0 THEN
      RAISE EXCEPTION 'Ownership verification failed for %: % rows are null or not assigned to the selected owner', model_name, row_count;
    END IF;

    SELECT * INTO STRICT baseline
      FROM public."_OwnershipMigrationBaseline"
      WHERE "modelName" = model_name;
    EXECUTE format('SELECT count(*) FROM %I', model_name) INTO row_count;
    IF row_count <> baseline."rowCount" THEN
      RAISE EXCEPTION 'Row count changed for %: baseline %, current %', model_name, baseline."rowCount", row_count;
    END IF;
    IF pg_temp._ownership_financial_totals(model_name) IS DISTINCT FROM baseline."financialTotals" THEN
      RAISE EXCEPTION 'Financial aggregate changed for %; transaction rolled back', model_name;
    END IF;
  END LOOP;
END;
$block$;

COMMIT;