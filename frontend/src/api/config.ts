export const DEFAULT_NATIVE_API_URL = 'https://p01--financetrack--ydkd8hhsbwn4.code.run';

function isNativeCapacitorApp(userAgent?: string) {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  const capacitor = typeof window !== 'undefined' ? (window as any)?.Capacitor : undefined;
  return /Capacitor|PhoneGap/i.test(ua) || capacitor?.isNativePlatform?.() === true;
}

export function resolveApiOrigin(options: {
  env?: Record<string, string | undefined>;
  location?: {
    origin?: string;
    protocol?: string;
    hostname?: string;
  };
  defaultOrigin?: string;
  userAgent?: string;
} = {}) {
  const env = options.env ?? (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {});
  const defaultOrigin = options.defaultOrigin ?? DEFAULT_NATIVE_API_URL;
  const explicitOrigin = (env.VITE_API_URL ?? '').trim();

  if (explicitOrigin) {
    return explicitOrigin.replace(/\/$/, '');
  }

  const location = options.location ?? (typeof window !== 'undefined' ? window.location : undefined);
  const nativeApp = isNativeCapacitorApp(options.userAgent);

  if (nativeApp) {
    return defaultOrigin;
  }

  if (location) {
    const origin = location.origin && location.origin !== 'null' ? location.origin : undefined;
    if (origin && origin !== 'capacitor://localhost' && origin !== 'https://localhost' && origin !== 'http://localhost' && origin !== 'http://127.0.0.1') {
      return origin.replace(/\/$/, '');
    }

    if (location.protocol === 'capacitor:') {
      return defaultOrigin;
    }

    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }

  return defaultOrigin;
}
