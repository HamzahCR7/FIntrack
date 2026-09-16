# FinTrack — AI-Powered Personal Finance Tracker

## Run as an installable app

Build and run the backend from the `backend` directory:

```bash
npm run start:app
```

Open `http://localhost:3000` in a Chromium-based browser and install FinTrack from the address bar. The backend serves both the installed PWA and its API on the same origin.

The backend process must remain running while the app is used. A browser PWA cannot start a local Node.js process automatically; on macOS, use a launch agent, Docker, or a hosted backend if you need it to start automatically.

You are the lead software architect and senior full-stack engineer for this project.

We are building a personal finance application called **FinTrack**.

## Product Vision

FinTrack is not a simple expense CRUD application.

It is a personal financial management system that tracks:

* Expenses
* Income
* Bank accounts
* Credit cards
* UPI transactions
* Cash
* Subscriptions
* Transfers between accounts
* Budgets
* Financial trends
* Financial analytics
* AI-powered financial conversations

The application should eventually allow the user to ask natural-language questions about their finances and receive answers based on their actual financial data.

## Auto Update for GPay/PhonePe (No App Touch)

FinTrack now supports automatic UPI transaction ingestion from payment alerts.

How it works:

1. Your phone automation (Tasker / IFTTT Webhooks / SMS forwarder) sends the UPI alert message text to backend.
2. Backend parses amount, merchant, UTR/ref, and credit/debit direction.
3. FinTrack auto-creates transaction with payment method UPI.
4. Duplicate protection is applied using UTR/ref or amount + timestamp proximity.

Backend endpoint:

POST /api/v1/transactions/auto-upi-ingest

Required header:

x-upi-webhook-secret: <your_secret>

Required env:

UPI_WEBHOOK_SECRET=<your_secret>

Payload example:

{
	"message": "Rs.250 paid to Swiggy via UPI. UTR 412345678901",
	"provider": "PHONEPE"
}

Optional payload fields:

- sourceAccountId
- destinationAccountId
- categoryId
- transactionDate

Examples:

* "How much did I spend this month?"
* "Where did most of my money go?"
* "How much did I spend using UPI?"
* "How much did I spend on food using my credit card?"
* "How much are my subscriptions costing me every month?"
* "What subscriptions do I have?"
* "How much do I owe on my credit cards?"
* "Compare my spending this month with last month."
* "Which category increased the most?"
* "What are my biggest recurring expenses?"
* "How much money do I have across all bank accounts?"
* "Show me my financial trend for the last 6 months."

---

# Core Design Principle

Do NOT treat every financial event as a simple "expense".

The system must distinguish between:

1. Income
2. Expense
3. Transfer
4. Credit-card transaction
5. Subscription/recurring payment
6. Account balance

A transfer between two accounts must NOT be counted as an expense.

Example:

HDFC Bank → SBI Bank = TRANSFER

HDFC Bank → Restaurant = EXPENSE

Salary → HDFC Bank = INCOME

---

# Main Modules

Build the application around these modules:

## 1. Dashboard

The dashboard should provide:

* Total balance
* Total income
* Total expenses
* Savings
* Credit-card outstanding
* Upcoming subscription payments
* Monthly spending
* Spending by category
* Spending by payment method
* Income vs expenses
* Monthly trends
* Recent transactions
* AI-generated financial insights

---

## 2. Transactions

Transactions must support:

* Income
* Expense
* Transfer

Fields should include appropriate information such as:

* id
* amount
* transaction type
* category
* description
* merchant
* date
* payment method
* source account
* destination account where applicable
* notes
* createdAt
* updatedAt

Do not duplicate financial concepts unnecessarily.

---

## 3. Accounts

Support different account types:

* BANK_ACCOUNT
* CREDIT_CARD
* CASH
* UPI/WALLET

Each account should maintain appropriate information such as:

* name
* account type
* institution/provider
* current balance
* credit limit where applicable
* last four digits where applicable
* active/inactive status

Credit cards must be treated differently from normal bank accounts.

---

## 4. Credit Cards

Credit-card functionality should support:

* Credit limit
* Current outstanding
* Available credit
* Statement amount
* Minimum payment
* Payment due date
* Billing cycle
* Transactions made using the card
* Payment made toward the card

Important:

A credit-card purchase is an expense.

Paying the credit-card bill from a bank account is a TRANSFER/PAYMENT between financial accounts and must not create a second expense.

---

## 5. UPI

UPI should be represented as a payment method/account channel.

Support:

* UPI provider
* UPI transaction reference where available
* linked bank account
* transaction amount
* merchant
* category
* date
* transaction type

Do not assume every UPI transaction is an expense.

UPI can represent:

