import { getSupabase, isSupabaseEnabled, OperationType, handleSupabaseError } from '../lib/supabase';
import { AppNotification, UserRole } from '../types';

const NOTIFICATIONS_TABLE = 'notifications';
const LOCAL_STORAGE_NOTIFS_KEY = 'ee_cached_notifications';

// Web Audio API notification chime generator (no external audio files required)
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Pleasant two-tone chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6
    
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Audio context may be restricted by browser autoplay policy
    console.debug('Audio notification chime muted:', err);
  }
}

/**
 * Evaluates whether a notification is truly important (actionable business/freight/order event)
 * vs. low-priority background noise or spam.
 */
export function isImportantNotification(notif: Partial<AppNotification>): boolean {
  if (!notif) return false;

  // Explicit priority or importance flags
  if (notif.priority === 'urgent' || notif.importance === 'critical' || notif.importance === 'high') {
    return true;
  }
  if (notif.importance === 'low') {
    return false;
  }

  // Trivial system notifications (Welcome, profile updates, greetings) are filtered out as non-important
  if (notif.type === 'system') {
    const titleLower = (notif.title || '').toLowerCase();
    const msgLower = (notif.message || '').toLowerCase();
    if (titleLower.includes('welcome') || titleLower.includes('profile updated') || msgLower.includes('profile')) {
      return false;
    }
  }

  // Actionable business notifications
  switch (notif.type) {
    case 'order_status':
    case 'new_order':
    case 'customs_update':
    case 'rfq_submission':
    case 'new_message':
    case 'inventory_alert':
      return true;
    case 'broadcast':
    case 'promotional':
    default:
      return false;
  }
}

/**
 * Determine exact importance tier for a notification
 */
export function getNotificationImportance(notif: Partial<AppNotification>): 'critical' | 'high' | 'normal' | 'low' {
  if (notif.importance) return notif.importance;
  if (notif.priority === 'urgent') return 'critical';
  
  if (notif.type === 'order_status') {
    if (notif.status === 'shipped' || notif.status === 'delivered' || notif.status === 'customs_cleared' || notif.status === 'cancelled') {
      return 'critical';
    }
    return 'high';
  }
  if (notif.type === 'new_order' || notif.type === 'customs_update') return 'critical';
  if (notif.type === 'rfq_submission' || notif.type === 'new_message') return 'high';
  if (notif.type === 'inventory_alert') return 'high';
  
  return 'low';
}

// Real notifications only
export const INITIAL_SEED_NOTIFICATIONS: AppNotification[] = [];

// Helper to get cached local notifications, filtering out spam/trivial messages
function getCachedNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
    if (!raw) return [];
    const parsed: AppNotification[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter(n => {
        if (!n || typeof n.id !== 'string') return false;
        if (n.id.startsWith('notif_init_')) return false;
        // Anti-spam cleanup: Purge any legacy welcome or profile updated spam
        const titleLower = (n.title || '').toLowerCase();
        if (titleLower.includes('welcome') || titleLower.includes('profile updated')) return false;
        return true;
      });
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
}

function saveCachedNotifications(notifs: AppNotification[]): void {
  try {
    const cleaned = notifs.filter(n => {
      if (!n || typeof n.id !== 'string') return false;
      if (n.id.startsWith('notif_init_')) return false;
      const titleLower = (n.title || '').toLowerCase();
      if (titleLower.includes('welcome') || titleLower.includes('profile updated')) return false;
      return true;
    });
    localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.warn('Failed to save notifications cache:', e);
  }
}

// Anti-Spam deduplication memory cache (expires after 3 minutes)
const recentNotificationDedupe = new Map<string, number>();

// Multi-tab / component notification broadcaster
export function notifyNotificationChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ee_notification_update', { detail: { timestamp: Date.now() } }));
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ee_notifications_channel');
        bc.postMessage({ type: 'notification_update', timestamp: Date.now() });
        bc.close();
      }
    } catch {}
  }
}

