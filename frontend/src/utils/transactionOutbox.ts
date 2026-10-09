import { api } from '../api/client';
import { Transaction } from '../types';

export type OutboxOperation = {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityId: string;
  payload?: Partial<Transaction>;
  createdAt: number;
  status?: 'pending' | 'retrying' | 'failed';
  attempts?: number;
  lastError?: string;
};

const DB_NAME = 'fintrack-offline';
const STORE_NAME = 'transaction-outbox';
let syncPromise: Promise<boolean> | null = null;

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const runRequest = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
};

export const createOutboxId = () =>
  `offline-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

const notifyOutboxChanged = () => window.dispatchEvent(new Event('fintrack-outbox-change'));

export const enqueueTransactionOperation = async (operation: OutboxOperation) => {
  await runRequest('readwrite', (store) => store.put({ status: 'pending', attempts: 0, ...operation }));
  notifyOutboxChanged();
};

export const removeTransactionOperation = async (id: string) => {
  await runRequest('readwrite', (store) => store.delete(id));
  notifyOutboxChanged();
};

export const getTransactionOutbox = () =>
  runRequest<OutboxOperation[]>('readonly', (store) => store.getAll());

export async function mergePendingTransactions(serverTransactions: Transaction[]) {
  const operations = (await getTransactionOutbox()).sort((a, b) => a.createdAt - b.createdAt);
  let merged = [...serverTransactions];

  for (const operation of operations) {
    if (operation.type === 'create' && operation.payload) {
      merged = [{
        ...operation.payload,
        id: operation.entityId,
        currency: operation.payload.currency || 'INR',
        isSubscription: operation.payload.isSubscription || false,
        syncStatus: 'pending',
      } as Transaction, ...merged.filter((transaction) => transaction.id !== operation.entityId)];
    } else if (operation.type === 'update' && operation.payload) {
      merged = merged.map((transaction) => transaction.id === operation.entityId
        ? { ...transaction, ...operation.payload, syncStatus: 'pending' }
        : transaction);
    } else if (operation.type === 'delete') {
      merged = merged.filter((transaction) => transaction.id !== operation.entityId);
    }
  }

  return merged;
}

export function syncTransactionOutbox(): Promise<boolean> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const operations = (await getTransactionOutbox()).sort((a, b) => a.createdAt - b.createdAt);
    let changed = false;

    for (const operation of operations) {
      try {
        await enqueueTransactionOperation({ ...operation, status: 'retrying', attempts: operation.attempts || 0 });
        if (operation.type === 'create') {
          await api.createTransaction({
            ...operation.payload,
            referenceNumber: `offline:${operation.id}`,
          });
        } else if (operation.type === 'update') {
          await api.updateTransaction(operation.entityId, operation.payload || {});
        } else {
          await api.deleteTransaction(operation.entityId);
        }
        await removeTransactionOperation(operation.id);
        changed = true;
      } catch (error) {
        const message = (error as any)?.response?.data?.message
          || (error instanceof Error ? error.message : 'Sync failed');
        await enqueueTransactionOperation({
          ...operation,
          status: 'failed',
          attempts: (operation.attempts || 0) + 1,
          lastError: message,
        });
        window.dispatchEvent(new CustomEvent('fintrack-sync-failed', { detail: { message } }));
        // Preserve ordering and retry after reconnect or on the next timer.
        break;
      }
    }

    return changed;
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}
