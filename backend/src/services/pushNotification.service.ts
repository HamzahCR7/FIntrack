import { createSign } from 'crypto';
import webpush from 'web-push';
import { prisma } from '../config/prisma';

type PushMessage = { title: string; body: string; data?: Record<string, string> };
let googleAccessToken: { value: string; expiresAt: number } | undefined;

const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

export class PushNotificationService {
  static vapidPublicKey() { return process.env.VAPID_PUBLIC_KEY || null; }

  async saveWebSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { kind: 'WEB', endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userId },
      update: { kind: 'WEB', p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userId },
    });
  }

  async saveNativeToken(userId: string, token: string, platform: string) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: token },
      create: { kind: 'NATIVE', endpoint: token, platform, userId },
      update: { kind: 'NATIVE', platform, userId },
    });
  }

  async remove(endpoint: string) { await prisma.pushSubscription.deleteMany({ where: { endpoint } }); }

  async send(message: PushMessage, userId?: string | null) {
    const subscriptions = await prisma.pushSubscription.findMany({ where: userId === undefined ? undefined : { userId } });
    await Promise.allSettled(subscriptions.map(async (subscription) => {
      try {
        if (subscription.kind === 'WEB') await this.sendWeb(subscription, message);
        if (subscription.kind === 'NATIVE') await this.sendNative(subscription.endpoint, message);
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410 || error?.status === 404 || error?.status === 410) await this.remove(subscription.endpoint);
        else console.warn('Push delivery failed:', error?.message || error);
      }
    }));
  }

  private async sendWeb(subscription: { endpoint: string; p256dh: string | null; auth: string | null }, message: PushMessage) {
    const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
    if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !subscription.p256dh || !subscription.auth) return;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(message));
  }

  private async sendNative(token: string, message: PushMessage) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) return;
    const accessToken = await this.getGoogleAccessToken(FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY);
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title: message.title, body: message.body }, data: message.data || {}, android: { priority: 'high' }, apns: { payload: { aps: { sound: 'default' } } } } }),
    });
    if (!response.ok) throw Object.assign(new Error(await response.text()), { status: response.status });
  }

  private async getGoogleAccessToken(email: string, privateKey: string) {
    if (googleAccessToken && googleAccessToken.expiresAt > Date.now() + 60_000) return googleAccessToken.value;
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
    const signer = createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
    const assertion = `${unsigned}.${signer.sign(privateKey.replace(/\\n/g, '\n')).toString('base64url')}`;
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
    if (!response.ok) throw new Error(`FCM authentication failed: ${await response.text()}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    googleAccessToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }
}
