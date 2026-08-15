/**
 * Persistent Message Pop-Up & Alert Tracker
 * Guarantees that when a message is received, a pop-up notification (toast,
 * browser desktop notification, or audio alert) is dispatched STRICTLY ONCE
 * and NEVER MORE THAN ONE TIME, regardless of whether the message is opened or left unread.
 */

const STORAGE_KEY = 'ee_dispatched_message_popups_v1';
const NOTIF_ALERT_STORAGE_KEY = 'ee_dispatched_notif_alerts_v1';
const MAX_TRACKED_ENTRIES = 2000;

// In-memory cache for instant synchronous lookups
const inMemoryDispatchedMessageIds = new Set<string>();
const inMemoryDispatchedNotifAlertIds = new Set<string>();

let isInitialized = false;
let broadcastChannel: BroadcastChannel | null = null;

// Initialize cache from localStorage
function initTracker(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  try {
    const rawMessages = localStorage.getItem(STORAGE_KEY);
    if (rawMessages) {
      const parsed: string[] = JSON.parse(rawMessages);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          if (typeof id === 'string' && id.trim()) {
            inMemoryDispatchedMessageIds.add(id);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load dispatched message popups from storage', err);
  }

  try {
    const rawNotifs = localStorage.getItem(NOTIF_ALERT_STORAGE_KEY);
    if (rawNotifs) {
      const parsed: string[] = JSON.parse(rawNotifs);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          if (typeof id === 'string' && id.trim()) {
            inMemoryDispatchedNotifAlertIds.add(id);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load dispatched notification alerts from storage', err);
  }

  // Cross-tab broadcast synchronization
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('ee_message_popup_tracker_bc');
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'MSG_POPUP_DISPATCHED' && event.data.messageId) {
          inMemoryDispatchedMessageIds.add(event.data.messageId);
        } else if (event.data?.type === 'NOTIF_ALERT_DISPATCHED' && event.data.notifId) {
          inMemoryDispatchedNotifAlertIds.add(event.data.notifId);
        } else if (event.data?.type === 'BATCH_MSG_SEEDED' && Array.isArray(event.data.messageIds)) {
          event.data.messageIds.forEach((id: string) => inMemoryDispatchedMessageIds.add(id));
        }
      };
    }
  } catch {}

  // Storage event fallback for cross-tab sync
  try {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const ids: string[] = JSON.parse(e.newValue);
          if (Array.isArray(ids)) {
            ids.forEach(id => inMemoryDispatchedMessageIds.add(id));
          }
        } catch {}
      } else if (e.key === NOTIF_ALERT_STORAGE_KEY && e.newValue) {
        try {
          const ids: string[] = JSON.parse(e.newValue);
          if (Array.isArray(ids)) {
            ids.forEach(id => inMemoryDispatchedNotifAlertIds.add(id));
          }
        } catch {}
      }
    });
  } catch {}
}

// Persist current memory set to localStorage (capped at MAX_TRACKED_ENTRIES)
function persistMessageIds(): void {
  if (typeof window === 'undefined') return;
  try {
    const list = Array.from(inMemoryDispatchedMessageIds).slice(-MAX_TRACKED_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to persist message popup tracker to localStorage', e);
  }
}

function persistNotifAlertIds(): void {
  if (typeof window === 'undefined') return;
  try {
    const list = Array.from(inMemoryDispatchedNotifAlertIds).slice(-MAX_TRACKED_ENTRIES);
    localStorage.setItem(NOTIF_ALERT_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to persist notif alert tracker to localStorage', e);
  }
}

/**
 * Check whether a message has already had its pop-up notification dispatched.
 */
export function hasMessagePopupBeenDispatched(messageId: string): boolean {
  if (!messageId) return false;
  initTracker();
  return inMemoryDispatchedMessageIds.has(messageId);
}

/**
 * Mark a message as having had its pop-up notification dispatched.
 * Returns true if this was the first time marking it (meaning popup should proceed),
 * or false if it was already marked before.
 */
export function markMessagePopupAsDispatched(messageId: string): boolean {
  if (!messageId) return false;
  initTracker();

  if (inMemoryDispatchedMessageIds.has(messageId)) {
    return false; // Already dispatched before
  }

  inMemoryDispatchedMessageIds.add(messageId);
  persistMessageIds();

  // Notify other tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'MSG_POPUP_DISPATCHED', messageId });
    } catch {}
  }

  return true;
}

/**
 * Atomically checks if a popup has been dispatched for this message ID.
 * If not, marks it as dispatched and executes `popupCallback` strictly ONCE.
 * Returns true if callback was executed, false if suppressed.
 */
export function dispatchMessagePopupOnce(
  messageId: string,
  popupCallback: () => void
): boolean {
  if (!messageId) return false;
  initTracker();

  if (inMemoryDispatchedMessageIds.has(messageId)) {
    return false; // Suppress duplicate popup
  }

  // Atomically mark before executing callback to prevent race conditions
  inMemoryDispatchedMessageIds.add(messageId);
  persistMessageIds();

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'MSG_POPUP_DISPATCHED', messageId });
    } catch {}
  }

  try {
    popupCallback();
    return true;
  } catch (err) {
    console.error('Error executing message popup callback', err);
    return false;
  }
}

/**
 * Seeds a list of message IDs as already loaded/known.
 * Useful on initial thread load so that existing messages in the database
 * (even unread ones) do not trigger spurious popups on page open.
 */
export function seedInitialLoadedMessageIds(messageIds: string[]): void {
  if (!messageIds || messageIds.length === 0) return;
  initTracker();

  let hasNew = false;
  messageIds.forEach(id => {
    if (id && !inMemoryDispatchedMessageIds.has(id)) {
      inMemoryDispatchedMessageIds.add(id);
      hasNew = true;
    }
  });

  if (hasNew) {
    persistMessageIds();
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'BATCH_MSG_SEEDED', messageIds });
      } catch {}
    }
  }
}

/**
 * Check whether a notification alert sound has already been played.
 */
export function hasNotificationAlertBeenPlayed(notifId: string): boolean {
  if (!notifId) return false;
  initTracker();
  return inMemoryDispatchedNotifAlertIds.has(notifId);
}

/**
 * Mark a notification alert sound as played.
 * Returns true if this was the first time, false if already played.
 */
export function markNotificationAlertAsPlayed(notifId: string): boolean {
  if (!notifId) return false;
  initTracker();

  if (inMemoryDispatchedNotifAlertIds.has(notifId)) {
    return false;
  }

  inMemoryDispatchedNotifAlertIds.add(notifId);
  persistNotifAlertIds();

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'NOTIF_ALERT_DISPATCHED', notifId });
    } catch {}
  }

  return true;
}
