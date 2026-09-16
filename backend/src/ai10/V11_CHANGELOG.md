# v11 - Savings trend reliability fix

`Show my savings trend` is now a direct historical retrieval query.

Flow:
user -> semantic planner -> SAVINGS_TREND -> getSavingsTrend -> exact renderer

It does not enter generic ANALYZE reasoning and therefore does not depend on an external LLM explanation call to produce a useful answer.

Also adds a dedicated `getSavingsTrend()` tool and regression tests for natural-language savings trend/history questions.
