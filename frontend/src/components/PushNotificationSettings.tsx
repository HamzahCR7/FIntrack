import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { disableNativePush, disableWebPush, enableNativePush, enableWebPush, isNativePushPlatform } from '../services/pushNotifications';
import { useToast } from '../utils/toastStore';

export const PushNotificationSettings: React.FC = () => {
  const { addToast } = useToast();
  const [enabled, setEnabled] = useState(() => localStorage.getItem('fintrack_push_enabled') === 'true');
  const [busy, setBusy] = useState(false);
  const native = isNativePushPlatform();
  useEffect(() => {
    if (enabled && native) void enableNativePush((message) => addToast(message, 'info'));
  }, []);
  const toggle = async () => {
    setBusy(true);
    try {
      const active = enabled ? false : native ? await enableNativePush((message) => addToast(message, 'info')) : await enableWebPush();
      if (!active && !enabled) throw new Error('Notification permission was not granted.');
      if (enabled) native ? await disableNativePush() : await disableWebPush();
      setEnabled(active); localStorage.setItem('fintrack_push_enabled', String(active));
      addToast(active ? 'Push notifications enabled.' : 'Push notifications disabled.', active ? 'success' : 'info');
    } catch (error) { addToast(error instanceof Error ? error.message : 'Unable to update notifications.', 'error'); }
    finally { setBusy(false); }
  };
  return <button onClick={toggle} disabled={busy} className="shrink-0 rounded-xl border border-slate-700/60 bg-slate-800 p-2.5 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white disabled:opacity-50" title={enabled ? 'Disable push notifications' : 'Enable push notifications'} aria-label={enabled ? 'Disable push notifications' : 'Enable push notifications'}>{enabled ? <Bell className="h-4 w-4 text-blue-400" /> : <BellOff className="h-4 w-4" />}</button>;
};
