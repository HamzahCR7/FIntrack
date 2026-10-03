\set ON_ERROR_STOP on
\ir ownership_financial_totals.sql

DO $block$
DECLARE
  baseline record;
  row_count bigint;
  invalid_count bigint;
  baseline_count integer;
BEGIN
  SELECT count(*) INTO baseline_count FROM public."_OwnershipMigrationBaseline";
  IF baseline_count <> 12 THEN
    RAISE EXCEPTION 'Expected 12 ownership baseline rows; found %', baseline_count;
  END IF;

  FOR baseline IN SELECT * FROM public."_OwnershipMigrationBaseline" ORDER BY "modelName" LOOP
    EXECUTE format('SELECT count(*) FROM %I', baseline."modelName") INTO row_count;
    EXECUTE format('SELECT count(*) FROM %I WHERE "userId" IS NULL OR "userId" <> $1', baseline."modelName")
      INTO invalid_count USING baseline."ownerId";
    IF row_count <> baseline."rowCount" OR invalid_count <> 0 THEN
      RAISE EXCEPTION 'Ownership check failed for %: expected % rows for owner %, found % rows and % invalid ownership values',
        baseline."modelName", baseline."rowCount", baseline."ownerId", row_count, invalid_count;
    END IF;
    IF pg_temp._ownership_financial_totals(baseline."modelName") IS DISTINCT FROM baseline."financialTotals" THEN
      RAISE EXCEPTION 'Financial aggregate check failed for %', baseline."modelName";
    END IF;
  END LOOP;
END;
$block$;

SELECT "modelName", "ownerId", "rowCount", "financialTotals", "capturedAt"
FROM public."_OwnershipMigrationBaseline"
ORDER BY "modelName";