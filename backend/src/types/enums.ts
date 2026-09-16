export enum AccountType {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  CREDIT_CARD = 'CREDIT_CARD',
  CASH = 'CASH',
  UPI = 'UPI',
  AMAZON_PAY = 'AMAZON_PAY',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  CASH = 'CASH',
  UPI = 'UPI',
}

export enum BillingCycle {
  WEEKLY = 'WEEKLY',
  EVERY_28_DAYS = 'EVERY_28_DAYS',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum DebtType {
  OWED_TO_ME = 'OWED_TO_ME', // Money lent to someone (they owe me)
  I_OWE = 'I_OWE',           // Money borrowed from someone (I owe them)
}

export enum DebtRecordKind {
  PERSONAL = 'PERSONAL',
  LOAN = 'LOAN',
}

export enum DebtStatus {
  PENDING = 'PENDING',
  PARTIALLY_SETTLED = 'PARTIALLY_SETTLED',
  SETTLED = 'SETTLED',
}
