import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, needsPasswordUpgrade, verifyPassword } from '../common/auth/password';
import { issueSession } from '../common/auth/session';

const STARTER_CATEGORIES = [
  ['Food & Dining', '🍽️', '#f97316'], ['Transport', '🚗', '#3b82f6'],
  ['Shopping', '🛍️', '#a855f7'], ['Bills & Utilities', '💡', '#eab308'],
  ['Health', '🏥', '#ef4444'], ['Entertainment', '🎬', '#ec4899'],
  ['Salary', '💰', '#22c55e'], ['Other', '📦', '#64748b'],
] as const;

type GoogleClaims = { sub: string; aud: string; email: string; email_verified: string; name?: string; picture?: string; exp: string };

function publicUser(user: { id: string; username: string; name: string | null; email: string | null; avatarUrl: string | null }) {
  return { id: user.id, username: user.username, name: user.name || user.username, email: user.email, avatarUrl: user.avatarUrl };
}

export class AuthController {
  public router = Router();

  constructor() {
    this.router.post('/login', this.login.bind(this));
    this.router.post('/google', this.google.bind(this));
    this.router.post('/register', (_req, res) => res.status(403).json({ success: false, message: 'Use Google to create a new account.' }));
    this.router.get('/me', this.me.bind(this));
  }

  private async login(req: Request, res: Response, next: NextFunction) {
    try {
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');
      if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password are required' });
      let user = await prisma.user.findFirst({ where: { username: { equals: username } } });
      const configuredOwner = process.env.ADMIN_USERNAME;
      if (!user && configuredOwner && username.toLowerCase() === configuredOwner.toLowerCase() && password === process.env.ADMIN_PASSWORD) {
        user = await prisma.user.create({ data: { username: configuredOwner, password: hashPassword(password), name: configuredOwner, authProvider: 'PASSWORD' } });
      }
      if (!user?.password || !verifyPassword(password, user.password)) return res.status(401).json({ success: false, message: 'Invalid username or password' });
      if (needsPasswordUpgrade(user.password)) user = await prisma.user.update({ where: { id: user.id }, data: { password: hashPassword(password), lastLoginAt: new Date() } });
      else await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return res.json({ success: true, data: { user: publicUser(user), token: issueSession(user.id) } });
    } catch (error) { next(error); }
  }

  private async google(req: Request, res: Response, next: NextFunction) {
    try {
      const credential = String(req.body?.credential || '');
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!credential || !clientId) return res.status(503).json({ success: false, message: 'Google sign-in is not configured' });
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!response.ok) return res.status(401).json({ success: false, message: 'Invalid Google credential' });
      const claims = await response.json() as GoogleClaims;
      if (claims.aud !== clientId || claims.email_verified !== 'true' || Number(claims.exp) * 1000 <= Date.now()) {
        return res.status(401).json({ success: false, message: 'Invalid Google credential' });
      }
      let user = await prisma.user.findUnique({ where: { googleSubject: claims.sub } });
      if (!user) {
        // Email matches are deliberately not auto-linked to avoid account takeover.
        if (await prisma.user.findUnique({ where: { email: claims.email } })) return res.status(409).json({ success: false, message: 'This email belongs to an existing account. Sign in there first to link Google.' });
        const base = claims.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '') || 'user';
        let username = base;
        for (let suffix = 1; await prisma.user.findUnique({ where: { username } }); suffix += 1) username = `${base}${suffix}`;
        user = await prisma.$transaction(async tx => {
          const created = await tx.user.create({ data: { username, email: claims.email, googleSubject: claims.sub, authProvider: 'GOOGLE', name: claims.name || base, avatarUrl: claims.picture, lastLoginAt: new Date() } });
          await tx.category.createMany({ data: STARTER_CATEGORIES.map(([name, icon, color]) => ({ userId: created.id, name, icon, color, isSystem: false })) });
          return created;
        });
      } else {
        user = await prisma.user.update({ where: { id: user.id }, data: { name: claims.name || user.name, avatarUrl: claims.picture || user.avatarUrl, lastLoginAt: new Date() } });
      }
      return res.json({ success: true, data: { user: publicUser(user), token: issueSession(user.id) } });
    } catch (error) { next(error); }
  }

  private async me(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    return res.json({ success: true, data: { user: req.user } });
  }
}
