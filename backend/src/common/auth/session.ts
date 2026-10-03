import { createHmac, timingSafeEqual } from 'crypto';

export interface SessionPayload { userId: string; expires: number; }

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required in production');
  return 'development-only-fintrack-session-secret';
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueSession(userId: string): string {
  const days = Math.min(365, Math.max(1, Number(process.env.SESSION_DURATION_DAYS || 30)));
  const encoded = Buffer.from(JSON.stringify({ userId, expires: Date.now() + days * 86_400_000 })).toString('base64url');
  return `${encoded}.${signature(encoded)}`;
}

export function readSession(token: string): SessionPayload | null {
  try {
    const [payload, supplied, extra] = token.split('.');
    if (!payload || !supplied || extra) return null;
    const expected = signature(payload);
    if (expected.length !== supplied.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionPayload;
    return typeof parsed.userId === 'string' && parsed.expires > Date.now() ? parsed : null;
  } catch { return null; }
}
