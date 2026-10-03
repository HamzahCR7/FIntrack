CREATE OR REPLACE FUNCTION pg_temp._ownership_financial_totals(model_name text)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  totals jsonb;
BEGIN
  CASE model_name
    WHEN 'Account' THEN
      EXECUTE 'SELECT jsonb_build_object(
        ''currentBalance'', round(coalesce(sum("currentBalance"), 0)::numeric, 2),
        ''creditLimit'', round(coalesce(sum("creditLimit"), 0)::numeric, 2),
        ''statementAmount'', round(coalesce(sum("statementAmount"), 0)::numeric, 2),
        ''minimumPayment'', round(coalesce(sum("minimumPayment"), 0)::numeric, 2))
        FROM "Account"' INTO totals;
    WHEN 'Transaction' THEN
      EXECUTE 'SELECT jsonb_build_object(
        ''all'', round(coalesce(sum("amount"), 0)::numeric, 2),
        ''income'', round(coalesce(sum("amount") FILTER (WHERE "type" = ''INCOME''), 0)::numeric, 2),
        ''expense'', round(coalesce(sum("amount") FILTER (WHERE "type" = ''EXPENSE''), 0)::numeric, 2),
        ''transfer'', round(coalesce(sum("amount") FILTER (WHERE "type" = ''TRANSFER''), 0)::numeric, 2))
        FROM "Transaction"' INTO totals;
    WHEN 'Subscription' THEN
      EXECUTE 'SELECT jsonb_build_object(''amount'', round(coalesce(sum("amount"), 0)::numeric, 2)) FROM "Subscription"' INTO totals;
    WHEN 'Debt' THEN
      EXECUTE 'SELECT jsonb_build_object(
        ''amount'', round(coalesce(sum("amount"), 0)::numeric, 2),
        ''settledAmount'', round(coalesce(sum("settledAmount"), 0)::numeric, 2),
        ''emiAmount'', round(coalesce(sum("emiAmount"), 0)::numeric, 2))
        FROM "Debt"' INTO totals;
    WHEN 'FinancialProfile' THEN
      EXECUTE 'SELECT jsonb_build_object(
        ''monthlyIncomeTarget'', round(coalesce(sum("monthlyIncomeTarget"), 0)::numeric, 2),
        ''monthlySavingsGoal'', round(coalesce(sum("monthlySavingsGoal"), 0)::numeric, 2),
        ''emergencyFundTarget'', round(coalesce(sum("emergencyFundTarget"), 0)::numeric, 2),
        ''discretionarySpendCap'', round(coalesce(sum("discretionarySpendCap"), 0)::numeric, 2),
        ''preferredSavingsRate'', round(coalesce(sum("preferredSavingsRate"), 0)::numeric, 2))
        FROM "FinancialProfile"' INTO totals;
    WHEN 'QuickItem' THEN
      EXECUTE 'SELECT jsonb_build_object(''price'', round(coalesce(sum("price"), 0)::numeric, 2)) FROM "QuickItem"' INTO totals;
    WHEN 'Budget' THEN
      EXECUTE 'SELECT jsonb_build_object(''amount'', round(coalesce(sum("amount"), 0)::numeric, 2)) FROM "Budget"' INTO totals;
    WHEN 'Goal' THEN
      EXECUTE 'SELECT jsonb_build_object(
        ''targetAmount'', round(coalesce(sum("targetAmount"), 0)::numeric, 2),
        ''currentAmount'', round(coalesce(sum("currentAmount"), 0)::numeric, 2),
        ''monthlyTarget'', round(coalesce(sum("monthlyTarget"), 0)::numeric, 2),
        ''emiAmount'', round(coalesce(sum("emiAmount"), 0)::numeric, 2),
        ''downPayment'', round(coalesce(sum("downPayment"), 0)::numeric, 2))
        FROM "Goal"' INTO totals;
    ELSE
      totals := '{}'::jsonb;
  END CASE;
  RETURN totals;
END;
$function$;