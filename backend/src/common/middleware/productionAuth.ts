import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { readSession } from '../auth/session';

export function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  if ((process.env.SESSION_SECRET || '').length < 32) {
    throw new Error('Production requires SESSION_SECRET (32+ characters)');
  }
  if (process.env.SESSION_DURATION_DAYS && !validSessionDuration(process.env.SESSION_DURATION_DAYS)) {
    throw new Error('SESSION_DURATION_DAYS must be a number between 1 and 365');
  }
}

function validSessionDuration(value: string) {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 && days <= 365;
}

function sessionDurationMs() {
  const days = process.env.SESSION_DURATION_DAYS || '30';
  return Number(days) * 24 * 60 * 60 * 1000;
}

export function createProductionAuth() {
  return async function productionAuth(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST' && (req.path === '/auth/login' || req.path === '/auth/google')) return next();
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    const session = token ? readSession(token) : null;
    if (!session) return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    try {
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid or expired session' });
      req.user = { id: user.id, username: user.username, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
      return next();
    } catch (error) { return next(error); }
  };
}
