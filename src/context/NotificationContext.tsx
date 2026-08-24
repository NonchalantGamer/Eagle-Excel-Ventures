import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  AppNotification, 
  UserRole, 
  OrderStatus, 
  PageView,
  BroadcastCampaign
} from '../types';
import { 
  subscribeToNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  markMessageNotificationsAsRead,
  deleteNotificationById, 
  clearAllLocalNotifications, 
  sendAppNotification,
  sendOrderStatusNotification,
  sendNewOrderPlacedNotifications,
  sendRFQSubmissionNotifications,
  sendSupportReplyNotification,
  playNotificationSound,
  isImportantNotification,
  INITIAL_SEED_NOTIFICATIONS
} from '../services/notificationService';
import { 
  getBrowserNotificationPermission,
  getBrowserNotificationPreference,
  setBrowserNotificationPreference,
  requestBrowserNotificationPermission,
  sendBrowserNativeNotification,
  pushBrowserOrderStatusNotification,
  BrowserNotificationStatus
} from '../utils/browserNotifications';
import { sendBroadcastCampaign } from '../services/broadcastService';
import { useAuth } from './AuthContext';
import { 
  hasNotificationAlertBeenPlayed, 
  markNotificationAlertAsPlayed 
} from '../utils/messagePopupTracker';