// Send or Dispatch a new notification with Anti-Spam deduplication
export async function sendAppNotification(
  notificationData: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
): Promise<AppNotification> {
  const isImportant = isImportantNotification(notificationData);
  const importance = getNotificationImportance(notificationData);

  // Anti-Spam deduplication: prevent creating duplicate notifications
  if (notificationData.type === 'new_message') {
    const dedupeKey = `msg_${notificationData.recipientRole || ''}_${notificationData.referenceId || ''}_${notificationData.message}`;
    const now = Date.now();
    const lastSent = recentNotificationDedupe.get(dedupeKey);
    if (lastSent && now - lastSent < 10 * 60 * 1000) {
      const existing = getCachedNotifications();
      const match = existing.find(n => n.type === 'new_message' && n.referenceId === notificationData.referenceId && n.message === notificationData.message);
      if (match) {
        return match;
      }
    }
    recentNotificationDedupe.set(dedupeKey, now);
  } else {
    const dedupeKey = `${notificationData.recipientRole || ''}_${notificationData.userId || ''}_${notificationData.type}_${notificationData.referenceId || ''}_${notificationData.status || ''}_${notificationData.title}`;
    const now = Date.now();
    const lastSent = recentNotificationDedupe.get(dedupeKey);
    
    if (lastSent && now - lastSent < 60 * 1000) {
      const existing = getCachedNotifications();
      const match = existing.find(n => n.title === notificationData.title && n.referenceId === notificationData.referenceId);
      if (match) {
        return match;
      }
    }
    recentNotificationDedupe.set(dedupeKey, now);
  }

  const newId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notification: AppNotification = {
    ...notificationData,
    id: newId,
    timestamp: new Date().toISOString(),
    read: false,
    isImportant,
    importance
  };

  // Always update local cache and immediately trigger UI listeners
  const existing = getCachedNotifications();
  const updated = [notification, ...existing.filter(n => n.id !== newId)].slice(0, 60);
  saveCachedNotifications(updated);
  notifyNotificationChange();

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from(NOTIFICATIONS_TABLE).insert(notification);
        if (error) {
          handleSupabaseError(error, OperationType.CREATE, `${NOTIFICATIONS_TABLE}/${newId}`);
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.CREATE, `${NOTIFICATIONS_TABLE}/${newId}`);
      }
    }
  }

  return notification;
}

// Mark single notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const existing = getCachedNotifications();
  const updated = existing.map(n => n.id === notificationId ? { ...n, read: true } : n);
  saveCachedNotifications(updated);
  notifyNotificationChange();

  if (!isSupabaseEnabled()) {
    return;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from(NOTIFICATIONS_TABLE).update({ read: true }).eq('id', notificationId);
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, `${NOTIFICATIONS_TABLE}/${notificationId}`);
    }
  }
}

// Mark all notifications of type 'new_message' for a specific customer or thread as read
export async function markMessageNotificationsAsRead(
  referenceIdOrCustomerId: string,
  role?: UserRole
): Promise<void> {
  if (!referenceIdOrCustomerId) return;
  const existing = getCachedNotifications();
  let hasChanges = false;

  const updated = existing.map(n => {
    if (n.read) return n;
    const isMsg = n.type === 'new_message' || (n.targetView as string) === 'support' || (n.targetView as string) === 'admin';
    const isTargetMatch = n.referenceId === referenceIdOrCustomerId || n.userId === referenceIdOrCustomerId;
    
    if (isMsg && isTargetMatch) {
      if (role) {
        if (role === 'admin' && (n.recipientRole === 'admin' || n.targetView === 'admin' || n.userId === 'all_admins')) {
          hasChanges = true;
          return { ...n, read: true };
        }
        if (role === 'customer' && (n.recipientRole === 'customer' || n.targetView === 'support' || n.userId === referenceIdOrCustomerId)) {
          hasChanges = true;
          return { ...n, read: true };
        }
      } else {
        hasChanges = true;
        return { ...n, read: true };
      }
    }
    return n;
  });

  if (hasChanges) {
    saveCachedNotifications(updated);
    notifyNotificationChange();

    if (isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase
            .from(NOTIFICATIONS_TABLE)
            .update({ read: true })
            .eq('type', 'new_message')
            .eq('referenceId', referenceIdOrCustomerId);
        } catch (err) {}
      }
    }
  }
}

