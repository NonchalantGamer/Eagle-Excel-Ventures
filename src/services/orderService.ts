import { getSupabase, isSupabaseEnabled, OperationType, handleSupabaseError } from '../lib/supabase';
import { Order, OrderStatus } from '../types';

const ORDERS_TABLE = 'orders';

// Helper to sanitize order payload for Supabase schema (removing non-existent columns)
function mapOrderToSupabaseRow(order: Partial<Order>): Record<string, any> {
  const row: Record<string, any> = { ...order };
  delete row.transactionFee;
  delete row.vatFee;
  return row;
}

// Place a new Wholesale Purchase Order
export async function createOrderInDatabase(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<Order> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `EE-${dateStr}-${randomSuffix}`;
  const newId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const order: Order = {
    ...orderData,
    id: newId,
    orderNumber,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  // 1. Save to local storage cache
  try {
    const localOrders: Order[] = JSON.parse(localStorage.getItem('ee_cached_orders') || '[]');
    const updated = [order, ...localOrders.filter(o => o.id !== newId)];
    localStorage.setItem('ee_cached_orders', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eagle_orders_updated', { detail: updated }));
    }
  } catch {}

  // 2. Post to server API
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (res.ok) {
      const serverOrder = await res.json();
      return serverOrder || order;
    }
  } catch (err) {
    console.warn('Server create order sync warning:', err);
  }

  // 3. Fallback to Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(ORDERS_TABLE).insert(mapOrderToSupabaseRow(order));
      } catch {}
    }
  }

  return order;
}

// Retrieve orders for a specific customer
export async function getCustomerOrders(userId: string): Promise<Order[]> {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const serverOrders: Order[] = await res.json();
      if (Array.isArray(serverOrders)) {
        const filtered = serverOrders.filter(o => o.userId === userId);
        try {
          localStorage.setItem('ee_cached_orders', JSON.stringify(serverOrders));
        } catch {}
        return filtered;
      }
    }
  } catch {}

  const localOrders: Order[] = JSON.parse(localStorage.getItem('ee_cached_orders') || '[]');
  const filteredLocal = localOrders.filter(o => o.userId === userId);

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from(ORDERS_TABLE)
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false });
        
        if (!error && data && data.length > 0) {
          return data as Order[];
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.READ, ORDERS_TABLE);
      }
    }
  }

  return filteredLocal;
}

// Retrieve all orders for Admin
export async function getAllOrders(): Promise<Order[]> {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const serverOrders: Order[] = await res.json();
      if (Array.isArray(serverOrders)) {
        try {
          localStorage.setItem('ee_cached_orders', JSON.stringify(serverOrders));
        } catch {}
        return serverOrders;
      }
    }
  } catch {}

  const localOrders: Order[] = JSON.parse(localStorage.getItem('ee_cached_orders') || '[]');

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from(ORDERS_TABLE)
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (!error && data && data.length > 0) {
          return data as Order[];
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.READ, ORDERS_TABLE);
      }
    }
  }

  return localOrders;
}

// Update Order Status & Shipping Tracking
export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  trackingNumber?: string, 
  carrier?: string
): Promise<void> {
  const updates: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString()
  };

  if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
  if (carrier !== undefined) updates.carrier = carrier;

  // Update in local cache
  try {
    const localOrders: Order[] = JSON.parse(localStorage.getItem('ee_cached_orders') || '[]');
    const updated = localOrders.map(o => o.id === orderId ? { ...o, ...updates } : o);
    localStorage.setItem('ee_cached_orders', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eagle_orders_updated', { detail: updated }));
    }
  } catch {}

  // Update on server API
  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } catch (err) {
    console.warn('Server update order status warning:', err);
  }

  // Backup to Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(ORDERS_TABLE).update(mapOrderToSupabaseRow(updates)).eq('id', orderId);
      } catch {}
    }
  }
}

export function getLocalCachedOrders(userId?: string | null, isAdmin?: boolean): Order[] {
  try {
    const raw = localStorage.getItem('ee_cached_orders');
    if (raw) {
      const parsed: Order[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (isAdmin) return parsed;
        if (userId) return parsed.filter(o => o.userId === userId);
      }
    }
  } catch (e) {
    // Ignore
  }
  return [];
}

