# Personal Financial AI — v10

This version is a structural rebuild intended to stop one-question-at-a-time routing patches.

## Core architecture

USER QUESTION
→ semantic planner
→ query mode + financial object + entities + filters
→ narrowest authorized tool(s)
→ verified backend data
→ deterministic financial calculations when applicable
→ LLM reasoning only for analysis/planning/recommendation/scenario
→ final answer

## Query modes

- RETRIEVE: answer a ledger fact. The exact backend result is the answer source.
- CALCULATE: deterministic calculation from verified data.
- ANALYZE: explain patterns or financial health.
- PLAN: achieve a target or change financial behavior.
- RECOMMEND: evaluate a decision using verified financial context.
- SCENARIO: evaluate a what-if change.
- KNOWLEDGE: general financial education.
- EXTERNAL_RESEARCH: current outside information; this requires a future external-data tool integration.

## Anti-whack-a-mole rules

1. Never use a generic monthly-expenses tool as a default for an unknown question.
2. Never classify from a single word such as "should", "money", "save", or "spent".
3. Retrieval questions use field-specific tools: merchant, category, debt, account, payment method, etc.
4. `searchFinancialData` is not a generic fallback.
5. A SIP is a recurring investment, never a one-time purchase.
6. Savings goals are not purchase-affordability questions.
7. One-time discretionary spending limits are never applied to recurring savings/investments.
8. The LLM cannot execute arbitrary tools. Tool names and parameters are server-validated.
9. For retrieval/calculation answers, the LLM is not allowed to replace the verified answer with a nearby interpretation.
10. Financial arithmetic stays in backend code.

## Important fixes included

- "how much on Zomato?" → merchant spending, not food category or unrelated merchant.
- "how much spent on rent this month?" → Rent & Housing category.
- "how much money do people owe me?" → receivables/debt summary.
- "should I spend ₹5k on SIP per month?" → recurring investment decision.
- "I want monthly savings to be 25% of income" → savings-rate planning.
- "how can I save ₹30,000 per month?" → monthly savings planning.
- "if I want to buy a laptop in six months, how should I save?" → savings/purchase planning rather than one-time affordability.

## Regression coverage

`financialScenarioCorpus.spec.ts` contains 100 semantic archetypes × 10 natural-language variants = 1,000 financial situations.
The corpus intentionally includes merchants, categories, debt/receivables, income, balances, subscriptions, credit cards, savings, investments, purchases, scenarios, budgeting, cash flow, financial health, anomalies, trends, accounts and profiles.

`semanticFinancialPlanner.spec.ts` contains focused regressions for the failures that motivated this rebuild.

## Integration note

The module is an AI-layer drop-in. It expects the existing backend services/repositories used by your current `src/ai` module. Run the full project's normal TypeScript/test command after replacing the folder so project-local dependencies are resolved.
