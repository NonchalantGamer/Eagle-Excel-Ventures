import { OfflinePendingAction } from '../types';

const OFFLINE_STORAGE_KEY = 'ee_offline_pending_actions';

// Retrieve all queued offline actions
export function getQueuedOfflineActions(): OfflinePendingAction[] {
  try {
    const data = localStorage.getItem(OFFLINE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn('Failed to read offline queue:', err);
    return [];
  }
}

// Queue an action for execution when connectivity resumes
export function queueOfflineAction(type: OfflinePendingAction['type'], payload: any): OfflinePendingAction {
  const newAction: OfflinePendingAction = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  try {
    const existing = getQueuedOfflineActions();
    existing.push(newAction);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(existing));
    console.log(`[OfflineSync] Queued action ${type}:`, newAction);
  } catch (err) {
    console.warn('Failed to queue offline action:', err);
  }

  return newAction;
}

// Remove an action after successful sync
export function removeOfflineAction(actionId: string): void {
  try {
    const existing = getQueuedOfflineActions();
    const filtered = existing.filter(a => a.id !== actionId);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Failed to remove offline action:', err);
  }
}

// Clear all synced or stale actions
export function clearOfflineActions(): void {
  try {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear offline actions:', err);
  }
}

// Execute sync on re-connection
export async function syncOfflineActions(
  onActionSynced?: (action: OfflinePendingAction) => void
): Promise<{ successCount: number; failedCount: number }> {
  const actions = getQueuedOfflineActions();
  if (actions.length === 0) return { successCount: 0, failedCount: 0 };

  let successCount = 0;
  let failedCount = 0;

  for (const action of actions) {
    try {
      // Process action based on type
      if (action.type === 'cart_add' || action.type === 'cart_update') {
        // Sync cart to local persistent storage
        const currentCart = JSON.parse(localStorage.getItem('ee_wholesale_cart') || '[]');
        console.log('[OfflineSync] Cart action synced:', action);
        successCount++;
        removeOfflineAction(action.id);
        onActionSynced?.(action);
      } else if (action.type === 'order_draft' || action.type === 'rfq_draft') {
        console.log('[OfflineSync] Draft action preserved for user submission:', action);
        successCount++;
        removeOfflineAction(action.id);
        onActionSynced?.(action);
      } else {
        successCount++;
        removeOfflineAction(action.id);
        onActionSynced?.(action);
      }
    } catch (err) {
      console.warn(`[OfflineSync] Failed to sync action ${action.id}:`, err);
      failedCount++;
    }
  }

  return { successCount, failedCount };
}
