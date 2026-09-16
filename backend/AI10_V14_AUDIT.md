# FinTrack AI10 v14 audit and runtime fix

## Root cause found

The backend contained two different AI10 implementations:

- `src/ai10/...` — the canonical v13 implementation, including `FinancialQueryEngine`.
- `src/ai10/ai/...` — an older duplicate implementation without the deterministic `FinancialQueryEngine`.

`src/app.ts` was importing the older duplicate:

`./ai10/ai/controllers/ai.controller`

Therefore the application was bypassing the canonical deterministic ledger-query layer. This explains why a simple factual query could enter the older semantic planner/reasoning path instead of the field-specific deterministic query path.

The observed text `Family Support > Parents Monthly Allowance` is not present anywhere in the supplied backend source or `fintrack.db`. The supplied database contains the category `Rent & Housing` and a September 2026 rent transaction for ₹10,385 with merchant `Sahsra mens pg` and description `monthly room rent`.

## v14 changes

1. Application wiring now imports the canonical controller:
   `./ai10/controllers/ai.controller`
2. Removed the duplicate legacy `src/ai10/ai` runtime tree.
3. Removed the duplicate legacy `dist/ai10/ai` runtime tree.
4. Regenerated `dist` JavaScript from the canonical source with the global TypeScript transpiler available in the audit environment.
5. Added an engine marker to the AI HTTP response:
   `engine: ai10-canonical-v13`
   This makes it immediately visible which AI runtime answered a request.
6. Added a regression test ensuring a rent query is routed to `getExpensesByCategory` and that the verified result remains `Rent & Housing` / ₹10,385.

## Intended retrieval flow

Simple ledger facts now take this path before any external LLM is involved:

User question -> FinancialQueryEngine -> FinancialQueryContract -> exact tool -> database -> exact answer

For example:

`How much money spent on rent this month?`

becomes:

`CATEGORY / TOTAL / rent / current month`

and executes:

`getExpensesByCategory('rent', currentMonth, currentYear)`

The registry resolves `rent` to the actual recorded category `Rent & Housing`.

## Validation limitation

The audit container did not have the project's npm dependencies installed correctly. `npm test` therefore could not run (`jest: not found`), and a full TypeScript type-check could not run because the dependency type packages were unavailable. JavaScript syntax validation of the regenerated runtime files succeeded.

On the developer machine, run:

`npm ci`

then:

`npm test -- --runInBand`

and:

`npm run build`

before starting the backend.