// Cancel an unpaid Order
export async function cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get current orders to verify paymentStatus
    const localOrders: Order[] = JSON.parse(localStorage.getItem('ee_cached_orders') || '[]');
    const targetOrder = localOrders.find(o => o.id === orderId);

    if (targetOrder && targetOrder.paymentStatus === 'paid') {
      return { success: false, error: 'Cannot cancel an order for which payment has already been verified and completed.' };
    }

    if (targetOrder && targetOrder.status === 'cancelled') {
      return { success: true };
    }

    const updates: Record<string, any> = {
      status: 'cancelled',
      cancellationReason: reason || 'Cancelled by buyer before payment completion',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update in local cache
    const updated = localOrders.map(o => o.id === orderId ? { ...o, ...updates } : o);
    localStorage.setItem('ee_cached_orders', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eagle_orders_updated', { detail: updated }));
    }

    // Update on server API
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    // Backup to Supabase
    if (isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.from(ORDERS_TABLE).update(mapOrderToSupabaseRow(updates)).eq('id', orderId);
        } catch {}
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to cancel order' };
  }
}

// Delete a cancelled or failed order to keep transaction history clean
export async function deleteOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update in local cache
    const localOrders: Order[] = JSON.parse(localStorage.getItem('ee_cached_orders') || '[]');
    const updated = localOrders.filter(o => o.id !== orderId && o.orderNumber !== orderId);
    localStorage.setItem('ee_cached_orders', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eagle_orders_updated', { detail: updated }));
    }

    // 2. Delete from server API
    try {
      await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Server delete order error:', err);
    }

    // 3. Delete from Supabase if enabled
    if (isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.from(ORDERS_TABLE).delete().or(`id.eq.${orderId},orderNumber.eq.${orderId}`);
        } catch {}
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete order' };
  }
}

// Real-time listener for Orders with instant cache dispatch
export function subscribeToOrders(
  userId: string | null, 
  isAdmin: boolean, 
  onData: (orders: Order[]) => void
): () => void {
  // Immediately dispatch cached local orders for 0ms loading time
  const initialCache = getLocalCachedOrders(userId, isAdmin);
  if (initialCache.length > 0) {
    onData(initialCache);
  }

  // Fetch latest from database / server
  if (isAdmin) {
    getAllOrders().then(orders => onData(orders)).catch(() => {});
  } else if (userId) {
    getCustomerOrders(userId).then(orders => onData(orders)).catch(() => {});
  }

  // Window event listener for instant local sync
  const handleLocalOrdersUpdate = (e: CustomEvent<Order[]>) => {
    if (e.detail && Array.isArray(e.detail)) {
      if (isAdmin) {
        onData(e.detail);
      } else if (userId) {
        onData(e.detail.filter(o => o.userId === userId));
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('eagle_orders_updated', handleLocalOrdersUpdate as EventListener);
  }

  // Supabase real-time channel fallback
  let supabaseChannel: any = null;
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        supabaseChannel = supabase
          .channel('public:orders:sub')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: ORDERS_TABLE },
            () => {
              if (isAdmin) {
                getAllOrders().then(orders => onData(orders));
              } else if (userId) {
                getCustomerOrders(userId).then(orders => onData(orders));
              }
            }
          )
          .subscribe();
      } catch (error) {
        console.warn('Real-time order subscription fallback:', error);
      }
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('eagle_orders_updated', handleLocalOrdersUpdate as EventListener);
    }
    if (supabaseChannel && isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        try { supabase.removeChannel(supabaseChannel); } catch {}
      }
    }
  };
}

// Backwards-compatible aliases for legacy integrations
export const createOrderInFirestore = createOrderInDatabase;
export const updateOrderStatusInFirestore = updateOrderStatus;
export const getAllOrdersFromFirestore = getAllOrders;
export const getCustomerOrdersFromFirestore = getCustomerOrders;
export const subscribeToOrdersFirestore = subscribeToOrders;
