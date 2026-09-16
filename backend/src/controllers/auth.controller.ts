import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

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
      let user = await prisma.user.findFirst({
        where: {
          username: inputUsername,
        },
      });

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

      if (user.password !== password) {
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
