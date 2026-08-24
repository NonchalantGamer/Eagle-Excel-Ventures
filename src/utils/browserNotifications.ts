import { OrderStatus } from '../types';

export type BrowserNotificationStatus = NotificationPermission | 'unsupported';

const BROWSER_NOTIFS_ENABLED_KEY = 'ee_browser_push_notifications_enabled';
const APP_ICON = '/vite.svg';

/**
 * Check if the browser natively supports the Web Notifications API
 */
export function isBrowserNotificationSupported(): boolean {
  try {
    return typeof window !== 'undefined' && 'Notification' in window;
  } catch {
    return false;
  }
}

/**
 * Get current browser notification permission status
 */
export function getBrowserNotificationPermission(): BrowserNotificationStatus {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/**
 * Read user's local preference for browser push notifications
 */
export function getBrowserNotificationPreference(): boolean {
  try {
    const saved = localStorage.getItem(BROWSER_NOTIFS_ENABLED_KEY);
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Default to true if browser already has granted permission, otherwise true
    return true;
  } catch {
    return true;
  }
}

/**
 * Save user's local preference for browser push notifications
 */
export function setBrowserNotificationPreference(enabled: boolean): void {
  try {
    localStorage.setItem(BROWSER_NOTIFS_ENABLED_KEY, JSON.stringify(enabled));
  } catch (e) {
    console.warn('Failed to save browser notification preference:', e);
  }
}

/**
 * Request notification permission from the user
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationStatus> {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotificationPreference(true);
    }
    return permission;
  } catch (e) {
    console.warn('Error requesting browser notification permission:', e);
    return getBrowserNotificationPermission();
  }
}

export interface NativeNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: any;
  renotify?: boolean;
  silent?: boolean;
  onClick?: () => void;
}

// Memory tracker to prevent duplicate native alerts within short timeframe
const recentlyPushedNativeNotifs = new Map<string, number>();

/**
 * Send a browser-native desktop/mobile push notification
 */
export function sendBrowserNativeNotification(payload: NativeNotificationPayload): boolean {
  if (!isBrowserNotificationSupported()) {
    return false;
  }

  try {
    if (Notification.permission !== 'granted') {
      return false;
    }

    const dedupeKey = `${payload.tag || payload.title}_${payload.body}`;
    const now = Date.now();
    const lastPushed = recentlyPushedNativeNotifs.get(dedupeKey);
    if (lastPushed && now - lastPushed < 5000) {
      // Suppress duplicates within 5 seconds
      return false;
    }
    recentlyPushedNativeNotifs.set(dedupeKey, now);

    const options: any = {
      body: payload.body,
      icon: payload.icon || APP_ICON,
      badge: payload.badge || APP_ICON,
      tag: payload.tag,
      data: payload.data,
      renotify: payload.renotify ?? true,
      silent: payload.silent ?? false
    };

    const notification = new Notification(payload.title, options);

    notification.onclick = (event) => {
      try {
        event.preventDefault();
        window.focus();
        if (payload.onClick) {
          payload.onClick();
        }
        notification.close();
      } catch (err) {
        console.debug('Notification click handling:', err);
      }
    };

    // Auto-close after 8 seconds on platforms where notifications don't self-dismiss
    setTimeout(() => {
      try {
        notification.close();
      } catch {}
    }, 8000);

    return true;
  } catch (err) {
    console.warn('Failed to display browser-native notification:', err);
    return false;
  }
}

/**
 * Format and push a browser-native notification specifically for an Order Status transition
 */
export function pushBrowserOrderStatusNotification(params: {
  orderNumber: string;
  newStatus: OrderStatus | string;
  previousStatus?: OrderStatus | string;
  trackingNumber?: string;
  carrier?: string;
  country?: 'nigeria' | 'cameroon' | string;
  total?: number;
  onClick?: () => void;
}): boolean {
  const { orderNumber, newStatus, previousStatus, trackingNumber, carrier, country, onClick } = params;

  let title = `📦 Order #${orderNumber} Status Updated: ${newStatus.toUpperCase()}`;
  let body = `Your consignment #${orderNumber} status changed from ${previousStatus || 'pending'} to ${newStatus}.`;

  const destPort = country === 'cameroon' ? 'Douala Port' : 'Lagos Apapa Port';

  switch (newStatus) {
    case 'shipped':
      title = `🚢 Order #${orderNumber} Shipped & In Transit!`;
      body = `Your consignment has departed Shenzhen aboard ${carrier || 'Maritime Vessel'}${
        trackingNumber ? ` (Waybill: ${trackingNumber})` : ''
      } en route to ${destPort}. Click to track consignment.`;
      break;

    case 'processing':
      title = `⚙️ Order #${orderNumber} Now Processing & Packing`;
      body = `Your wholesale items are being inspected, palletized, and prepared for export at our Guangzhou fulfillment hub.`;
      break;

    case 'confirmed':
      title = `🎉 Order #${orderNumber} Confirmed & Scheduled`;
      body = `Your purchase order has been approved by our operations desk and scheduled for warehouse export packing.`;
      break;

    case 'customs_cleared':
      title = `🛡️ Customs Cleared: Order #${orderNumber}`;
      body = `Consignment #${orderNumber} has cleared destination customs clearance at ${destPort} and is entering final distribution.`;
      break;

    case 'delivered':
      title = `✅ Order #${orderNumber} Delivered Successfully`;
      body = `Your consignment has safely arrived at the destination distribution facility and is ready for collection or direct handover.`;
      break;

    case 'cancelled':
      title = `⚠️ Order #${orderNumber} Cancelled`;
      body = `Consignment #${orderNumber} has been updated to cancelled. Contact support if you need assistance.`;
      break;

    default:
      title = `📦 Order #${orderNumber}: ${newStatus.toUpperCase()}`;
      body = `Your order status is now ${newStatus}.${trackingNumber ? ` Tracking Number: ${trackingNumber}` : ''}`;
      break;
  }

  return sendBrowserNativeNotification({
    title,
    body,
    tag: `order-status-${orderNumber}`,
    renotify: true,
    data: { orderNumber, status: newStatus },
    onClick
  });
}
