import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_SEED_NOTIFICATIONS);
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

  // Subscribe to real-time notification updates based on active role
  useEffect(() => {
    const activeRole: UserRole = isAdmin ? 'admin' : 'customer';
    const userId = currentUser?.uid || null;
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
  }, [currentUser, isAdmin, role, soundEnabled]);

  const importantNotifications = notifications.filter(isImportantNotification);

  // Unread count is filtered to important notifications if importantOnly is active
  const unreadCount = (importantOnly ? importantNotifications : notifications).filter(n => !n.read).length;

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