// Mark all notifications as read for role/user
export async function markAllNotificationsAsRead(userRole: UserRole, userId?: string): Promise<void> {
  const existing = getCachedNotifications();
  const updated = existing.map(n => {
    const isTarget = n.recipientRole === 'all' || n.recipientRole === userRole || (userId && n.userId === userId);
    return isTarget ? { ...n, read: true } : n;
  });
  saveCachedNotifications(updated);
  notifyNotificationChange();

  if (!isSupabaseEnabled()) {
    return;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      if (userId) {
        await supabase.from(NOTIFICATIONS_TABLE).update({ read: true }).eq('userId', userId);
      } else {
        await supabase.from(NOTIFICATIONS_TABLE).update({ read: true }).eq('recipientRole', userRole);
      }
    } catch (err) {
      console.debug('Bulk read update handled locally:', err);
    }
  }
}

// Delete notification
export async function deleteNotificationById(notificationId: string): Promise<void> {
  const existing = getCachedNotifications();
  const updated = existing.filter(n => n.id !== notificationId);
  saveCachedNotifications(updated);
  notifyNotificationChange();

  if (!isSupabaseEnabled()) {
    return;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from(NOTIFICATIONS_TABLE).delete().eq('id', notificationId);
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, `${NOTIFICATIONS_TABLE}/${notificationId}`);
    }
  }
}

// Clear all notifications
export function clearAllLocalNotifications(): void {
  saveCachedNotifications([]);
  notifyNotificationChange();
}

// Real-time listener for Notifications
export function subscribeToNotifications(
  userRole: UserRole,
  userId: string | null,
  callback: (notifications: AppNotification[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  let isSubscribed = true;

  const filterForUser = (items: AppNotification[]): AppNotification[] => {
    return items.filter(n => {
      // 1. Explicit admin notifications -> strictly for admins
      if (n.recipientRole === 'admin' || n.targetView === 'admin' || n.userId === 'all_admins') {
        return userRole === 'admin';
      }

      // 2. Explicit customer notifications -> strictly for customers
      if (n.recipientRole === 'customer' || n.targetView === 'support' || n.targetView === 'orders') {
        if (userRole !== 'customer') return false; // Admin MUST NOT receive customer-bound notifications
        if (userId && n.userId && n.userId !== 'all' && n.userId !== 'all_customers' && n.userId !== userId) {
          return false;
        }
        return true;
      }

      // 3. Broadcasts for all users
      if (n.recipientRole === 'all' || n.userId === 'all') return true;

      // 4. Targeted directly to this user's specific ID
      if (userId && n.userId === userId) {
        if (userRole === 'admin' && (n.recipientRole === 'customer' || (n.targetView as string) === 'support')) {
          return false;
        }
        return true;
      }

      // 5. Admin catch-all (only for generic items, never customer-bound messages/orders)
      if (userRole === 'admin') {
        return n.recipientRole !== 'customer' && (n.targetView as string) !== 'support' && (n.targetView as string) !== 'orders';
      }

      return false;
    });
  };

  const notifySubscribers = () => {
    if (!isSubscribed) return;
    const current = filterForUser(getCachedNotifications());
    callback(current);
  };

  // Immediate push on subscription
  notifySubscribers();

  // Multi-channel reactive listeners
  const handleLocalUpdate = () => {
    notifySubscribers();
  };

  let bc: BroadcastChannel | null = null;
  if (typeof window !== 'undefined') {
    window.addEventListener('ee_notification_update', handleLocalUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === LOCAL_STORAGE_NOTIFS_KEY) {
        notifySubscribers();
      }
    });
    window.addEventListener('focus', notifySubscribers);
    window.addEventListener('online', notifySubscribers);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        notifySubscribers();
      }
    });

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('ee_notifications_channel');
        bc.onmessage = () => {
          notifySubscribers();
        };
      }
    } catch {}
  }

  // Periodic fallback refresh (800ms) for background synchronization
  const intervalId = setInterval(notifySubscribers, 800);

  // Supabase Real-Time Listener if enabled
  let supabaseUnsub: (() => void) | null = null;
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      supabase
        .from(NOTIFICATIONS_TABLE)
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0 && isSubscribed) {
            saveCachedNotifications(data as AppNotification[]);
            notifySubscribers();
          }
        });

      try {
        const channel = supabase
          .channel('public:notifications:all')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: NOTIFICATIONS_TABLE },
            () => {
              supabase
                .from(NOTIFICATIONS_TABLE)
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50)
                .then(({ data }) => {
                  if (data && isSubscribed) {
                    saveCachedNotifications(data as AppNotification[]);
                    notifySubscribers();
                  }
                });
            }
          )
          .subscribe();

        supabaseUnsub = () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        handleSupabaseError(error, OperationType.READ, NOTIFICATIONS_TABLE);
      }
    }
  }

  return () => {
    isSubscribed = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('ee_notification_update', handleLocalUpdate);
    }
    if (bc) {
      try { bc.close(); } catch {}
    }
    clearInterval(intervalId);
    if (supabaseUnsub) {
      supabaseUnsub();
    }
  };
}

