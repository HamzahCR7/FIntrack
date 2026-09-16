# Forecasted financial-AI failure modes

This file is a design/evaluation contract. The goal is to prevent whack-a-mole fixes.

## 1. Time semantics
- this month / current month
- last month / previous month
- explicit month without year
- December -> January year rollover
- partial current month vs completed historical month
- date ranges

## 2. Entity semantics
- merchant vs category vs person
- person names appearing in merchant/description fields
- fuzzy names and spelling variations
- multi-word merchants
- account names that resemble people/merchants

## 3. Money direction
- spent / paid / sent / given / transferred = outflow
- received / got / reimbursed = inflow
- internal transfers must not be counted as spending or income unless explicitly requested

## 4. Aggregation
- total
- average
- count
- minimum/maximum
- trend
- period-over-period comparison
- category/merchant/person breakdown

## 5. Savings math
- savings = income - expenses
- savings rate = savings / income
- target savings amount = income * target rate
- maximum spending = income - target savings
- remaining spend = maximum spending - actual spend-to-date

## 6. Planning and scenarios
- fixed monthly target
- percentage target
- goal amount + deadline
- affordability
- what-if salary/spending changes
- investment/SIP contribution decisions

## 7. Data-state safety
- no income recorded must not become real zero income when a baseline is needed
- no expenses recorded means zero recorded expenses, not proof that no expenses exist
- current-month numbers must be labeled actual-to-date when the month is incomplete
- missing data must produce an explicit limitation, never fabricated values

## 8. Response safety
- deterministic ledger facts/calculations must bypass LLM arithmetic
- LLM may explain verified data but may not overwrite verified numbers
- tool/intent mismatches must not silently fall back to unrelated financial tools
- every answer should carry the period/entity used for the calculation

## 9. Future language coverage
Examples that should map to the same semantic contract include:
- 'what did I give Hammad'
- 'money sent to Hammad'
- 'payments to Hammad'
- 'how much went to Hammad'
- 'what did Zomato cost me'
- 'rent spend'
- 'what can I spend and still save 20%'
- 'keep 20% aside, what is my spending ceiling?'
