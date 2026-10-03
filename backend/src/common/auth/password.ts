import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const PREFIX = 'scrypt';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith(`${PREFIX}$`)) {
    const actual = createHash('sha256').update(password).digest();
    const expected = createHash('sha256').update(stored).digest();
    return timingSafeEqual(actual, expected);
  }
  const [, salt, expectedHex] = stored.split('$');
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function needsPasswordUpgrade(stored: string): boolean {
  return !stored.startsWith(`${PREFIX}$`);
}
