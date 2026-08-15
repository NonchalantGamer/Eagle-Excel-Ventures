import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getQueuedOfflineActions, 
  queueOfflineAction, 
  syncOfflineActions,
  clearOfflineActions 
} from '../services/offlineSyncService';
import { OfflinePendingAction } from '../types';

interface OfflineContextType {
  isOnline: boolean;
  isOffline: boolean;
  pendingActions: OfflinePendingAction[];
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  queueAction: (type: OfflinePendingAction['type'], payload: any) => OfflinePendingAction;
  dismissBanner: () => void;
  isBannerVisible: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingActions, setPendingActions] = useState<OfflinePendingAction[]>(getQueuedOfflineActions());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(false);
  const [lastOnlineChange, setLastOnlineChange] = useState<number>(Date.now());

  const refreshQueue = () => {
    setPendingActions(getQueuedOfflineActions());
  };

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsBannerVisible(true);
      setLastOnlineChange(Date.now());
      
      // Auto-sync queued offline actions
      setIsSyncing(true);
      try {
        await syncOfflineActions(() => {
          refreshQueue();
        });
      } finally {
        setIsSyncing(false);
        refreshQueue();
      }

      // Hide the online banner after 5 seconds
      setTimeout(() => {
        setIsBannerVisible(false);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsBannerVisible(true);
      setLastOnlineChange(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setIsBannerVisible(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await syncOfflineActions();
      refreshQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const queueAction = (type: OfflinePendingAction['type'], payload: any) => {
    const action = queueOfflineAction(type, payload);
    refreshQueue();
    return action;
  };

  const dismissBanner = () => {
    setIsBannerVisible(false);
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isOffline: !isOnline,
        pendingActions,
        pendingCount: pendingActions.length,
        isSyncing,
        syncNow,
        queueAction,
        dismissBanner,
        isBannerVisible
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
