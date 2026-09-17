import { createHmac, timingSafeEqual, createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.ADMIN_USERNAME || (process.env.ADMIN_PASSWORD || '').length < 16 || (process.env.SESSION_SECRET || '').length < 32) {
    throw new Error('Production requires ADMIN_USERNAME, ADMIN_PASSWORD (16+ characters), and SESSION_SECRET (32+ characters)');
  }
}

function equal(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
function sign(payload: string) {
  return createHmac('sha256', process.env.SESSION_SECRET!).update(payload).digest('base64url');
}
export function issueSession() {
  const payload = Buffer.from(JSON.stringify({ username: process.env.ADMIN_USERNAME, expires: Date.now() + 12 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function validSession(req: Request): boolean {
  try {
    if (!req.headers.authorization?.startsWith('Bearer ')) return false;
    const [payload, signature, extra] = (req.headers.authorization || '').replace(/^Bearer /, '').split('.');
    if (!payload || !signature || extra || !equal(signature, sign(payload))) return false;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.username === process.env.ADMIN_USERNAME && typeof session.expires === 'number' && session.expires > Date.now();
  } catch { return false; }
}
// Shared limit for the single-owner service; independent of untrusted proxy headers.
export function createProductionAuth() {
  let attempts = 0;
  let windowEndsAt = 0;
  return function productionAuth(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'production') return next();
    res.setHeader('Cache-Control', 'no-store');
    const user = { id: 'owner', username: process.env.ADMIN_USERNAME, name: process.env.ADMIN_USERNAME };
    if (req.path === '/auth/login' && req.method === 'POST') {
      const now = Date.now();
      if (now >= windowEndsAt) {
        attempts = 0;
        windowEndsAt = now + 60_000;
      }
      if (attempts >= 10) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((windowEndsAt - now) / 1000))));
        return res.status(429).json({ success: false, message: 'Too many login attempts. Please try again in a minute.' });
      }
      attempts += 1;
      const { username, password } = req.body || {};
      if (typeof username !== 'string' || typeof password !== 'string' || !equal(username, process.env.ADMIN_USERNAME!) || !equal(password, process.env.ADMIN_PASSWORD!)) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
      return res.json({ success: true, data: { user, token: issueSession() } });
    }
    if (!validSession(req)) return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    if (req.path === '/auth/me' && req.method === 'GET') return res.json({ success: true, data: { user } });
    return next();
  };
}
