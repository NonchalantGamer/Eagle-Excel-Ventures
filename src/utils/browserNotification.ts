/**
 * Safe Browser Desktop Notification Utility
 * Provides cross-browser native system notifications with permission checks and auto-dismiss.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

export interface ShowNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
  autoCloseMs?: number;
}

export function showBrowserNotification(
  title: string,
  options: ShowNotificationOptions = {}
): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notif = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '/favicon.ico',
      tag: options.tag || `ee_notif_${Date.now()}`,
      silent: false
    });

    if (options.onClick) {
      notif.onclick = (e) => {
        e.preventDefault();
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }

    const autoClose = options.autoCloseMs ?? 6000;
    if (autoClose > 0) {
      setTimeout(() => {
        try {
          notif.close();
        } catch {}
      }, autoClose);
    }

    return notif;
  } catch (err) {
    console.debug('Browser notification display bypassed:', err);
    return null;
  }
}
