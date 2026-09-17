import { Request, Response } from 'express';
import { createProductionAuth, validateProductionConfig, issueSession, validSession } from './productionAuth';

describe('production authentication', () => {
  const original = process.env;
  let productionAuth = createProductionAuth();
  beforeEach(() => {
    productionAuth = createProductionAuth();
    process.env = { ...original, NODE_ENV: 'production', ADMIN_USERNAME: 'owner', ADMIN_PASSWORD: 'test-password-123456', SESSION_SECRET: 'a'.repeat(32) };
  });
  afterEach(() => { process.env = original; jest.useRealTimers(); });
  const request = (token: string) => ({ headers: { authorization: token } } as Request);
  test('rejects incomplete production configuration', () => {
    delete process.env.SESSION_SECRET;
    expect(validateProductionConfig).toThrow();
  });
  test('accepts signed sessions and rejects tampering, legacy tokens and missing Bearer', () => {
    const token = issueSession();
    expect(validSession(request(`Bearer ${token}`))).toBe(true);
    expect(validSession(request(`Bearer ${token}x`))).toBe(false);
    expect(validSession(request('Bearer fintrack_b3duZXI='))).toBe(false);
    expect(validSession(request(token))).toBe(false);
  });
  test('expires sessions after twelve hours', () => {
    jest.useFakeTimers();
    const token = issueSession();
    jest.advanceTimersByTime(12 * 60 * 60 * 1000 + 1);
    expect(validSession(request(`Bearer ${token}`))).toBe(false);
  });
  test('protects data endpoints and permits authenticated requests', () => {
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    productionAuth({ ...request(''), path: '/accounts' } as Request, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    productionAuth({ ...request(`Bearer ${issueSession()}`), path: '/accounts' } as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
  test('login only accepts configured production credentials', () => {
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const req = { headers: {}, path: '/auth/login', method: 'POST', body: { username: 'owner', password: 'wrong' } } as Request;
    productionAuth(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    req.body.password = process.env.ADMIN_PASSWORD;
    productionAuth(req, res as unknown as Response, next);
    expect(res.json).toHaveBeenLastCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ token: expect.any(String) }) }));
  });
  test('throttles login across usernames and proxy headers, preserves sessions and recovers', () => {
    jest.useFakeTimers();
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const req = { headers: {}, path: '/auth/login', method: 'POST', body: { username: 'owner', password: 'wrong' } } as Request;
    for (let i = 0; i < 10; i++) productionAuth(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenLastCalledWith(401);
    req.headers['x-forwarded-for'] = '203.0.113.1';
    req.body.username = 'different';
    productionAuth(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenLastCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    productionAuth({ ...request(`Bearer ${issueSession()}`), path: '/accounts' } as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60_000);
    req.body = { username: 'owner', password: process.env.ADMIN_PASSWORD };
    productionAuth(req, res as unknown as Response, next);
    expect(res.json).toHaveBeenLastCalledWith(expect.objectContaining({ success: true }));
  });
  test('does not throttle local development', () => {
    process.env.NODE_ENV = 'development';
    const next = jest.fn();
    for (let i = 0; i < 15; i++) productionAuth({ path: '/auth/login', method: 'POST' } as Request, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(15);
  });
});