interface NotificationContextType {
  notifications: AppNotification[];
  importantNotifications: AppNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  importantOnly: boolean;
  setImportantOnly: (enabled: boolean) => void;
  browserPermission: BrowserNotificationStatus;
  browserNotificationsEnabled: boolean;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
  requestBrowserPermission: () => Promise<BrowserNotificationStatus>;
  pushNativeNotification: (title: string, options?: { body?: string; tag?: string; onClick?: () => void }) => boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markThreadNotificationsAsRead: (customerId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => void;
  notifyCustomerOrderStatus: (orderNumber: string, status: OrderStatus, trackingNumber?: string, country?: 'nigeria' | 'cameroon') => Promise<void>;
  notifyAdminNewOrder: (orderNumber: string, customerName: string, total: number, country?: 'nigeria' | 'cameroon') => Promise<void>;
  notifyAdminNewRFQ: (refNumber: string, companyName: string, category: string, destination: string) => Promise<void>;
  notifyAdminNewMessage: (senderName: string, messagePreview: string) => Promise<void>;
  notifySupportResponse: (senderName: string, messagePreview: string) => Promise<void>;
  notifyProfileUpdated: () => Promise<void>;
  sendBroadcastToCustomers: (campaignData: Omit<BroadcastCampaign, 'id' | 'sentAt' | 'active'>) => Promise<BroadcastCampaign>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, role, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ee_notif_sound_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Default to Important Only mode = true to avoid spamming the user
  const [importantOnly, setImportantOnly] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ee_notif_important_only');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Native Browser Notification permission & user preference
  const [browserPermission, setBrowserPermission] = useState<BrowserNotificationStatus>(() => getBrowserNotificationPermission());
  const [browserNotificationsEnabled, setBrowserNotificationsEnabledState] = useState<boolean>(() => getBrowserNotificationPreference());

  useEffect(() => {
    // Refresh permission state on mount and window focus
    const updatePerm = () => {
      setBrowserPermission(getBrowserNotificationPermission());
    };
    updatePerm();
    window.addEventListener('focus', updatePerm);
    return () => window.removeEventListener('focus', updatePerm);
  }, []);

  const setBrowserNotificationsEnabled = useCallback((enabled: boolean) => {
    setBrowserNotificationPreference(enabled);
    setBrowserNotificationsEnabledState(enabled);
    if (enabled && browserPermission === 'default') {
      requestBrowserNotificationPermission().then(setBrowserPermission);
    }
  }, [browserPermission]);

  const requestBrowserPermission = useCallback(async (): Promise<BrowserNotificationStatus> => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      setBrowserNotificationsEnabledState(true);
      setBrowserNotificationPreference(true);
    }
    return perm;
  }, []);

  const pushNativeNotification = useCallback((title: string, options?: { body?: string; tag?: string; onClick?: () => void }): boolean => {
    if (!browserNotificationsEnabled || browserPermission !== 'granted') {
      return false;
    }
    return sendBrowserNativeNotification({
      title,
      body: options?.body || '',
      tag: options?.tag,
      onClick: options?.onClick
    });
  }, [browserNotificationsEnabled, browserPermission]);

  useEffect(() => {
    try {
      localStorage.setItem('ee_notif_sound_enabled', JSON.stringify(soundEnabled));
    } catch (e) {
      console.warn('Failed to save sound preference', e);
    }
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('ee_notif_important_only', JSON.stringify(importantOnly));
    } catch (e) {
      console.warn('Failed to save important-only preference', e);
    }
  }, [importantOnly]);

  // Subscribe to real-time notification updates based on active authenticated user
  useEffect(() => {
    // When signed out, ensure no messages or notification badges remain active
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const activeRole: UserRole = isAdmin ? 'admin' : 'customer';
    const userId = currentUser.uid;
    let isInitialLoad = true;

    const unsubscribe = subscribeToNotifications(activeRole, userId, (notifs) => {
      if (isInitialLoad) {
        notifs.forEach(n => markNotificationAlertAsPlayed(n.id));
        isInitialLoad = false;
        setNotifications(notifs);
        return;
      }

      // Check if newly arrived notification is for the current active user and hasn't alerted yet
      let hasNewImportant = false;
      for (const n of notifs) {
        if (!hasNotificationAlertBeenPlayed(n.id)) {
          markNotificationAlertAsPlayed(n.id);
          // Only play global notif chime for non-chat notifications to prevent double-chime with chat watcher
          if (!n.read && isImportantNotification(n) && n.type !== 'new_message') {
            hasNewImportant = true;
          }

          // Push browser-native notification when an order status or freight update arrives
          if (!n.read && (n.type === 'order_status' || n.type === 'customs_update')) {
            if (browserNotificationsEnabled && (browserPermission === 'granted' || (typeof Notification !== 'undefined' && Notification.permission === 'granted'))) {
              pushBrowserOrderStatusNotification({
                orderNumber: n.referenceId || 'Consignment',
                newStatus: (n.status as OrderStatus) || 'shipped',
                country: n.country,
                onClick: () => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ee_navigate_to_view', { detail: { view: 'orders', orderId: n.referenceId } }));
                  }
                }
              });
            }
          }
        }
      }

      setNotifications(notifs);

      // Play chime strictly once for incoming important notification on recipient device
      if (hasNewImportant && soundEnabled) {
        playNotificationSound();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, isAdmin, role, soundEnabled, browserNotificationsEnabled, browserPermission]);

  const importantNotifications = currentUser ? notifications.filter(isImportantNotification) : [];

  // Unread count is strictly 0 if user is signed out
  const unreadCount = !currentUser
    ? 0
    : (importantOnly ? importantNotifications : notifications).filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const activeRole: UserRole = isAdmin ? 'admin' : 'customer';
    await markAllNotificationsAsRead(activeRole, currentUser?.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markThreadNotificationsAsRead = async (customerId: string) => {
    if (!customerId) return;
    const activeRole: UserRole = isAdmin ? 'admin' : 'customer';
    await markMessageNotificationsAsRead(customerId, activeRole);
    setNotifications(prev => prev.map(n => {
      if ((n.type === 'new_message' || n.targetView === 'support' || n.targetView === 'admin') && 
          (n.referenceId === customerId || n.userId === customerId)) {
        return { ...n, read: true };
      }
      return n;
    }));
  };

  const deleteNotification = async (id: string) => {
    await deleteNotificationById(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    clearAllLocalNotifications();
    setNotifications([]);
  };

  // Helper trigger: Alert customer when order status changes (Shipped, Delivered, Processing, Customs)
  const notifyCustomerOrderStatus = async (
    orderNumber: string, 
    status: OrderStatus, 
    trackingNumber?: string,
    country: 'nigeria' | 'cameroon' = 'nigeria'
  ) => {
    const userId = currentUser?.uid || 'customer';
    const created = await sendOrderStatusNotification(
      orderNumber,
      status,
      userId,
      trackingNumber,
      undefined,
      country
    );

    // Push browser-native notification
    if (browserNotificationsEnabled && (browserPermission === 'granted' || (typeof Notification !== 'undefined' && Notification.permission === 'granted'))) {
      pushBrowserOrderStatusNotification({
        orderNumber,
        newStatus: status,
        trackingNumber,
        country,
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ee_navigate_to_view', { detail: { view: 'orders', orderId: orderNumber } }));
          }
        }
      });
    }

    // Only update local state if active user is customer recipient
    if (!isAdmin) {
      setNotifications(prev => [created, ...prev.filter(n => n.id !== created.id)]);
      if (soundEnabled && isImportantNotification(created)) {
        playNotificationSound();
      }
    }
  };

  // Helper trigger: Alert admin on new wholesale purchase orders
  const notifyAdminNewOrder = async (
    orderNumber: string, 
    customerName: string, 
    total: number,
    country: 'nigeria' | 'cameroon' = 'nigeria'
  ) => {
    const customerId = currentUser?.uid || 'customer';
    const { adminNotif, customerNotif } = await sendNewOrderPlacedNotifications(
      orderNumber,
      customerName,
      total,
      customerId,
      country
    );

    const relevant = isAdmin ? adminNotif : customerNotif;
    setNotifications(prev => [relevant, ...prev.filter(n => n.id !== relevant.id)]);
    if (soundEnabled && isImportantNotification(relevant)) {
      playNotificationSound();
    }

    // Push native browser notification for new order placed
    if (browserNotificationsEnabled && (browserPermission === 'granted' || (typeof Notification !== 'undefined' && Notification.permission === 'granted'))) {
      if (isAdmin) {
        sendBrowserNativeNotification({
          title: `🛍️ New Order Received: #${orderNumber}`,
          body: `${customerName || 'Customer'} submitted a wholesale PO ($${total.toLocaleString()}).`,
          tag: `order-new-${orderNumber}`,
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ee_navigate_to_view', { detail: { view: 'admin' } }));
            }
          }
        });
      } else {
        pushBrowserOrderStatusNotification({
          orderNumber,
          newStatus: 'pending',
          total,
          country,
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ee_navigate_to_view', { detail: { view: 'orders', orderId: orderNumber } }));
            }
          }
        });
      }
    }
  };

  // Helper trigger: Alert admin on new RFQ submissions
  const notifyAdminNewRFQ = async (
    refNumber: string, 
    companyName: string, 
    category: string, 
    destination: string
  ) => {
    const customerId = currentUser?.uid;
    const { adminNotif, customerNotif } = await sendRFQSubmissionNotifications(
      refNumber,
      companyName,
      category,
      destination,
      customerId
    );

    const relevant = (isAdmin ? adminNotif : customerNotif) || adminNotif;
    setNotifications(prev => [relevant, ...prev.filter(n => n.id !== relevant.id)]);
    if (soundEnabled && isImportantNotification(relevant)) {
      playNotificationSound();
    }
  };

  // Helper trigger: Alert admin on customer message
  const notifyAdminNewMessage = async (
    senderName: string, 
    messagePreview: string
  ) => {
    const created = await sendAppNotification({
      userId: 'all_admins',
      recipientRole: 'admin',
      type: 'new_message',
      title: `💬 New Inquiry from ${senderName}`,
      message: messagePreview.length > 80 ? messagePreview.substring(0, 80) + '...' : messagePreview,
      targetView: 'admin',
      importance: 'high',
      isImportant: true
    });

    // Only update admin recipient local state
    if (isAdmin) {
      setNotifications(prev => [created, ...prev.filter(n => n.id !== created.id)]);
      if (soundEnabled) {
        playNotificationSound();
      }
    }
  };

  // Helper trigger: Alert customer on support desk response
  const notifySupportResponse = async (
    senderName: string,
    messagePreview: string
  ) => {
    if (!currentUser?.uid) return;
    const created = await sendSupportReplyNotification(
      currentUser.uid,
      senderName,
      messagePreview
    );

    // Only update customer recipient local state
    if (!isAdmin) {
      setNotifications(prev => [created, ...prev.filter(n => n.id !== created.id)]);
      if (soundEnabled) {
        playNotificationSound();
      }
    }
  };

  // Helper trigger: Profile update notification (kept silent to avoid spam)
  const notifyProfileUpdated = async () => {
    // Suppressed from polluting user notification logs
    return Promise.resolve();
  };

  // Helper trigger: Dispatch broadcast campaign to wholesale customers
  const sendBroadcastToCustomers = async (
    campaignData: Omit<BroadcastCampaign, 'id' | 'sentAt' | 'active'>
  ): Promise<BroadcastCampaign> => {
    const campaign = await sendBroadcastCampaign(campaignData);
    if (soundEnabled && campaign.priority === 'urgent') {
      playNotificationSound();
    }
    return campaign;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        importantNotifications,
        unreadCount,
        soundEnabled,
        setSoundEnabled,
        importantOnly,
        setImportantOnly,
        browserPermission,
        browserNotificationsEnabled,
        setBrowserNotificationsEnabled,
        requestBrowserPermission,
        pushNativeNotification,
        markAsRead,
        markAllAsRead,
        markThreadNotificationsAsRead,
        deleteNotification,
        clearAll,
        notifyCustomerOrderStatus,
        notifyAdminNewOrder,
        notifyAdminNewRFQ,
        notifyAdminNewMessage,
        notifySupportResponse,
        notifyProfileUpdated,
        sendBroadcastToCustomers
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
