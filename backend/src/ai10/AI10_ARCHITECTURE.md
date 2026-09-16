# AI10 Financial AI Architecture

There is one canonical AI runtime under `src/ai10`.

## Request pipeline

1. `AIController` receives `/api/v1/ai/query`.
2. `AIAssistantService` sends every query through `FinancialQueryEngine` first.
3. Exact ledger facts and deterministic calculations are answered without an LLM.
4. Planning/recommendation/scenario questions go through the semantic provider and verified backend context.
5. External LLM output is never trusted for ledger arithmetic.

## Query model

The query contract separates: mode, subject, operation, period, merchant/category, amount, and target savings rate.
This avoids routing target questions such as `maintain 20% savings` into a historical savings-total tool.

## Examples handled deterministically

- How much did I save in July?
- How much did I save last month?
- How much did I spend on Zomato?
- How much did I spend on rent this month?
- How much money do people owe me?
- Show my savings trend.
- If I want to maintain 20% savings, how much can I spend this month?
- I want monthly savings to be 25% of income.

For target savings rate questions, the engine calculates:

`target savings = income × target rate`

`maximum total spending = income − target savings`

If current-month income is not recorded yet, the engine uses the most recent previous month's income as a planning baseline and explicitly tells the user.