// -------------------------------------------------------------
// REAL SYSTEM NOTIFICATION DISPATCHERS
// -------------------------------------------------------------

/**
 * Welcome notifications are suppressed to prevent spamming user inbox on every session/login.
 */
export async function sendWelcomeNotification(
  userId: string, 
  displayName: string, 
  role: UserRole
): Promise<AppNotification> {
  // Suppressed to avoid spamming notification center
  return {
    id: `notif_welcome_${userId}`,
    userId,
    recipientRole: role,
    type: 'system',
    title: `Welcome ${displayName || 'User'}`,
    message: 'Welcome to Eagle Excel Ventures.',
    timestamp: new Date().toISOString(),
    read: true,
    isImportant: false,
    importance: 'low'
  };
}

/**
 * Dispatch real customer order status update notification (packing, shipping, customs, delivery)
 */
export async function sendOrderStatusNotification(
  orderNumber: string,
  status: string,
  userId: string,
  trackingNumber?: string,
  carrier?: string,
  country: 'nigeria' | 'cameroon' = 'nigeria'
): Promise<AppNotification> {
  let title = `📦 Order ${orderNumber} Status: ${status.toUpperCase()}`;
  let message = `Your consignment ${orderNumber} status has been updated to ${status}.`;

  const destPort = country === 'cameroon' ? 'Douala Port' : 'Lagos Apapa Port';

  if (status === 'shipped') {
    title = `🚢 Order ${orderNumber} Shipped & In Transit`;
    message = `Consignment ${orderNumber} has departed port aboard ${carrier || 'Maritime Vessel'}${trackingNumber ? ` (Waybill: ${trackingNumber})` : ''} en route to ${destPort}.`;
  } else if (status === 'customs_cleared') {
    title = `🛡️ Customs Clearance Completed`;
    message = `Consignment ${orderNumber} has successfully cleared destination customs at ${destPort}.`;
  } else if (status === 'delivered') {
    title = `✅ Order Delivered Successfully`;
    message = `Consignment ${orderNumber} has arrived at the destination warehouse and is ready for pickup/delivery.`;
  } else if (status === 'processing') {
    title = `⚙️ Order Packing & Processing`;
    message = `Consignment ${orderNumber} is being packed and palletized at our Shenzhen export fulfillment hub.`;
  } else if (status === 'cancelled') {
    title = `⚠️ Order ${orderNumber} Cancelled`;
    message = `Consignment ${orderNumber} has been marked as cancelled by operations desk.`;
  }

  return sendAppNotification({
    userId,
    recipientRole: 'customer',
    type: status === 'customs_cleared' ? 'customs_update' : 'order_status',
    title,
    message,
    referenceId: orderNumber,
    targetView: 'orders',
    status,
    country
  });
}

/**
 * Dispatch real notification when a new order is submitted (for Admin & Customer)
 */
export async function sendNewOrderPlacedNotifications(
  orderNumber: string,
  customerName: string,
  total: number,
  customerId: string,
  country: 'nigeria' | 'cameroon' = 'nigeria'
): Promise<{ customerNotif: AppNotification; adminNotif: AppNotification }> {
  const formattedTotal = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  
  // 1. Customer confirmation notification
  const customerNotif = await sendAppNotification({
    userId: customerId,
    recipientRole: 'customer',
    type: 'order_status',
    title: `🎉 Order Confirmed: ${orderNumber}`,
    message: `Your wholesale order of ${formattedTotal} has been submitted. Our export operations team is preparing commercial invoice and packing slips.`,
    referenceId: orderNumber,
    targetView: 'orders',
    status: 'pending',
    country
  });

  // 2. Admin operations alert notification
  const adminNotif = await sendAppNotification({
    userId: 'all_admins',
    recipientRole: 'admin',
    type: 'new_order',
    title: `🛍️ New Order Received: ${orderNumber}`,
    message: `${customerName || 'Customer'} placed a wholesale PO of ${formattedTotal} for ${country === 'cameroon' ? 'Cameroon' : 'Nigeria'}.`,
    referenceId: orderNumber,
    targetView: 'admin',
    country
  });

  return { customerNotif, adminNotif };
}

