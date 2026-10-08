import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { PushNotificationService } from '../services/pushNotification.service';

const webSubscription = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) });
const nativeToken = z.object({ token: z.string().min(1).max(4096), platform: z.enum(['android', 'ios']) });
const removeSubscription = z.object({ endpoint: z.string().min(1) });

export class PushNotificationController {
  public router = Router();
  private service = new PushNotificationService();
  constructor() {
    this.router.get('/vapid-public-key', this.getVapidKey);
    this.router.post('/web-subscriptions', this.saveWeb);
    this.router.post('/native-tokens', this.saveNative);
    this.router.delete('/subscriptions', this.remove);
  }
  private userId(req: Request) {
    if (process.env.NODE_ENV === 'production') return 'owner';
    try { return Buffer.from((req.header('authorization') || '').replace(/^Bearer fintrack_/, ''), 'base64').toString().split(':')[0] || 'owner'; } catch { return 'owner'; }
  }
  private getVapidKey = (_req: Request, res: Response) => res.json({ status: 'success', data: { publicKey: PushNotificationService.vapidPublicKey() } });
  private saveWeb = async (req: Request, res: Response, next: NextFunction) => { try { const data = webSubscription.parse(req.body); await this.service.saveWebSubscription(this.userId(req), data); res.status(201).json({ status: 'success' }); } catch (error) { next(error); } };
  private saveNative = async (req: Request, res: Response, next: NextFunction) => { try { const data = nativeToken.parse(req.body); await this.service.saveNativeToken(this.userId(req), data.token, data.platform); res.status(201).json({ status: 'success' }); } catch (error) { next(error); } };
  private remove = async (req: Request, res: Response, next: NextFunction) => { try { await this.service.remove(removeSubscription.parse(req.body).endpoint); res.status(204).send(); } catch (error) { next(error); } };
}
