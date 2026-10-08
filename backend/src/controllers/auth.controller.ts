import { Router, Request, Response, NextFunction } from 'express';
import { createHash, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { prisma } from '../config/prisma';

const scrypt = promisify(scryptCallback);

export async function verifyPassword(storedPassword: string | null, suppliedPassword: string): Promise<boolean> {
  if (!storedPassword) return false;

  const [scheme, salt, expectedHex] = storedPassword.split('$');
  if (scheme === 'scrypt' && salt && expectedHex && /^[a-f\d]+$/i.test(expectedHex) && expectedHex.length % 2 === 0) {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = await scrypt(suppliedPassword, salt, expected.length) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  const storedDigest = createHash('sha256').update(storedPassword).digest();
  const suppliedDigest = createHash('sha256').update(suppliedPassword).digest();
  return timingSafeEqual(storedDigest, suppliedDigest);
}

export class AuthController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initRoutes();
  }

  private initRoutes() {
    this.router.post('/login', this.login.bind(this));
    this.router.post('/register', this.register.bind(this));
    this.router.get('/me', this.getMe.bind(this));
  }

  private async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
      }

      // Find user (case-insensitive check)
      const inputUsername = username.trim();
      const users = await prisma.user.findMany();
      let user = users.find((candidate) => candidate.username.toLowerCase() === inputUsername.toLowerCase()) || null;

      // Fallback: If DB does not have Hamzah yet, ensure default user exists
      if (!user && (inputUsername.toLowerCase() === 'hamzah' || (await prisma.user.count()) === 0)) {
        user = await prisma.user.create({
          data: {
            username: 'Hamzah',
            password: 'Hamzah987',
            name: 'Hamzah',
          },
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password',
        });
      }

      if (!(await verifyPassword(user.password, password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password',
        });
      }

      const token = Buffer.from(`${user.id}:${user.username}`).toString('base64');

      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          user: { id: user.id, username: user.username, name: user.name || user.username },
          token: `fintrack_${token}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private async register(_req: Request, res: Response, _next: NextFunction) {
    return res.status(403).json({
      success: false,
      message: 'New user registration is currently disabled.',
    });
  }

  private async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const rawToken = authHeader.replace('Bearer fintrack_', '');
      const decoded = Buffer.from(rawToken, 'base64').toString('utf-8');
      const [id, username] = decoded.split(':');

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session' });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: { id: user.id, username: user.username, name: user.name },
        },
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid' });
    }
  }
}
