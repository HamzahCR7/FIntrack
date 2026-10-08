import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from '../api/client';

const nativeEndpointKey = 'fintrack_native_push_endpoint';
const webEndpointKey = 'fintrack_web_push_endpoint';

const urlBase64ToUint8Array = (value: string) => {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

export async function enableNativePush(onMessage: (message: string) => void) {
  if (!Capacitor.isNativePlatform()) return false;
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return false;
  await PushNotifications.createChannel({ id: 'fintrack-alerts', name: 'FinTrack alerts', description: 'Financial updates and reminders', importance: 4, visibility: 1, sound: 'default', vibration: true });
  await PushNotifications.addListener('registration', ({ value }) => {
    localStorage.setItem(nativeEndpointKey, value);
    void api.saveNativePushToken(value, Capacitor.getPlatform() === 'ios' ? 'ios' : 'android');
  });
  await PushNotifications.addListener('pushNotificationReceived', (notification) => onMessage(notification.body || notification.title || 'New FinTrack notification'));
  await PushNotifications.register();
  return true;
}

export async function disableNativePush() {
  const endpoint = localStorage.getItem(nativeEndpointKey);
  if (endpoint) await api.removePushSubscription(endpoint);
  localStorage.removeItem(nativeEndpointKey);
  if (Capacitor.isNativePlatform()) await PushNotifications.unregister();
}

export async function enableWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const publicKey = await api.getVapidPublicKey();
  if (!publicKey) throw new Error('Web push is not configured on the server.');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  await api.saveWebPushSubscription(subscription.toJSON());
  localStorage.setItem(webEndpointKey, subscription.endpoint);
  return true;
}

export async function disableWebPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  const endpoint = subscription?.endpoint || localStorage.getItem(webEndpointKey);
  if (endpoint) await api.removePushSubscription(endpoint);
  await subscription?.unsubscribe();
  localStorage.removeItem(webEndpointKey);
}

export const isNativePushPlatform = () => Capacitor.isNativePlatform();
