import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import { subscribeToCustomerThread, getGuestOrActiveCustomerId, isStaffInternalNote } from '../../services/messageService';
import { playReceiveSound } from '../../utils/chatAudio';
import { showBrowserNotification } from '../../utils/browserNotification';
import { sendAppNotification } from '../../services/notificationService';
import { 
  hasMessagePopupBeenDispatched, 
  dispatchMessagePopupOnce, 
  seedInitialLoadedMessageIds 
} from '../../utils/messagePopupTracker';
import { PageView, Message } from '../../types';

interface CustomerMessageWatcherProps {
  isSupportOpen: boolean;
  onOpenSupport: () => void;
  currentView: PageView;
}

export const CustomerMessageWatcher: React.FC<CustomerMessageWatcherProps> = ({
  isSupportOpen,
  onOpenSupport,
  currentView
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialLoadedRef = useRef<boolean>(false);
  const isSupportOpenRef = useRef<boolean>(isSupportOpen);
  const currentViewRef = useRef<PageView>(currentView);
  const onOpenSupportRef = useRef<() => void>(onOpenSupport);

  useEffect(() => {
    isSupportOpenRef.current = isSupportOpen;
  }, [isSupportOpen]);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    onOpenSupportRef.current = onOpenSupport;
  }, [onOpenSupport]);

  // Determine active customer ID (authenticated customer or guest)
  const activeCustomerId = currentUser && !isAdmin
    ? (currentUser.uid || currentUser.id || getGuestOrActiveCustomerId(currentUser))
    : getGuestOrActiveCustomerId(currentUser);

  useEffect(() => {
    // If the active user is an admin viewing admin dashboard, CustomerMessageWatcher does not interfere (AdminDashboard handles admin side)
    if (isAdmin) return;
    if (!activeCustomerId) return;

    const unsubscribe = subscribeToCustomerThread(activeCustomerId, (msgs: Message[]) => {
      if (!initialLoadedRef.current) {
        // Initial snapshot load: Populate known IDs and persistent tracker without firing alerts
        for (const m of msgs) {
          knownMessageIdsRef.current.add(m.id);
        }
        seedInitialLoadedMessageIds(msgs.map(m => m.id));
        initialLoadedRef.current = true;

        // Calculate and broadcast initial unread count
        const unreadAdminMsgs = msgs.filter(m => m.senderRole === 'admin' && !m.readByCustomer && !isStaffInternalNote(m)).length;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ee_customer_unread_count', { detail: { count: unreadAdminMsgs } }));
        }
        return;
      }

      // Detect any incoming new messages
      const newAdminMessages: Message[] = [];
      for (const m of msgs) {
        const isAlreadyKnown = knownMessageIdsRef.current.has(m.id) || hasMessagePopupBeenDispatched(m.id);
        if (!isAlreadyKnown) {
          knownMessageIdsRef.current.add(m.id);
          if (m.senderRole === 'admin' && !isStaffInternalNote(m)) {
            newAdminMessages.push(m);
          }
        }
      }

      // Update unread count event
      const unreadAdminMsgs = msgs.filter(m => m.senderRole === 'admin' && !m.readByCustomer && !isStaffInternalNote(m)).length;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ee_customer_unread_count', { detail: { count: unreadAdminMsgs } }));
      }

      // If new admin messages arrived
      if (newAdminMessages.length > 0) {
        // Dispatch notifications to appear in the header notification bell icon once
        newAdminMessages.forEach(msg => {
          const previewText = msg.message.length > 90 ? `${msg.message.substring(0, 87)}...` : msg.message;
          sendAppNotification({
            userId: activeCustomerId,
            recipientRole: 'customer',
            type: 'new_message',
            title: `💬 Message from ${msg.senderName || 'Operations Desk'}`,
            message: previewText,
            referenceId: activeCustomerId,
            targetView: 'support',
            importance: 'high',
            isImportant: true,
            status: 'new'
          }).catch(() => {});
        });

        // Trigger pop up notification strictly once per message
        const isModalOpen = isSupportOpenRef.current;
        const isSupportView = currentViewRef.current === 'support';

        newAdminMessages.forEach(msg => {
          dispatchMessagePopupOnce(msg.id, () => {
            if (!isModalOpen && !isSupportView) {
              // 1. Play audio chime
              playReceiveSound();

              // 2. Display interactive in-app toast banner
              const preview = msg.message.length > 80
                ? `${msg.message.substring(0, 77)}...`
                : msg.message;

              showToast(`💬 Operations Desk: "${preview}"`, {
                type: 'info',
                duration: 7000,
                action: {
                  label: 'Open Chat',
                  onClick: () => {
                    onOpenSupportRef.current();
                  }
                }
              });

              // 3. Trigger native browser desktop notification if window is backgrounded or tab unfocused
              showBrowserNotification('💬 Eagle Excel Operations Desk', {
                body: `${msg.senderName || 'Operations Desk'}: ${msg.message}`,
                tag: `msg_${msg.id}`,
                onClick: () => {
                  onOpenSupportRef.current();
                }
              });
            }
          });
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeCustomerId, isAdmin, showToast]);

  return null;
};
