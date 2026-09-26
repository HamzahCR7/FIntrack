import type { Transaction } from '../types';

export const getLedgerSearchText = (transaction: Partial<Transaction> | null | undefined) => {
  if (!transaction) return '';

  const values = [
    transaction.merchant,
    transaction.description,
    transaction.itemTag,
    transaction.type,
    transaction.paymentMethod,
    transaction.amount?.toString(),
    transaction.category?.name,
    transaction.subcategory?.name,
    transaction.sourceAccount?.name,
    transaction.destinationAccount?.name,
    transaction.sourceAccountId,
    transaction.destinationAccountId,
    transaction.transactionDate,
  ];

  return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).join(' ').toLowerCase();
};

export const matchesLedgerSearch = (transaction: Partial<Transaction> | null | undefined, query: string) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  return getLedgerSearchText(transaction).includes(trimmedQuery.toLowerCase());
};