* Expense
* Income
* Transfer

---

## 6. Subscriptions

Subscriptions are recurring financial commitments.

Each subscription should support:

* name
* amount
* billing cycle
* next billing date
* payment method/account
* category
* status
* start date
* end date if cancelled
* notes

Examples:

* Netflix
* Spotify
* YouTube Premium
* AWS
* ChatGPT
* Internet
* Mobile plan

The system should calculate:

* monthly subscription cost
* yearly subscription cost
* upcoming subscription payments
* active subscriptions
* cancelled subscriptions
* subscription spending trends

---

## 7. Categories

Support categories such as:

* Food
* Groceries
* Shopping
* Transport
* Bills
* Rent
* Entertainment
* Health
* Education
* Travel
* Subscriptions
* Utilities
* Other

Allow categories to be extensible rather than hard-coded everywhere.

---

## 8. Budgets

Support monthly budgets.

Example:

Food → ₹8,000
Shopping → ₹5,000
Entertainment → ₹3,000

Track:

* budget amount
* actual spending
* remaining amount
* percentage used
* exceeded status

Eventually provide spending warnings and AI insights.

---

# Analytics

The application should provide:

## Monthly analytics

* total income
* total expenses
* savings
* savings percentage
* category breakdown
* payment-method breakdown
* account breakdown

## Trend analytics

Support:

* 7 days
* 30 days
* 3 months
* 6 months
* 1 year

Calculate:

* spending trend
* income trend
* category trend
* savings trend
* subscription trend

## Comparisons

Support:

* current month vs previous month
* current month vs same month last year
* category comparison
* payment method comparison

---

# AI Financial Assistant

The AI assistant should NOT have unrestricted direct database access.

Use this architecture:

User
↓
AI Assistant
↓
Intent / Query Understanding
↓
Application Financial Services
↓
Repositories / Database
↓
Relevant financial data
↓
AI
↓
Natural-language response

The AI should be able to answer questions using actual application data.

Examples:

"How much did I spend on food this month?"

"How much did I spend through UPI?"

"Show my credit-card spending."

"What are my recurring expenses?"

"How much will my subscriptions cost next month?"

"Compare this month with last month."

"Where am I spending the most?"

"Which category increased the most?"

The AI must never invent financial data.

If the required information does not exist, explicitly say that the data is unavailable.

---

# AI Transaction Entry

Eventually support natural-language transaction creation.

Example:

User:

"I spent ₹850 at Zaitoon for dinner yesterday using UPI."

The system should extract:

amount = 850
type = EXPENSE
merchant = Zaitoon
category = FOOD
description = Dinner
date = yesterday
paymentMethod = UPI

Before permanently saving a transaction generated from natural language, provide confirmation when confidence is low or important fields are ambiguous.

---

# Security

The application will eventually support:

* authentication
* authorization
* user-specific financial data
* secure API access
* validation
* exception handling
* logging
* secrets stored in environment variables

Never hard-code:

* API keys
* database passwords
* AI provider credentials
* JWT secrets

---

# UI / UX

The UI should feel like a modern financial dashboard rather than an administration panel.

Prioritize:

* clean dashboard
* cards
* charts
* spending trends
* category visualization
* account overview
* subscription overview
* credit-card overview
* transaction table
* filters
* search
* responsive layout
* dark/light theme if practical

The AI assistant should have a dedicated chat interface.

---

# Engineering Principles

Follow:

* clean architecture
* separation of concerns
* reusable components
* meaningful naming
* validation
* centralized error handling
* DTOs instead of exposing database entities directly
* service layer
* repository layer
* pagination for large transaction lists
* proper database relationships
* database migrations
* automated tests for important business logic

Do not over-engineer the initial MVP.

Build incrementally.

Do not generate the entire application in one response.

Before implementing a major module, explain the proposed structure briefly and wait for approval.

---

# Development Strategy

Build in this order:

Phase 1:
Project setup + database + accounts + transactions

Phase 2:
Categories + budgets

Phase 3:
Credit cards

Phase 4:
Subscriptions

Phase 5:
Analytics

Phase 6:
Dashboard

Phase 7:
Authentication

Phase 8:
AI financial assistant

Phase 9:
AI transaction entry

Phase 10:
Production hardening + deployment

For every phase:

1. Inspect the existing codebase.
2. Reuse existing architecture.
3. Do not unnecessarily rewrite working code.
4. Identify required entities/models.
5. Identify database changes.
6. Identify APIs.
7. Implement backend.
8. Implement frontend.
9. Add validation.
10. Add tests.
11. Update documentation.

Never create duplicate models/services/controllers for concepts that already exist.

Always preserve existing functionality unless a change is explicitly required.
