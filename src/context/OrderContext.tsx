import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Order, OrderStatus } from '../types';
import { subscribeToOrders, getLocalCachedOrders } from '../services/orderService';
import { useAuth } from './AuthContext';
import { useToast } from '../components/Toast';
import { pushBrowserOrderStatusNotification } from '../utils/browserNotifications';

interface AcknowledgedOrderMap {
  [orderId: string]: {
    status: OrderStatus;
    trackingNumber?: string;
    carrier?: string;
    updatedAt?: string;
  };
}

export interface LatestStatusChange {
  orderId: string;
  orderNumber: string;
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  updatedAt: string;
  isFreightShipment: boolean;
}

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  activeOrdersCount: number;
  inTransitCount: number;
  processingCount: number;
  pendingCount: number;
  deliveredCount: number;
  unviewedStatusChangesCount: number;
  hasUnviewedChanges: boolean;
  latestStatusChange: LatestStatusChange | null;
  markOrdersAsViewed: () => void;
  getOrderById: (id: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const ACKNOWLEDGED_STATUS_KEY = 'ee_order_acknowledged_status_v2';

function getStoredAcknowledgedMap(): AcknowledgedOrderMap {
  try {
    const raw = localStorage.getItem(ACKNOWLEDGED_STATUS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to read acknowledged orders map from storage:', e);
  }
  return {};
}

function saveAcknowledgedMap(map: AcknowledgedOrderMap) {
  try {
    localStorage.setItem(ACKNOWLEDGED_STATUS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save acknowledged orders map:', e);
  }
}

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>(() => {
    return getLocalCachedOrders(currentUser?.uid || null, isAdmin);
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [acknowledgedMap, setAcknowledgedMap] = useState<AcknowledgedOrderMap>(getStoredAcknowledgedMap);
  const [latestStatusChange, setLatestStatusChange] = useState<LatestStatusChange | null>(null);

  const prevOrdersRef = useRef<Order[]>([]);
  const isFirstMountRef = useRef<boolean>(true);

  // Subscribe to real-time orders listener
  useEffect(() => {
    const userId = currentUser?.uid || null;

    setIsLoading(true);
    const unsubscribe = subscribeToOrders(userId, isAdmin, (fetchedOrders) => {
      setOrders(fetchedOrders);
      setIsLoading(false);

      // Check for real-time status or freight changes across snapshots
      if (!isFirstMountRef.current && prevOrdersRef.current.length > 0) {
        for (const newOrder of fetchedOrders) {
          const prevOrder = prevOrdersRef.current.find(o => o.id === newOrder.id);
          
          if (prevOrder) {
            const statusChanged = prevOrder.status !== newOrder.status;
            const trackingChanged = prevOrder.trackingNumber !== newOrder.trackingNumber && !!newOrder.trackingNumber;
            const carrierChanged = prevOrder.carrier !== newOrder.carrier && !!newOrder.carrier;

            if (statusChanged || trackingChanged || carrierChanged) {
              const changeInfo: LatestStatusChange = {
                orderId: newOrder.id,
                orderNumber: newOrder.orderNumber,
                previousStatus: prevOrder.status,
                newStatus: newOrder.status,
                trackingNumber: newOrder.trackingNumber,
                carrier: newOrder.carrier,
                updatedAt: newOrder.updatedAt || new Date().toISOString(),
                isFreightShipment: newOrder.status === 'shipped' || !!newOrder.trackingNumber
              };

              setLatestStatusChange(changeInfo);

              // Push browser-native push notification
              pushBrowserOrderStatusNotification({
                orderNumber: newOrder.orderNumber,
                newStatus: newOrder.status,
                previousStatus: prevOrder.status,
                trackingNumber: newOrder.trackingNumber,
                carrier: newOrder.carrier,
                country: newOrder.shippingAddress?.country?.toLowerCase()?.includes('cameroon') ? 'cameroon' : 'nigeria',
                onClick: () => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ee_navigate_to_view', { detail: { view: 'orders', orderId: newOrder.orderNumber } }));
                  }
                }
              });

              // Live Toast Alert for freight shipment and order status changes
              if (newOrder.status === 'shipped') {
                showToast(
                  `🚚 Freight In Transit: Order ${newOrder.orderNumber} has departed! Carrier: ${newOrder.carrier || 'Freight Line'}${newOrder.trackingNumber ? ` (Tracking: ${newOrder.trackingNumber})` : ''}`,
                  'success'
                );
              } else if (newOrder.status === 'delivered') {
                showToast(
                  `✅ Consignment Delivered: Order ${newOrder.orderNumber} successfully received at destination facility.`,
                  'success'
                );
              } else if (newOrder.status === 'processing') {
                showToast(
                  `⚙️ Order Processing: Goods for ${newOrder.orderNumber} are packed for export.`,
                  'info'
                );
              }
            }
          }
        }
      }

      prevOrdersRef.current = fetchedOrders;
      isFirstMountRef.current = false;
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid, isAdmin, showToast]);

  // Compute unviewed/unacknowledged status changes
  const unviewedStatusChangesCount = orders.filter(order => {
    const ack = acknowledgedMap[order.id];
    if (!ack) {
      // If we haven't acknowledged this order at all and it is an active or completed order
      return true;
    }
    // Check if status or tracking number changed since last viewed
    if (ack.status !== order.status) return true;
    if (order.trackingNumber && ack.trackingNumber !== order.trackingNumber) return true;
    return false;
  }).length;

  const hasUnviewedChanges = unviewedStatusChangesCount > 0;

  // Active counts
  const activeOrdersCount = orders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered').length;
  const inTransitCount = orders.filter(o => o.status === 'shipped').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  // Mark all current order statuses as acknowledged/viewed
  const markOrdersAsViewed = useCallback(() => {
    const newMap: AcknowledgedOrderMap = { ...acknowledgedMap };
    orders.forEach(order => {
      newMap[order.id] = {
        status: order.status,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        updatedAt: order.updatedAt || new Date().toISOString()
      };
    });
    setAcknowledgedMap(newMap);
    saveAcknowledgedMap(newMap);
    setLatestStatusChange(null);
  }, [orders, acknowledgedMap]);

  const getOrderById = useCallback((id: string) => {
    return orders.find(o => o.id === id || o.orderNumber === id);
  }, [orders]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        isLoading,
        activeOrdersCount,
        inTransitCount,
        processingCount,
        pendingCount,
        deliveredCount,
        unviewedStatusChangesCount,
        hasUnviewedChanges,
        latestStatusChange,
        markOrdersAsViewed,
        getOrderById
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