/**
 * Dispatch real notification when customer RFQ is submitted
 */
export async function sendRFQSubmissionNotifications(
  refNumber: string,
  companyName: string,
  category: string,
  destination: string,
  customerId?: string
): Promise<{ customerNotif?: AppNotification; adminNotif: AppNotification }> {
  let customerNotif: AppNotification | undefined;

  if (customerId) {
    customerNotif = await sendAppNotification({
      userId: customerId,
      recipientRole: 'customer',
      type: 'rfq_submission',
      title: `📋 Sourcing RFQ Submitted: ${refNumber}`,
      message: `Your custom quotation request for ${category} (${destination}) has been routed to our China manufacturing desk.`,
      referenceId: refNumber,
      targetView: 'rfq'
    });
  }

  const adminNotif = await sendAppNotification({
    userId: 'all_admins',
    recipientRole: 'admin',
    type: 'rfq_submission',
    title: `📋 New Bulk RFQ: ${refNumber}`,
    message: `${companyName || 'Enterprise Buyer'} requested quotation for ${category} destined for ${destination}.`,
    referenceId: refNumber,
    targetView: 'rfq'
  });

  return { customerNotif, adminNotif };
}

/**
 * Dispatch real notification when customer support / operations desk responds
 */
export async function sendSupportReplyNotification(
  customerId: string,
  senderName: string,
  messagePreview: string
): Promise<AppNotification> {
  return sendAppNotification({
    userId: customerId,
    recipientRole: 'customer',
    type: 'new_message',
    title: `💬 Support Response from ${senderName || 'Operations Desk'}`,
    message: messagePreview.length > 95 ? `${messagePreview.substring(0, 92)}...` : messagePreview,
    referenceId: customerId,
    targetView: 'profile'
  });
}

/**
 * Dispatch notification when a user is promoted to Administrator
 */
export async function sendAdminRoleGrantedNotification(
  targetUserId: string,
  targetUserName?: string,
  grantedByName?: string
): Promise<AppNotification> {
  playNotificationSound();
  return sendAppNotification({
    userId: targetUserId,
    recipientRole: 'admin',
    type: 'system',
    title: '🛡️ Administrator Permissions Granted',
    message: `Congratulations${targetUserName ? ` ${targetUserName}` : ''}! Your account has been upgraded to Administrator${grantedByName ? ` by ${grantedByName}` : ' by Eagle Excel Operations'}. You now have full access to backend operations, catalog management, inventory control, and customer orders.`,
    targetView: 'admin',
    isImportant: true,
    importance: 'critical',
    priority: 'urgent'
  });
}

/**
 * Dispatch notification when an administrator role is reverted to Wholesale Buyer
 */
export async function sendAdminRoleRevokedNotification(
  targetUserId: string,
  targetUserName?: string,
  revokedByName?: string
): Promise<AppNotification> {
  return sendAppNotification({
    userId: targetUserId,
    recipientRole: 'customer',
    type: 'system',
    title: '🏢 Account Role Updated to Buyer',
    message: `Your account role has been updated to Wholesale Buyer${revokedByName ? ` by ${revokedByName}` : ''}. Your view is now configured for wholesale orders, pro-forma invoicing, and quotations.`,
    targetView: 'orders',
    isImportant: true,
    importance: 'normal',
    priority: 'normal'
  });
}

/**
 * Profile updated events are handled directly in UI forms, not spamming persistent inbox
 */
export async function sendProfileUpdatedNotification(userId: string): Promise<AppNotification> {
  return {
    id: `notif_profile_${userId}`,
    userId,
    recipientRole: 'all',
    type: 'system',
    title: 'Profile Updated',
    message: 'Your profile has been saved.',
    timestamp: new Date().toISOString(),
    read: true,
    isImportant: false,
    importance: 'low'
  };
}
