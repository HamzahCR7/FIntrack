import { hashPassword, needsPasswordUpgrade, verifyPassword } from '../auth/password';
import { issueSession, readSession } from '../auth/session';
import { validateProductionConfig } from './productionAuth';

describe('multi-user authentication primitives', () => {
  const original = process.env;
  beforeEach(() => { process.env = { ...original, SESSION_SECRET: 'a'.repeat(32) }; });
  afterEach(() => { process.env = original; jest.useRealTimers(); });

  test('signed sessions carry the user id and reject tampering', () => {
    const token = issueSession('user-a');
    expect(readSession(token)?.userId).toBe('user-a');
    expect(readSession(`${token}x`)).toBeNull();
    expect(readSession('fintrack_legacy')).toBeNull();
  });

  test('sessions expire after the configured duration', () => {
    jest.useFakeTimers();
    process.env.SESSION_DURATION_DAYS = '7';
    const token = issueSession('user-b');
    jest.advanceTimersByTime(7 * 86_400_000 + 1);
    expect(readSession(token)).toBeNull();
  });

  test('hashes passwords and supports one-time legacy plaintext verification', () => {
    const encoded = hashPassword('correct horse battery staple');
    expect(encoded).not.toContain('correct horse battery staple');
    expect(verifyPassword('correct horse battery staple', encoded)).toBe(true);
    expect(verifyPassword('wrong', encoded)).toBe(false);
    expect(verifyPassword('legacy', 'legacy')).toBe(true);
    expect(needsPasswordUpgrade('legacy')).toBe(true);
  });

  test('requires a strong production session secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'short';
    expect(validateProductionConfig).toThrow('SESSION_SECRET');
  });
});
