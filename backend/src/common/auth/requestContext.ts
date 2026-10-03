import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

const storage = new AsyncLocalStorage<{ userId: string }>();

export function currentUserId(): string | undefined { return storage.getStore()?.userId; }
export function runAsUser<T>(userId: string, callback: () => T): T { return storage.run({ userId }, callback); }

export function userContext(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next();
  storage.run({ userId: req.user.id }, next);
}
