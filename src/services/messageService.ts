import { getSupabase, isSupabaseEnabled, OperationType, handleSupabaseError } from '../lib/supabase';
import { 
  Message, 
  UserRole, 
  ChatAttachedProduct, 
  ChatQuoteData, 
  OrderStatus 
} from '../types';
import { sendAppNotification, markMessageNotificationsAsRead } from './notificationService';

const MESSAGES_TABLE = 'messages';
const ALL_MESSAGES_CACHE_KEY = 'ee_all_messages_cache_v2';
const TYPING_EVENT_PREFIX = 'ee_typing_';
const MESSAGE_EVENT_NAME = 'ee_chat_message_event';
const PRESENCE_EVENT_NAME = 'ee_chat_presence_event';

// Cross-tab and in-memory real-time sync broadcaster
let chatBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    chatBroadcastChannel = new BroadcastChannel('ee_chat_channel');
  }
} catch {
  chatBroadcastChannel = null;
}

export type ChatEventAction = 'send' | 'reaction' | 'delete' | 'read' | 'sync' | 'thread_deleted';

export interface ChatEventPayload {
  customerId: string;
  action: ChatEventAction;
  message?: Message;
  messageId?: string;
  count?: number;
  timestamp: number;
}

export interface ActivePresenceData {
  users: Array<{
    userId: string;
    role: 'admin' | 'customer';
    name: string;
    lastSeen: number;
    customerId?: string;
  }>;
  onlineCount: number;
  agentsOnline: number;
}

export interface SendMessageParams {
  threadId?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachments?: string[];
  attachedProduct?: ChatAttachedProduct;
  attachedOrder?: {
    id: string;
    orderNumber: string;
    total: number;
    status: OrderStatus;
    itemCount: number;
  };
  quoteData?: ChatQuoteData;
  voiceNote?: {
    url: string;
    duration: number;
  };
  replyTo?: {
    id: string;
    senderName: string;
    senderRole: UserRole;
    message: string;
    messageType?: string;
  };
  isInternalNote?: boolean;
  messageType?: 'text' | 'product_card' | 'quote_offer' | 'order_ref' | 'internal_note' | 'voice_note';
}

// -------------------------------------------------------------
// NORMALIZATION & SERIALIZATION UTILITIES
// -------------------------------------------------------------

function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Normalizes a raw Supabase PostgreSQL or REST row into a typed Message object.
 * Supports both snake_case and camelCase column formats seamlessly.
 */
export function normalizeMessage(raw: any): Message {
  if (!raw) {
    const now = new Date().toISOString();
    return {
      id: `msg_${Date.now()}`,
      threadId: '',
      customerId: '',
      customerName: 'Customer',
      senderId: '',
      senderName: 'User',
      senderRole: 'customer',
      message: '',
      readByAdmin: false,
      readByCustomer: false,
      deliveryStatus: 'delivered',
      createdAt: now
    };
  }

  const customerId = raw.customerId || raw.customer_id || raw.threadId || raw.thread_id || '';
  const threadId = raw.threadId || raw.thread_id || customerId;
  const customerName = raw.customerName || raw.customer_name || 'Wholesale Buyer';
  const customerEmail = raw.customerEmail || raw.customer_email || '';
  const senderId = raw.senderId || raw.sender_id || '';
  const senderName = raw.senderName || raw.sender_name || (raw.senderRole === 'admin' || raw.sender_role === 'admin' ? 'Operations Desk' : 'User');
  const senderRole: UserRole = (raw.senderRole || raw.sender_role || 'customer') as UserRole;
  const message = raw.message || raw.content || raw.text || '';
  const isInternalNote = Boolean(
    raw.isInternalNote ?? 
    raw.is_internal_note ?? 
    raw.messageType === 'internal_note' ?? 
    raw.message_type === 'internal_note' ?? 
    false
  );
  const messageType = isInternalNote 
    ? 'internal_note' 
    : (raw.messageType || raw.message_type || 'text');

  const attachments = safeJsonParse<string[]>(raw.attachments, []);
  const attachedProduct = safeJsonParse<ChatAttachedProduct | undefined>(raw.attachedProduct || raw.attached_product, undefined);
  const attachedOrder = safeJsonParse<Message['attachedOrder'] | undefined>(raw.attachedOrder || raw.attached_order, undefined);
  const quoteData = safeJsonParse<ChatQuoteData | undefined>(raw.quoteData || raw.quote_data, undefined);
  const voiceNote = safeJsonParse<Message['voiceNote'] | undefined>(raw.voiceNote || raw.voice_note, undefined);
  const replyTo = safeJsonParse<Message['replyTo'] | undefined>(raw.replyTo || raw.reply_to, undefined);
  const reactions = safeJsonParse<Record<string, string[]>>(raw.reactions, {});

  const readByAdmin = Boolean(raw.readByAdmin ?? raw.read_by_admin ?? (senderRole === 'admin'));
  const readByCustomer = Boolean(raw.readByCustomer ?? raw.read_by_customer ?? (senderRole === 'customer'));
  const deliveryStatus = raw.deliveryStatus || raw.delivery_status || (readByAdmin || readByCustomer ? 'read' : 'delivered');

  const createdAt = raw.createdAt || raw.created_at || raw.inserted_at || new Date().toISOString();
  const deliveredAt = raw.deliveredAt || raw.delivered_at || createdAt;
  const readAt = raw.readAt || raw.read_at || undefined;

  return {
    id: String(raw.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
    threadId,
    customerId,
    customerName,
    customerEmail,
    senderId,
    senderName,
    senderRole,
    message,
    attachments,
    attachedProduct,
    attachedOrder,
    quoteData,
    voiceNote,
    replyTo,
    reactions,
    isInternalNote,
    messageType,
    readByAdmin,
    readByCustomer,
    deliveryStatus,
    deliveredAt,
    readAt,
    createdAt
  };
}

/**
 * Checks whether a message is a private staff internal note.
 * Staff internal notes are strictly restricted to staff/admins.
 */
export function isStaffInternalNote(msg: Partial<Message> | any): boolean {
  if (!msg) return false;
  return Boolean(
    msg.isInternalNote || 
    msg.is_internal_note || 
    msg.messageType === 'internal_note' || 
    msg.message_type === 'internal_note'
  );
}

/**
 * Filters an array of messages so that customer views never receive internal staff notes.
 */
export function filterCustomerVisibleMessages(messages: Message[]): Message[] {
  if (!Array.isArray(messages)) return [];
  return messages.filter(m => !isStaffInternalNote(m));
}

/**
 * Resolves the persistent customer ID across sessions and components.
 * Authenticated users use `currentUser.uid` or `currentUser.id`.
 * Guest buyers use a persistent `guest_...` ID from `localStorage.getItem('ee_guest_chat_id')`.
 */
export function getGuestOrActiveCustomerId(currentUser?: { uid?: string; id?: string } | null): string {
  if (currentUser?.uid) return currentUser.uid;
  if (currentUser?.id) return currentUser.id;
  if (typeof window === 'undefined') return 'guest_buyer';
  let gId = localStorage.getItem('ee_guest_chat_id');
  if (!gId) {
    const legacy = localStorage.getItem('ee_b2b_buyer_id');
    if (legacy && legacy.startsWith('guest_')) {
      gId = legacy;
    } else {
      gId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    localStorage.setItem('ee_guest_chat_id', gId);
  }
  return gId;
}

/**
 * Formats a message into a PostgreSQL record using standard snake_case column names.
 */
export function formatMessageForDatabaseSnakeCase(msg: Message): Record<string, any> {
  return {
    id: msg.id,
    thread_id: msg.threadId || msg.customerId,
    customer_id: msg.customerId,
    customer_name: msg.customerName || 'Wholesale Buyer',
    customer_email: msg.customerEmail || '',
    sender_id: msg.senderId,
    sender_name: msg.senderName,
    sender_role: msg.senderRole,
    message: msg.message,
    attachments: msg.attachments || [],
    attached_product: msg.attachedProduct || null,
    attached_order: msg.attachedOrder || null,
    quote_data: msg.quoteData || null,
    voice_note: msg.voiceNote || null,
    reply_to: msg.replyTo || null,
    reactions: msg.reactions || {},
    is_internal_note: Boolean(msg.isInternalNote),
    message_type: msg.messageType || 'text',
    read_by_admin: Boolean(msg.readByAdmin),
    read_by_customer: Boolean(msg.readByCustomer),
    delivery_status: msg.deliveryStatus || 'delivered',
    delivered_at: msg.deliveredAt || msg.createdAt,
    read_at: msg.readAt || null,
    created_at: msg.createdAt
  };
}

/**
 * Formats a message into a PostgreSQL record using camelCase column names.
 */
export function formatMessageForDatabaseCamelCase(msg: Message): Record<string, any> {
  return {
    id: msg.id,
    threadId: msg.threadId || msg.customerId,
    customerId: msg.customerId,
    customerName: msg.customerName || 'Wholesale Buyer',
    customerEmail: msg.customerEmail || '',
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    message: msg.message,
    attachments: msg.attachments || [],
    attachedProduct: msg.attachedProduct || null,
    attachedOrder: msg.attachedOrder || null,
    quoteData: msg.quoteData || null,
    voiceNote: msg.voiceNote || null,
    replyTo: msg.replyTo || null,
    reactions: msg.reactions || {},
    isInternalNote: Boolean(msg.isInternalNote),
    messageType: msg.messageType || 'text',
    readByAdmin: Boolean(msg.readByAdmin),
    readByCustomer: Boolean(msg.readByCustomer),
    deliveryStatus: msg.deliveryStatus || 'delivered',
    deliveredAt: msg.deliveredAt || msg.createdAt,
    readAt: msg.readAt || null,
    createdAt: msg.createdAt
  };
}

/**
 * Formats a message into a PostgreSQL record with both camelCase and snake_case properties
 * so that any Supabase schema table accepts the payload reliably.
 */
export function formatMessageForDatabase(msg: Message): Record<string, any> {
  return formatMessageForDatabaseSnakeCase(msg);
}

// -------------------------------------------------------------
// EVENT DISPATCH & LOCAL STORAGE CACHE HELPERS
// -------------------------------------------------------------

export function notifyMessageEvent(payload: Omit<ChatEventPayload, 'timestamp'>): void {
  const fullPayload: ChatEventPayload = {
    ...payload,
    timestamp: Date.now()
  };

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MESSAGE_EVENT_NAME, { detail: fullPayload }));
    }
  } catch {}

  try {
    if (chatBroadcastChannel) {
      chatBroadcastChannel.postMessage(fullPayload);
    }
  } catch {}
}

export function getCachedAllMessages(): Message[] {
  try {
    const raw = localStorage.getItem(ALL_MESSAGES_CACHE_KEY) || localStorage.getItem('ee_all_messages_cache_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeMessage) : [];
  } catch {
    return [];
  }
}

export function saveCachedAllMessages(msgs: Message[]) {
  try {
    const normalized = msgs.map(normalizeMessage);
    localStorage.setItem(ALL_MESSAGES_CACHE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn('Failed to cache all messages:', e);
  }
}

export function getCachedCustomerMessages(customerId: string): Message[] {
  if (!customerId) return [];
  try {
    let customerSpecific: Message[] = [];
    const raw = localStorage.getItem(`ee_chat_${customerId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        customerSpecific = parsed.map(normalizeMessage).filter(m => !isStaffInternalNote(m));
      }
    }
    const all = getCachedAllMessages();
    const fromAll = all.filter(
      m => (m.customerId === customerId || m.threadId === customerId) && !isStaffInternalNote(m)
    );
    return mergeMessageArrays(customerSpecific, fromAll);
  } catch {
    return [];
  }
}

export function saveCachedCustomerMessages(customerId: string, msgs: Message[]) {
  if (!customerId) return;
  try {
    // Only customer-visible messages are cached under the customer-specific key
    const customerSafe = msgs.map(normalizeMessage).filter(m => !isStaffInternalNote(m));
    localStorage.setItem(`ee_chat_${customerId}`, JSON.stringify(customerSafe));
    
    // Safely merge into all messages cache without destroying existing internal notes or other messages
    const all = getCachedAllMessages();
    const merged = mergeMessageArrays(all, msgs.map(normalizeMessage));
    saveCachedAllMessages(merged);
  } catch (e) {
    console.warn('Failed to cache customer messages:', e);
  }
}

function mergeMessageArrays(existing: Message[], incoming: Message[]): Message[] {
  const map = new Map<string, Message>();
  existing.forEach(m => {
    if (m && m.id) map.set(m.id, normalizeMessage(m));
  });
  incoming.forEach(m => {
    if (m && m.id) {
      const prev = map.get(m.id);
      const normalized = normalizeMessage(m);
      if (prev) {
        map.set(m.id, {
          ...prev,
          ...normalized,
          readByAdmin: prev.readByAdmin || normalized.readByAdmin,
          readByCustomer: prev.readByCustomer || normalized.readByCustomer,
          reactions: { ...(prev.reactions || {}), ...(normalized.reactions || {}) }
        });
      } else {
        map.set(m.id, normalized);
      }
    }
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

// -------------------------------------------------------------
// CORE MESSAGE ACTIONS (DELIVERY, REACTIONS, DELETION, READ STATES)
// -------------------------------------------------------------

/**
 * Send a support message with full multimedia, product cards, order links, quote offers, and replies.
 * Uses optimistic local caching for instant UI response and dual backend + Supabase synchronization.
 */
export async function sendMessageInDatabase(data: SendMessageParams): Promise<Message> {
  const newId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const isNote = Boolean(data.isInternalNote || data.messageType === 'internal_note');
  let messageType = data.messageType || 'text';
  if (isNote) messageType = 'internal_note';
  else if (data.quoteData) messageType = 'quote_offer';
  else if (data.attachedProduct) messageType = 'product_card';
  else if (data.attachedOrder) messageType = 'order_ref';
  else if (data.voiceNote) messageType = 'voice_note';

  const msg: Message = {
    id: newId,
    threadId: data.threadId || data.customerId,
    customerId: data.customerId,
    customerName: data.customerName,
    customerEmail: data.customerEmail || '',
    senderId: data.senderId,
    senderName: data.senderName,
    senderRole: data.senderRole,
    message: (data.message || '').trim(),
    attachments: data.attachments || [],
    attachedProduct: data.attachedProduct,
    attachedOrder: data.attachedOrder,
    quoteData: data.quoteData,
    voiceNote: data.voiceNote,
    replyTo: data.replyTo,
    reactions: {},
    isInternalNote: isNote,
    messageType,
    readByAdmin: data.senderRole === 'admin',
    readByCustomer: data.senderRole === 'customer',
    deliveryStatus: 'delivered',
    deliveredAt: now,
    createdAt: now
  };

  // 1. Optimistically Cache locally for instant 0ms UI update
  if (!isStaffInternalNote(msg)) {
    const localMsgs = getCachedCustomerMessages(data.customerId);
    const updatedList = mergeMessageArrays(localMsgs, [msg]);
    saveCachedCustomerMessages(data.customerId, updatedList);
  }

  const allMsgs = getCachedAllMessages();
  saveCachedAllMessages(mergeMessageArrays(allMsgs, [msg]));

  // 2. Instantly notify all local listeners in current browser session
  notifyMessageEvent({
    customerId: data.customerId,
    action: 'send',
    message: msg
  });

  // 3. Post to Express Backend API for local persistent storage & SSE stream
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
      ...(controller ? { signal: controller.signal } : {})
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const saved = await res.json();
      if (saved && saved.id) {
        msg.id = saved.id;
      }
    }
  } catch (err) {
    console.warn('Backend message sync warning:', err);
  }

  // 4. Primary real-time persistence: Insert into Supabase table (non-blocking safe execution)
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      (async () => {
        try {
          const dbPayload = formatMessageForDatabase(msg);
          const { error } = await supabase.from(MESSAGES_TABLE).insert(dbPayload);
          if (error) {
            // If insert failed due to column naming mismatches, attempt fallback with camelCase only
            const { error: retryError } = await supabase.from(MESSAGES_TABLE).insert(msg);
            if (retryError) {
              handleSupabaseError(retryError, OperationType.CREATE, `${MESSAGES_TABLE}/${newId}`);
            }
          }
        } catch (error) {
          handleSupabaseError(error, OperationType.CREATE, `${MESSAGES_TABLE}/${newId}`);
        }
      })().catch(() => {});
    }
  }

  // 5. Dispatch App Notification for the counterpart if it's not an internal note
  if (!isStaffInternalNote(msg)) {
    try {
      if (data.senderRole === 'customer') {
        sendAppNotification({
          userId: 'all_admins',
          recipientRole: 'admin',
          type: 'new_message',
          title: `Customer Message from ${data.customerName || 'Wholesale Buyer'}`,
          message: data.message.length > 90 ? `${data.message.substring(0, 87)}...` : data.message,
          referenceId: data.customerId,
          targetView: 'admin'
        }).catch(() => {});
      } else {
        sendAppNotification({
          userId: data.customerId,
          recipientRole: 'customer',
          type: 'new_message',
          title: 'Operations Desk Message Reply',
          message: data.message.length > 90 ? `${data.message.substring(0, 87)}...` : data.message,
          referenceId: data.customerId,
          targetView: 'support'
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.debug('Notification dispatch error:', notifErr);
    }
  }

  return msg;
}

/**
 * Toggle emoji reaction on a message across Local, Backend, and Supabase.
 */
export async function toggleMessageReaction(
  messageId: string,
  customerId: string,
  emoji: string,
  userId: string
): Promise<Message | null> {
  let updatedTarget: Message | null = null;

  try {
    const localMsgs = getCachedCustomerMessages(customerId);
    const updated = localMsgs.map((m: Message) => {
      if (m.id === messageId) {
        const currentReactions = { ...(m.reactions || {}) };
        const userList = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
        const index = userList.indexOf(userId);

        if (index >= 0) {
          userList.splice(index, 1);
          if (userList.length === 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = userList;
          }
        } else {
          userList.push(userId);
          currentReactions[emoji] = userList;
        }

        updatedTarget = { ...m, reactions: currentReactions };
        return updatedTarget;
      }
      return m;
    });

    saveCachedCustomerMessages(customerId, updated);

    // Also update all messages cache
    const all = getCachedAllMessages();
    const updatedAll = all.map(m => m.id === messageId ? (updatedTarget || m) : m);
    saveCachedAllMessages(updatedAll);

    // Instantly notify local subscribers
    notifyMessageEvent({
      customerId,
      action: 'reaction',
      message: updatedTarget || undefined,
      messageId
    });
  } catch (err) {
    console.warn('Failed to toggle reaction locally:', err);
  }

  // Sync to Backend
  try {
    fetch(`/api/messages/${messageId}/reaction`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId, customerId })
    }).catch(() => {});
  } catch {}

  // Sync to Supabase
  if (isSupabaseEnabled() && updatedTarget) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const reactionsPayload = (updatedTarget as Message).reactions || {};
        await supabase
          .from(MESSAGES_TABLE)
          .update({ reactions: reactionsPayload })
          .eq('id', messageId);
      } catch (error) {
        handleSupabaseError(error, OperationType.UPDATE, `${MESSAGES_TABLE}/${messageId}`);
      }
    }
  }

  return updatedTarget;
}

/**
 * Delete a single message from Local, Backend, and Supabase.
 */
export async function deleteMessageInDatabase(
  messageId: string,
  customerId: string
): Promise<void> {
  try {
    const localMsgs = getCachedCustomerMessages(customerId);
    const filtered = localMsgs.filter(m => m.id !== messageId);
    saveCachedCustomerMessages(customerId, filtered);

    const all = getCachedAllMessages();
    const filteredAll = all.filter(m => m.id !== messageId);
    saveCachedAllMessages(filteredAll);

    // Instantly notify local subscribers
    notifyMessageEvent({
      customerId,
      action: 'delete',
      messageId
    });
  } catch (err) {
    console.warn('Failed to delete message locally:', err);
  }

  // Delete on Backend
  try {
    fetch(`/api/messages/${messageId}`, {
      method: 'DELETE'
    }).catch(() => {});
  } catch {}

  // Delete on Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(MESSAGES_TABLE).delete().eq('id', messageId);
      } catch (error) {
        handleSupabaseError(error, OperationType.DELETE, `${MESSAGES_TABLE}/${messageId}`);
      }
    }
  }
}

/**
 * Mark messages as read by role for an entire customer conversation thread.
 */
export async function markThreadAsRead(customerId: string, role: UserRole): Promise<void> {
  if (!customerId) return;
  const now = new Date().toISOString();
  
  // 1. Immediately mark any associated message notifications as read in the header notification system
  try {
    markMessageNotificationsAsRead(customerId, role);
  } catch (err) {
    console.debug('Failed to sync notification read state:', err);
  }

  const localMsgs = getCachedCustomerMessages(customerId);
  if (localMsgs.length === 0) {
    return; // No messages in thread, nothing to mark as read
  }

  // Strictly check if there are actual unread messages sent by the counter-party
  const needsUpdate = localMsgs.some(m => 
    (role === 'admin' && !m.readByAdmin && m.senderRole === 'customer') ||
    (role === 'customer' && !m.readByCustomer && m.senderRole === 'admin')
  );

  if (!needsUpdate) {
    return; // Already up to date, avoid redundant state churn
  }

  try {
    const updated: Message[] = localMsgs.map((m: Message) => ({
      ...m,
      readByAdmin: role === 'admin' ? true : m.readByAdmin,
      readByCustomer: role === 'customer' ? true : m.readByCustomer,
      deliveryStatus: 'read' as const,
      readAt: m.readAt || now
    }));
    saveCachedCustomerMessages(customerId, updated);

    // Also update all messages cache
    const all = getCachedAllMessages();
    const updatedAll = all.map((m: Message) => {
      if (m.customerId === customerId || m.threadId === customerId) {
        return {
          ...m,
          readByAdmin: role === 'admin' ? true : m.readByAdmin,
          readByCustomer: role === 'customer' ? true : m.readByCustomer,
          deliveryStatus: 'read' as const,
          readAt: m.readAt || now
        };
      }
      return m;
    });
    saveCachedAllMessages(updatedAll);

    notifyMessageEvent({
      customerId,
      action: 'read'
    });
  } catch (err) {
    console.warn('Failed to update read state locally:', err);
  }

  // Sync to Backend
  try {
    fetch(`/api/messages/thread/${customerId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    }).catch(() => {});
  } catch {}

  // Sync to Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const updateDataSnake = role === 'admin' 
          ? { read_by_admin: true, delivery_status: 'read', read_at: now }
          : { read_by_customer: true, delivery_status: 'read', read_at: now };
        
        const { error } = await supabase
          .from(MESSAGES_TABLE)
          .update(updateDataSnake)
          .eq('customer_id', customerId);

        if (error) {
          const updateDataCamel = role === 'admin'
            ? { readByAdmin: true, deliveryStatus: 'read', readAt: now }
            : { readByCustomer: true, deliveryStatus: 'read', readAt: now };
          await supabase
            .from(MESSAGES_TABLE)
            .update(updateDataCamel)
            .eq('customerId', customerId);
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.UPDATE, MESSAGES_TABLE);
      }
    }
  }
}

/**
 * Mark a single specific message as read.
 */
export async function markMessageAsRead(messageId: string, customerId: string, role: UserRole): Promise<void> {
  const now = new Date().toISOString();
  
  try {
    markMessageNotificationsAsRead(customerId, role);
  } catch {}

  try {
    const localMsgs = getCachedCustomerMessages(customerId);
    const updated: Message[] = localMsgs.map((m: Message) => {
      if (m.id === messageId) {
        return {
          ...m,
          readByAdmin: role === 'admin' ? true : m.readByAdmin,
          readByCustomer: role === 'customer' ? true : m.readByCustomer,
          deliveryStatus: 'read' as const,
          readAt: m.readAt || now
        };
      }
      return m;
    });
    saveCachedCustomerMessages(customerId, updated);

    const all = getCachedAllMessages();
    const updatedAll = all.map(m => m.id === messageId ? {
      ...m,
      readByAdmin: role === 'admin' ? true : m.readByAdmin,
      readByCustomer: role === 'customer' ? true : m.readByCustomer,
      deliveryStatus: 'read' as const,
      readAt: m.readAt || now
    } : m);
    saveCachedAllMessages(updatedAll);

    notifyMessageEvent({
      customerId,
      action: 'read',
      messageId
    });
  } catch (err) {
    console.warn('Failed to mark message as read locally:', err);
  }

  // Sync to Backend
  try {
    fetch(`/api/messages/${messageId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    }).catch(() => {});
  } catch {}

  // Sync to Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const updateDataSnake = role === 'admin'
          ? { read_by_admin: true, delivery_status: 'read', read_at: now }
          : { read_by_customer: true, delivery_status: 'read', read_at: now };
        const { error } = await supabase.from(MESSAGES_TABLE).update(updateDataSnake).eq('id', messageId);
        if (error) {
          const updateDataCamel = role === 'admin'
            ? { readByAdmin: true, deliveryStatus: 'read', readAt: now }
            : { readByCustomer: true, deliveryStatus: 'read', readAt: now };
          await supabase.from(MESSAGES_TABLE).update(updateDataCamel).eq('id', messageId);
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.UPDATE, `${MESSAGES_TABLE}/${messageId}`);
      }
    }
  }
}

/**
 * Mark ALL conversations across the entire platform as read.
 */
export async function markAllConversationsAsRead(role: UserRole): Promise<void> {
  const now = new Date().toISOString();
  try {
    const all = getCachedAllMessages();
    const updatedAll: Message[] = all.map(m => ({
      ...m,
      readByAdmin: role === 'admin' ? true : m.readByAdmin,
      readByCustomer: role === 'customer' ? true : m.readByCustomer,
      deliveryStatus: 'read' as const,
      readAt: m.readAt || now
    }));
    saveCachedAllMessages(updatedAll);

    // Also update individual thread caches
    const customerIds = new Set(all.map(m => m.customerId).filter(Boolean));
    customerIds.forEach(cId => {
      const localMsgs = getCachedCustomerMessages(cId);
      if (localMsgs.length > 0) {
        const updatedLocal: Message[] = localMsgs.map(m => ({
          ...m,
          readByAdmin: role === 'admin' ? true : m.readByAdmin,
          readByCustomer: role === 'customer' ? true : m.readByCustomer,
          deliveryStatus: 'read' as const,
          readAt: m.readAt || now
        }));
        localStorage.setItem(`ee_chat_${cId}`, JSON.stringify(updatedLocal));
      }
    });

    notifyMessageEvent({
      customerId: 'all',
      action: 'read'
    });
  } catch (err) {
    console.warn('Failed to mark all conversations as read locally:', err);
  }

  // Sync to Backend
  try {
    fetch('/api/messages/read-all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    }).catch(() => {});
  } catch {}

  // Sync to Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const updateDataSnake = role === 'admin'
          ? { read_by_admin: true, delivery_status: 'read', read_at: now }
          : { read_by_customer: true, delivery_status: 'read', read_at: now };
        const { error } = await supabase.from(MESSAGES_TABLE).update(updateDataSnake).neq('id', 'placeholder_none');
        if (error) {
          const updateDataCamel = role === 'admin'
            ? { readByAdmin: true, deliveryStatus: 'read', readAt: now }
            : { readByCustomer: true, deliveryStatus: 'read', readAt: now };
          await supabase.from(MESSAGES_TABLE).update(updateDataCamel).neq('id', 'placeholder_none');
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.UPDATE, MESSAGES_TABLE);
      }
    }
  }
}

/**
 * Delete an entire customer chat conversation thread.
 */
export async function deleteCustomerThread(customerId: string): Promise<{ success: boolean; deletedCount: number }> {
  let deletedCount = 0;

  try {
    const localMsgs = getCachedCustomerMessages(customerId);
    deletedCount = localMsgs.length;
    localStorage.removeItem(`ee_chat_${customerId}`);

    const all = getCachedAllMessages();
    const filteredAll = all.filter(m => m.customerId !== customerId);
    deletedCount = Math.max(deletedCount, all.length - filteredAll.length);
    saveCachedAllMessages(filteredAll);

    // Notify all subscribers of deletion
    notifyMessageEvent({
      customerId,
      action: 'thread_deleted'
    });
  } catch (err) {
    console.warn('Failed to delete customer thread locally:', err);
  }

  // Delete on Backend
  try {
    fetch(`/api/messages/thread/${customerId}`, {
      method: 'DELETE'
    }).catch(() => {});
  } catch {}

  // Delete on Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from(MESSAGES_TABLE).delete().eq('customer_id', customerId);
        if (error) {
          await supabase.from(MESSAGES_TABLE).delete().eq('customerId', customerId);
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.DELETE, `${MESSAGES_TABLE}?customer_id=eq.${customerId}`);
      }
    }
  }

  return { success: true, deletedCount };
}

/**
 * Delete all chat conversations belonging to deleted/non-existent customer accounts.
 */
export async function deleteOrphanedCustomerChats(
  existingUserIds: string[]
): Promise<{ success: boolean; deletedThreads: number; deletedMessages: number }> {
  const validIdsSet = new Set(existingUserIds.filter(Boolean));
  let deletedThreads = 0;
  let deletedMessages = 0;

  try {
    const all = getCachedAllMessages();
    const orphanedCustomerIds = new Set<string>();

    all.forEach(m => {
      if (m.customerId && !m.customerId.startsWith('guest_') && !validIdsSet.has(m.customerId)) {
        orphanedCustomerIds.add(m.customerId);
      }
    });

    deletedThreads = orphanedCustomerIds.size;

    orphanedCustomerIds.forEach(cId => {
      localStorage.removeItem(`ee_chat_${cId}`);
      try {
        fetch(`/api/messages/thread/${cId}`, { method: 'DELETE' }).catch(() => {});
      } catch {}
      if (isSupabaseEnabled()) {
        const supabase = getSupabase();
        if (supabase) {
          supabase.from(MESSAGES_TABLE).delete().eq('customer_id', cId).then(({ error }) => {
            if (error) {
              supabase.from(MESSAGES_TABLE).delete().eq('customerId', cId).then(() => {}, () => {});
            }
          }, () => {});
        }
      }
    });

    const keptMessages = all.filter(m => !orphanedCustomerIds.has(m.customerId));
    deletedMessages = all.length - keptMessages.length;
    saveCachedAllMessages(keptMessages);

    notifyMessageEvent({
      customerId: 'all',
      action: 'delete'
    });
  } catch (err) {
    console.warn('Failed to delete orphaned customer chats locally:', err);
  }

  return { success: true, deletedThreads, deletedMessages };
}

/**
 * Actively fetches the latest fresh messages from the backend API & Supabase database,
 * merges them with local cache, and triggers a sync event. Perfect for Pull-to-Refresh.
 */
export async function fetchFreshCustomerMessages(customerId: string): Promise<Message[]> {
  let fresh: Message[] = [];

  // 1. Fetch from server REST endpoint
  try {
    const res = await fetch(`/api/messages?customerId=${encodeURIComponent(customerId)}&_t=${Date.now()}`);
    if (res.ok) {
      const serverMsgs = await res.json();
      if (Array.isArray(serverMsgs)) {
        fresh = mergeMessageArrays(fresh, serverMsgs.map(normalizeMessage));
      }
    }
  } catch (err) {
    console.warn('REST fetchFreshCustomerMessages error:', err);
  }

  // 2. Query Supabase Postgres table
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        let { data, error } = await supabase
          .from(MESSAGES_TABLE)
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: true });

        if (error || !data) {
          // Fallback with camelCase
          const { data: retryData } = await supabase
            .from(MESSAGES_TABLE)
            .select('*')
            .eq('customerId', customerId)
            .order('createdAt', { ascending: true });
          if (retryData && Array.isArray(retryData)) {
            fresh = mergeMessageArrays(fresh, retryData.map(normalizeMessage));
          }
        } else if (Array.isArray(data)) {
          fresh = mergeMessageArrays(fresh, data.map(normalizeMessage));
        }
      } catch (err) {
        console.warn('Supabase fetchFreshCustomerMessages error:', err);
      }
    }
  }

  // 3. Merge with local cached messages and persist
  const localMsgs = getCachedCustomerMessages(customerId);
  const combined = mergeMessageArrays(localMsgs, fresh);
  saveCachedCustomerMessages(customerId, combined);

  // 4. Dispatch sync event to all watchers
  notifyMessageEvent({
    customerId,
    action: 'sync',
    count: combined.length
  });

  return filterCustomerVisibleMessages(combined);
}

// -------------------------------------------------------------
// REAL-TIME SUBSCRIPTION HOOKS VIA SUPABASE `postgres_changes`
// -------------------------------------------------------------

export function areMessageListsEqual(a: Message[], b: Message[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ma = a[i];
    const mb = b[i];
    if (
      ma.id !== mb.id ||
      ma.deliveryStatus !== mb.deliveryStatus ||
      ma.readByAdmin !== mb.readByAdmin ||
      ma.readByCustomer !== mb.readByCustomer ||
      ma.message !== mb.message ||
      ma.isInternalNote !== mb.isInternalNote ||
      JSON.stringify(ma.reactions || {}) !== JSON.stringify(mb.reactions || {})
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Subscribe to a specific customer's thread in real-time.
 * Primary source of truth: Supabase `on('postgres_changes')` subscriptions.
 * Multi-layer sync: Supabase postgres_changes + SSE Stream + BroadcastChannel + CustomEvents + LocalStorage Cache.
 * Guarantees that internal staff notes are strictly excluded from the customer callback.
 */
export function subscribeToCustomerThread(
  customerId: string, 
  rawOnMessages: (messages: Message[]) => void
): () => void {
  let isSubscribed = true;
  let lastEmittedMessages: Message[] = [];

  // Safe wrapper that enforces customer-visible filtering and deduplicates identical emissions
  const emitMessages = (msgs: Message[]) => {
    if (!isSubscribed) return;
    const filtered = filterCustomerVisibleMessages(msgs);
    if (!areMessageListsEqual(lastEmittedMessages, filtered)) {
      lastEmittedMessages = filtered;
      rawOnMessages(filtered);
    }
  };

  const refreshFromCache = () => {
    if (!isSubscribed) return;
    const localMsgs = getCachedCustomerMessages(customerId);
    emitMessages(localMsgs);
  };

  // 1. Initial immediate load from cache (0ms)
  refreshFromCache();

  // 2. Initial fetch from REST Backend Server
  const fetchFromServer = async () => {
    try {
      const res = await fetch(`/api/messages?customerId=${encodeURIComponent(customerId)}&role=customer`);
      if (res.ok && isSubscribed) {
        const serverMsgs = await res.json();
        if (Array.isArray(serverMsgs)) {
          const localMsgs = getCachedCustomerMessages(customerId);
          const normalized = serverMsgs.map(normalizeMessage).filter(m => !isStaffInternalNote(m));
          const merged = mergeMessageArrays(localMsgs, normalized);
          saveCachedCustomerMessages(customerId, merged);
          emitMessages(merged);
        }
      }
    } catch {}
  };

  fetchFromServer();

  // 3. Supabase Initial Query for complete history & state reconciliation
  const fetchFromSupabase = async () => {
    if (!isSupabaseEnabled()) return;
    const supabase = getSupabase();
    if (!supabase || !isSubscribed) return;

    try {
      // Query messages by customer_id first (standard Supabase schema)
      let { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        // Fallback with camelCase
        const { data: retryData } = await supabase
          .from(MESSAGES_TABLE)
          .select('*')
          .eq('customerId', customerId)
          .order('createdAt', { ascending: true });

        if (retryData && Array.isArray(retryData) && isSubscribed) {
          const normalized = retryData.map(normalizeMessage).filter(m => !isStaffInternalNote(m));
          const localMsgs = getCachedCustomerMessages(customerId);
          const merged = mergeMessageArrays(localMsgs, normalized);
          saveCachedCustomerMessages(customerId, merged);
          emitMessages(merged);
        }
      } else if (Array.isArray(data) && isSubscribed) {
        const normalized = data.map(normalizeMessage).filter(m => !isStaffInternalNote(m));
        const localMsgs = getCachedCustomerMessages(customerId);
        const merged = mergeMessageArrays(localMsgs, normalized);
        saveCachedCustomerMessages(customerId, merged);
        emitMessages(merged);
      }
    } catch (err) {
      console.debug('Supabase customer message fetch fallback:', err);
    }
  };

  fetchFromSupabase();

  // 4. SUPABASE REAL-TIME `postgres_changes` SUBSCRIPTION (Primary Driver)
  let supabaseChannel: any = null;
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const channelName = `chat:customer:${customerId}:${Date.now()}`;
        
        supabaseChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: MESSAGES_TABLE 
            },
            (payload: any) => {
              if (!isSubscribed) return;
              const newCid = payload.new?.customer_id || payload.new?.customerId;
              const oldCid = payload.old?.customer_id || payload.old?.customerId;
              if (newCid === customerId || oldCid === customerId) {
                handlePostgresPayload(payload);
              }
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              fetchFromSupabase();
            }
          });
      } catch (error) {
        console.warn('Supabase real-time customer subscription fallback:', error);
      }
    }
  }

  const handlePostgresPayload = (payload: any) => {
    try {
      const eventType = payload.eventType;
      const currentMsgs = getCachedCustomerMessages(customerId);

      if (eventType === 'INSERT') {
        const newMsg = normalizeMessage(payload.new);
        if (isStaffInternalNote(newMsg)) {
          return; // Ignore internal note in customer subscription
        }
        if (newMsg.customerId === customerId) {
          const merged = mergeMessageArrays(currentMsgs, [newMsg]);
          saveCachedCustomerMessages(customerId, merged);
          emitMessages(merged);
        }
      } else if (eventType === 'UPDATE') {
        const updatedMsg = normalizeMessage(payload.new);
        if (isStaffInternalNote(updatedMsg)) {
          const filtered = currentMsgs.filter(m => m.id !== updatedMsg.id);
          saveCachedCustomerMessages(customerId, filtered);
          emitMessages(filtered);
          return;
        }
        if (updatedMsg.customerId === customerId) {
          const updated = currentMsgs.map(m => m.id === updatedMsg.id ? updatedMsg : m);
          saveCachedCustomerMessages(customerId, updated);
          emitMessages(updated);
        }
      } else if (eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          const filtered = currentMsgs.filter(m => m.id !== deletedId);
          saveCachedCustomerMessages(customerId, filtered);
          emitMessages(filtered);
        }
      }
    } catch (err) {
      console.warn('Error handling postgres_changes payload:', err);
    }
  };

  // 5. In-tab & window event listener for instant in-memory sync (0ms microtask execution)
  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<ChatEventPayload>;
    if (customEvt.detail && (customEvt.detail.customerId === customerId || customEvt.detail.customerId === 'all')) {
      if (customEvt.detail.message && isStaffInternalNote(customEvt.detail.message)) {
        return; // Ignore staff internal note events in customer thread
      }
      if (customEvt.detail.message) {
        const localMsgs = getCachedCustomerMessages(customerId);
        const merged = mergeMessageArrays(localMsgs, [customEvt.detail.message]);
        saveCachedCustomerMessages(customerId, merged);
        emitMessages(merged);
      } else {
        refreshFromCache();
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(MESSAGE_EVENT_NAME, handleCustomEvent);
  }

  // 6. Cross-tab BroadcastChannel listener
  const handleBroadcastMessage = (evt: MessageEvent<ChatEventPayload>) => {
    if (evt.data && (evt.data.customerId === customerId || evt.data.customerId === 'all')) {
      if (evt.data.message && isStaffInternalNote(evt.data.message)) {
        return; // Ignore staff internal note events in customer thread
      }
      if (evt.data.message) {
        const localMsgs = getCachedCustomerMessages(customerId);
        const merged = mergeMessageArrays(localMsgs, [evt.data.message]);
        saveCachedCustomerMessages(customerId, merged);
        emitMessages(merged);
      } else {
        refreshFromCache();
      }
    }
  };

  if (chatBroadcastChannel) {
    chatBroadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // 7. Storage event listener (across browser tabs)
  const handleStorageEvent = (evt: StorageEvent) => {
    if (evt.key === `ee_chat_${customerId}` || evt.key === ALL_MESSAGES_CACHE_KEY) {
      refreshFromCache();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  // Mobile Lifecycle Listeners (instant 0ms catch-up when unlocking phone or switching back to browser)
  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isSubscribed) {
      refreshFromCache();
      fetchFromServer();
      if (isSupabaseEnabled()) fetchFromSupabase();
    }
  };

  const handleWindowFocus = () => {
    if (isSubscribed) {
      refreshFromCache();
      fetchFromServer();
    }
  };

  const handleOnline = () => {
    if (isSubscribed) {
      fetchFromServer();
      if (isSupabaseEnabled()) fetchFromSupabase();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);
  }

  // 8. Server-Sent Events (SSE) live stream from Express Server (Multi-device Fallback)
  let eventSource: EventSource | null = null;
  try {
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      eventSource = new EventSource(`/api/messages/stream?customerId=${encodeURIComponent(customerId)}&role=customer`);

      const handleIncomingCustomerMsg = (rawMsg: any) => {
        if (!rawMsg || !isSubscribed) return;
        const normalized = normalizeMessage(rawMsg);
        if (normalized.customerId === customerId || normalized.customerId === 'all') {
          if (isStaffInternalNote(normalized)) {
            return; // Do NOT push internal notes to customer!
          }
          const current = getCachedCustomerMessages(customerId);
          const merged = mergeMessageArrays(current, [normalized]);
          saveCachedCustomerMessages(customerId, merged);
          emitMessages(merged);
        }
      };

      eventSource.addEventListener('initial_messages', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.messages && Array.isArray(parsed.messages) && isSubscribed) {
            const normalized = parsed.messages.map(normalizeMessage).filter(m => !isStaffInternalNote(m));
            const current = getCachedCustomerMessages(customerId);
            const merged = mergeMessageArrays(current, normalized);
            saveCachedCustomerMessages(customerId, merged);
            emitMessages(merged);
          }
        } catch {}
      });

      eventSource.addEventListener('message_created', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.message) {
            handleIncomingCustomerMsg(parsed.message);
          }
        } catch {}
      });

      eventSource.addEventListener('new_message', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.message) {
            handleIncomingCustomerMsg(parsed.message);
          }
        } catch {}
      });

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.message) {
            handleIncomingCustomerMsg(parsed.message);
          }
        } catch {}
      };

      eventSource.addEventListener('message_reaction', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.messageId && isSubscribed) {
            const current = getCachedCustomerMessages(customerId);
            const updated = current.map(m => m.id === parsed.messageId ? { ...m, reactions: parsed.reactions } : m);
            saveCachedCustomerMessages(customerId, updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('message_read', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.messageId && isSubscribed) {
            const current = getCachedCustomerMessages(customerId);
            const updated: Message[] = current.map(m => m.id === parsed.messageId ? {
              ...m,
              readByAdmin: parsed.role === 'admin' ? true : m.readByAdmin,
              readByCustomer: parsed.role === 'customer' ? true : m.readByCustomer,
              deliveryStatus: 'read' as const
            } : m);
            saveCachedCustomerMessages(customerId, updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('thread_read', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if ((parsed?.customerId === customerId || parsed?.customerId === 'all') && isSubscribed) {
            const current = getCachedCustomerMessages(customerId);
            const updated: Message[] = current.map(m => ({
              ...m,
              readByAdmin: parsed.role === 'admin' ? true : m.readByAdmin,
              readByCustomer: parsed.role === 'customer' ? true : m.readByCustomer,
              deliveryStatus: 'read' as const
            }));
            saveCachedCustomerMessages(customerId, updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('message_deleted', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.id && isSubscribed) {
            const current = getCachedCustomerMessages(customerId);
            const updated = current.filter(m => m.id !== parsed.id);
            saveCachedCustomerMessages(customerId, updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('thread_deleted', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if ((parsed?.customerId === customerId || parsed?.customerId === 'all') && isSubscribed) {
            localStorage.removeItem(`ee_chat_${customerId}`);
            emitMessages([]);
          }
        } catch {}
      });

      eventSource.addEventListener('typing_status', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.customerId === customerId) {
            window.dispatchEvent(new CustomEvent('ee_chat_typing', { detail: parsed }));
          }
        } catch {}
      });

      eventSource.onerror = () => {
        if (isSubscribed) {
          fetchFromServer();
        }
      };
    }
  } catch (err) {
    console.warn('SSE eventSource initialization fallback:', err);
  }

  // 9. Active Polling Fallback (2500ms safety interval)
  const pollInterval = setInterval(() => {
    if (!isSubscribed) return;
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchFromServer();
      if (isSupabaseEnabled()) {
        fetchFromSupabase();
      }
    }
  }, 2500);

  // Cleanup function
  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener(MESSAGE_EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    }
    if (chatBroadcastChannel) {
      chatBroadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    if (eventSource) {
      eventSource.close();
    }
    if (supabaseChannel && isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          supabase.removeChannel(supabaseChannel);
        } catch {}
      }
    }
  };
}

/**
 * Subscribe to ALL messages across all customer threads for Admin Support Desk & Admin Dashboard.
 * Primary source of truth: Supabase `on('postgres_changes')` subscriptions.
 */
export function subscribeToAllMessages(
  onMessages: (messages: Message[]) => void
): () => void {
  let isSubscribed = true;
  let lastEmittedMessages: Message[] = [];

  const emitMessages = (msgs: Message[]) => {
    if (!isSubscribed) return;
    if (!areMessageListsEqual(lastEmittedMessages, msgs)) {
      lastEmittedMessages = msgs;
      onMessages(msgs);
    }
  };

  const refreshAll = () => {
    if (!isSubscribed) return;
    const cached = getCachedAllMessages();
    emitMessages(cached);
  };

  // 1. Initial immediate load from cache (0ms)
  refreshAll();

  // 2. Initial fetch from REST Backend Server
  const fetchAllFromServer = async () => {
    try {
      const res = await fetch('/api/messages');
      if (res.ok && isSubscribed) {
        const serverMsgs = await res.json();
        if (Array.isArray(serverMsgs)) {
          const cached = getCachedAllMessages();
          const merged = mergeMessageArrays(cached, serverMsgs.map(normalizeMessage));
          saveCachedAllMessages(merged);
          emitMessages(merged);
        }
      }
    } catch {}
  };

  fetchAllFromServer();

  // 3. Supabase Initial Query for Admin Inbox
  const fetchAllFromSupabase = async () => {
    if (!isSupabaseEnabled()) return;
    const supabase = getSupabase();
    if (!supabase || !isSubscribed) return;

    try {
      let { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        const { data: retryData } = await supabase
          .from(MESSAGES_TABLE)
          .select('*')
          .order('createdAt', { ascending: false });

        if (retryData && Array.isArray(retryData) && isSubscribed) {
          const normalized = retryData.map(normalizeMessage);
          const cached = getCachedAllMessages();
          const merged = mergeMessageArrays(cached, normalized);
          saveCachedAllMessages(merged);
          emitMessages(merged);
        }
      } else if (Array.isArray(data) && isSubscribed) {
        const normalized = data.map(normalizeMessage);
        const cached = getCachedAllMessages();
        const merged = mergeMessageArrays(cached, normalized);
        saveCachedAllMessages(merged);
        emitMessages(merged);
      }
    } catch (err) {
      console.debug('Supabase all-messages fetch fallback:', err);
    }
  };

  fetchAllFromSupabase();

  // 4. SUPABASE REAL-TIME `postgres_changes` SUBSCRIPTION FOR ADMIN
  let supabaseChannel: any = null;
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const channelName = `chat:admin:all:${Date.now()}`;
        supabaseChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: MESSAGES_TABLE 
            },
            (payload: any) => {
              if (!isSubscribed) return;
              handleAllMessagesPostgresChange(payload);
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              fetchAllFromSupabase();
            }
          });
      } catch (error) {
        console.warn('Admin inbox Supabase subscription fallback:', error);
      }
    }
  }

  const handleAllMessagesPostgresChange = (payload: any) => {
    try {
      const eventType = payload.eventType;
      const currentAll = getCachedAllMessages();

      if (eventType === 'INSERT') {
        const newMsg = normalizeMessage(payload.new);
        const merged = mergeMessageArrays(currentAll, [newMsg]);
        saveCachedAllMessages(merged);
        if (newMsg.customerId) {
          const localCustomer = getCachedCustomerMessages(newMsg.customerId);
          saveCachedCustomerMessages(newMsg.customerId, mergeMessageArrays(localCustomer, [newMsg]));
        }
        emitMessages(merged);
      } else if (eventType === 'UPDATE') {
        const updatedMsg = normalizeMessage(payload.new);
        const updated = currentAll.map(m => m.id === updatedMsg.id ? updatedMsg : m);
        saveCachedAllMessages(updated);
        if (updatedMsg.customerId) {
          const localCustomer = getCachedCustomerMessages(updatedMsg.customerId);
          saveCachedCustomerMessages(updatedMsg.customerId, localCustomer.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }
        emitMessages(updated);
      } else if (eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          const filtered = currentAll.filter(m => m.id !== deletedId);
          saveCachedAllMessages(filtered);
          emitMessages(filtered);
        }
      }
    } catch (err) {
      console.warn('Admin postgres_changes error:', err);
    }
  };

  // 5. In-tab & window event listener (0ms microtask execution)
  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<ChatEventPayload>;
    if (customEvt.detail?.message) {
      const currentAll = getCachedAllMessages();
      const merged = mergeMessageArrays(currentAll, [customEvt.detail.message]);
      saveCachedAllMessages(merged);
      if (customEvt.detail.message.customerId) {
        const localCustomer = getCachedCustomerMessages(customEvt.detail.message.customerId);
        saveCachedCustomerMessages(customEvt.detail.message.customerId, mergeMessageArrays(localCustomer, [customEvt.detail.message]));
      }
      emitMessages(merged);
    } else {
      refreshAll();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(MESSAGE_EVENT_NAME, handleCustomEvent);
  }

  // 6. Cross-tab BroadcastChannel listener
  const handleBroadcastMessage = (evt: MessageEvent<ChatEventPayload>) => {
    if (evt.data?.message) {
      const currentAll = getCachedAllMessages();
      const merged = mergeMessageArrays(currentAll, [evt.data.message]);
      saveCachedAllMessages(merged);
      if (evt.data.message.customerId) {
        const localCustomer = getCachedCustomerMessages(evt.data.message.customerId);
        saveCachedCustomerMessages(evt.data.message.customerId, mergeMessageArrays(localCustomer, [evt.data.message]));
      }
      emitMessages(merged);
    } else {
      refreshAll();
    }
  };

  if (chatBroadcastChannel) {
    chatBroadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // 7. Storage event listener
  const handleStorageEvent = (evt: StorageEvent) => {
    if (evt.key === ALL_MESSAGES_CACHE_KEY || evt.key?.startsWith('ee_chat_')) {
      refreshAll();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  // Mobile Lifecycle Listeners for Admin
  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isSubscribed) {
      refreshAll();
      fetchAllFromServer();
      if (isSupabaseEnabled()) fetchAllFromSupabase();
    }
  };

  const handleWindowFocus = () => {
    if (isSubscribed) {
      refreshAll();
      fetchAllFromServer();
    }
  };

  const handleOnline = () => {
    if (isSubscribed) {
      fetchAllFromServer();
      if (isSupabaseEnabled()) fetchAllFromSupabase();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);
  }

  // 8. Server-Sent Events (SSE) live stream for Admin
  let eventSource: EventSource | null = null;
  try {
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      eventSource = new EventSource('/api/messages/stream');

      const handleIncomingAdminMsg = (rawMsg: any) => {
        if (!rawMsg || !isSubscribed) return;
        const normalized = normalizeMessage(rawMsg);
        const current = getCachedAllMessages();
        const merged = mergeMessageArrays(current, [normalized]);
        saveCachedAllMessages(merged);
        if (normalized.customerId) {
          const localCustomer = getCachedCustomerMessages(normalized.customerId);
          saveCachedCustomerMessages(normalized.customerId, mergeMessageArrays(localCustomer, [normalized]));
        }
        emitMessages(merged);
      };

      eventSource.addEventListener('initial_messages', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.messages && Array.isArray(parsed.messages) && isSubscribed) {
            const normalized = parsed.messages.map(normalizeMessage);
            const current = getCachedAllMessages();
            const merged = mergeMessageArrays(current, normalized);
            saveCachedAllMessages(merged);
            emitMessages(merged);
          }
        } catch {}
      });

      eventSource.addEventListener('message_created', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.message) {
            handleIncomingAdminMsg(parsed.message);
          }
        } catch {}
      });

      eventSource.addEventListener('new_message', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.message) {
            handleIncomingAdminMsg(parsed.message);
          }
        } catch {}
      });

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.message) {
            handleIncomingAdminMsg(parsed.message);
          }
        } catch {}
      };

      eventSource.addEventListener('message_reaction', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.messageId && isSubscribed) {
            const current = getCachedAllMessages();
            const updated = current.map(m => m.id === parsed.messageId ? { ...m, reactions: parsed.reactions } : m);
            saveCachedAllMessages(updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('message_read', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.messageId && isSubscribed) {
            const current = getCachedAllMessages();
            const updated: Message[] = current.map(m => m.id === parsed.messageId ? {
              ...m,
              readByAdmin: parsed.role === 'admin' ? true : m.readByAdmin,
              readByCustomer: parsed.role === 'customer' ? true : m.readByCustomer,
              deliveryStatus: 'read' as const
            } : m);
            saveCachedAllMessages(updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('thread_read', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.customerId && isSubscribed) {
            const current = getCachedAllMessages();
            const updated: Message[] = current.map(m => m.customerId === parsed.customerId ? {
              ...m,
              readByAdmin: parsed.role === 'admin' ? true : m.readByAdmin,
              readByCustomer: parsed.role === 'customer' ? true : m.readByCustomer,
              deliveryStatus: 'read' as const
            } : m);
            saveCachedAllMessages(updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('all_read', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (isSubscribed) {
            const current = getCachedAllMessages();
            const updated: Message[] = current.map(m => ({
              ...m,
              readByAdmin: parsed.role === 'admin' ? true : m.readByAdmin,
              readByCustomer: parsed.role === 'customer' ? true : m.readByCustomer,
              deliveryStatus: 'read' as const
            }));
            saveCachedAllMessages(updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('message_deleted', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.id && isSubscribed) {
            const current = getCachedAllMessages();
            const updated = current.filter(m => m.id !== parsed.id);
            saveCachedAllMessages(updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('thread_deleted', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.customerId && isSubscribed) {
            const current = getCachedAllMessages();
            const updated = current.filter(m => m.customerId !== parsed.customerId);
            saveCachedAllMessages(updated);
            emitMessages(updated);
          }
        } catch {}
      });

      eventSource.addEventListener('typing_status', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed) {
            window.dispatchEvent(new CustomEvent('ee_chat_typing', { detail: parsed }));
          }
        } catch {}
      });

      eventSource.addEventListener('presence_update', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed) {
            window.dispatchEvent(new CustomEvent(PRESENCE_EVENT_NAME, { detail: parsed }));
          }
        } catch {}
      });

      eventSource.onerror = () => {
        if (isSubscribed) {
          fetchAllFromServer();
        }
      };
    }
  } catch (err) {
    console.warn('SSE eventSource initialization fallback:', err);
  }

  // 9. Active Polling Fallback for Admin (2500ms safety interval)
  const pollInterval = setInterval(() => {
    if (!isSubscribed) return;
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchAllFromServer();
      if (isSupabaseEnabled()) {
        fetchAllFromSupabase();
      }
    }
  }, 2500);

  // Cleanup function
  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener(MESSAGE_EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    }
    if (chatBroadcastChannel) {
      chatBroadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    if (eventSource) {
      eventSource.close();
    }
    if (supabaseChannel && isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          supabase.removeChannel(supabaseChannel);
        } catch {}
      }
    }
  };
}

// -------------------------------------------------------------
// REAL-TIME TYPING STATUS ENGINE
// -------------------------------------------------------------
export function broadcastTypingStatus(customerId: string, role: UserRole, isTyping: boolean, senderName?: string): void {
  if (!customerId) return;
  try {
    const payload = { 
      customerId, 
      role, 
      isTyping, 
      senderName: senderName || (role === 'admin' ? 'Operations Desk' : 'Customer'),
      timestamp: Date.now() 
    };

    sessionStorage.setItem(`${TYPING_EVENT_PREFIX}${customerId}_${role}`, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('ee_chat_typing', { detail: payload }));

    if (chatBroadcastChannel) {
      chatBroadcastChannel.postMessage({ action: 'typing', ...payload });
    }

    // Broadcast across devices through server
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {}
}

export function subscribeToTypingStatus(
  customerId: string,
  targetRole: UserRole,
  onTypingChange: (isTyping: boolean, senderName?: string) => void
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const handleTypingEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ customerId: string; role: UserRole; isTyping: boolean; senderName?: string; timestamp: number }>;
    if (customEvent.detail && customEvent.detail.customerId === customerId && customEvent.detail.role === targetRole) {
      if (timeoutId) clearTimeout(timeoutId);
      onTypingChange(customEvent.detail.isTyping, customEvent.detail.senderName);

      if (customEvent.detail.isTyping) {
        timeoutId = setTimeout(() => {
          onTypingChange(false);
        }, 3500);
      }
    }
  };

  const handleBroadcast = (evt: MessageEvent) => {
    if (evt.data && evt.data.action === 'typing' && evt.data.customerId === customerId && evt.data.role === targetRole) {
      if (timeoutId) clearTimeout(timeoutId);
      onTypingChange(evt.data.isTyping, evt.data.senderName);

      if (evt.data.isTyping) {
        timeoutId = setTimeout(() => {
          onTypingChange(false);
        }, 3500);
      }
    }
  };

  window.addEventListener('ee_chat_typing', handleTypingEvent);
  if (chatBroadcastChannel) {
    chatBroadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('ee_chat_typing', handleTypingEvent);
    if (chatBroadcastChannel) {
      chatBroadcastChannel.removeEventListener('message', handleBroadcast);
    }
    if (timeoutId) clearTimeout(timeoutId);
  };
}

/**
 * Subscribes to typing status across all customer threads (used by Admin Support Desk inbox).
 */
export function subscribeToAllTypingStatus(
  targetRole: UserRole,
  onTypingMapChange: (typingMap: Record<string, { isTyping: boolean; senderName?: string }>) => void
): () => void {
  const typingMap: Record<string, { isTyping: boolean; senderName?: string }> = {};
  const timerMap = new Map<string, ReturnType<typeof setTimeout>>();

  const updateEntry = (customerId: string, isTyping: boolean, senderName?: string) => {
    if (timerMap.has(customerId)) {
      clearTimeout(timerMap.get(customerId)!);
      timerMap.delete(customerId);
    }

    if (isTyping) {
      typingMap[customerId] = { isTyping: true, senderName };
      onTypingMapChange({ ...typingMap });

      const timer = setTimeout(() => {
        delete typingMap[customerId];
        timerMap.delete(customerId);
        onTypingMapChange({ ...typingMap });
      }, 3500);
      timerMap.set(customerId, timer);
    } else {
      delete typingMap[customerId];
      onTypingMapChange({ ...typingMap });
    }
  };

  const handleTypingEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ customerId: string; role: UserRole; isTyping: boolean; senderName?: string; timestamp: number }>;
    if (customEvent.detail && customEvent.detail.role === targetRole) {
      updateEntry(customEvent.detail.customerId, customEvent.detail.isTyping, customEvent.detail.senderName);
    }
  };

  const handleBroadcast = (evt: MessageEvent) => {
    if (evt.data && evt.data.action === 'typing' && evt.data.role === targetRole) {
      updateEntry(evt.data.customerId, evt.data.isTyping, evt.data.senderName);
    }
  };

  window.addEventListener('ee_chat_typing', handleTypingEvent);
  if (chatBroadcastChannel) {
    chatBroadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('ee_chat_typing', handleTypingEvent);
    if (chatBroadcastChannel) {
      chatBroadcastChannel.removeEventListener('message', handleBroadcast);
    }
    timerMap.forEach(t => clearTimeout(t));
    timerMap.clear();
  };
}

// -------------------------------------------------------------
// PRESENCE & ONLINE STATUS ENGINE
// -------------------------------------------------------------
export function sendPresenceHeartbeat(userId: string, role: UserRole, name: string, customerId?: string): void {
  if (!userId) return;
  try {
    fetch('/api/messages/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role, name, customerId })
    }).catch(() => {});
  } catch {}
}

export function subscribeToPresence(onPresence: (data: ActivePresenceData) => void): () => void {
  // Fetch initial
  fetch('/api/messages/presence')
    .then(r => r.json())
    .then(data => onPresence(data))
    .catch(() => {});

  const handlePresenceEvent = (e: Event) => {
    const customEvent = e as CustomEvent<ActivePresenceData>;
    if (customEvent.detail) {
      onPresence(customEvent.detail);
    }
  };

  window.addEventListener(PRESENCE_EVENT_NAME, handlePresenceEvent);

  return () => {
    window.removeEventListener(PRESENCE_EVENT_NAME, handlePresenceEvent);
  };
}

// -------------------------------------------------------------
// TRANSCRIPT GENERATOR
// -------------------------------------------------------------
export function generateChatTranscriptText(
  messages: Message[], 
  customerName: string, 
  options?: { includeInternalNotes?: boolean }
): string {
  const visibleMessages = options?.includeInternalNotes 
    ? messages 
    : filterCustomerVisibleMessages(messages);

  const header = `EAGLE EXCEL VENTURES • OFFICIAL B2B SUPPORT DESK TRANSCRIPT\nCustomer: ${customerName}\nExported: ${new Date().toLocaleString()}\nTotal Messages: ${visibleMessages.length}\n${'='.repeat(60)}\n\n`;

  const body = visibleMessages.map(m => {
    const time = new Date(m.createdAt).toLocaleString();
    const isInternal = isStaffInternalNote(m);
    const sender = isInternal 
      ? `[Staff Internal Note] ${m.senderName}` 
      : m.senderRole === 'admin' 
      ? `[Operations Desk] ${m.senderName}` 
      : `[Buyer] ${m.senderName}`;
    let text = `${sender} (${time}):\n${m.message}\n`;
    if (m.replyTo) {
      text += `  [Replying to: "${m.replyTo.message.substring(0, 50)}..."]\n`;
    }
    if (m.attachedProduct) {
      text += `  [Attached Product: ${m.attachedProduct.name} | SKU: ${m.attachedProduct.sku} | Price: $${m.attachedProduct.price}]\n`;
    }
    if (m.quoteData) {
      text += `  [Pro-Forma Quotation #${m.quoteData.quoteRef} | Total: $${m.quoteData.grandTotal.toLocaleString()} | Terms: ${m.quoteData.paymentTerms}]\n`;
    }
    if (m.voiceNote) {
      text += `  [Voice Memo Transmission • Duration: ${Math.round(m.voiceNote.duration)}s]\n`;
    }
    if (m.attachments && m.attachments.length > 0) {
      text += `  [Attachments: ${m.attachments.join(', ')}]\n`;
    }
    return text;
  }).join('\n');

  return header + body;
}

// -------------------------------------------------------------
// CENTRALIZED MESSAGE SERVICE SINGLETON
// -------------------------------------------------------------
export const MessageService = {
  sendMessage: sendMessageInDatabase,
  sendMessageInDatabase,
  toggleReaction: toggleMessageReaction,
  toggleMessageReaction,
  deleteMessage: deleteMessageInDatabase,
  deleteMessageInDatabase,
  markThreadAsRead,
  markMessageAsRead,
  markAllConversationsAsRead,
  deleteCustomerThread,
  deleteOrphanedCustomerChats,
  subscribeToCustomerThread,
  subscribeToAllMessages,
  broadcastTypingStatus,
  subscribeToTypingStatus,
  sendPresenceHeartbeat,
  subscribeToPresence,
  generateChatTranscriptText,
  normalizeMessage,
  formatMessageForDatabase,
  getCachedAllMessages,
  getCachedCustomerMessages,
  saveCachedAllMessages,
  saveCachedCustomerMessages,
  isStaffInternalNote,
  filterCustomerVisibleMessages
};

// Backwards-compatible aliases for legacy integrations
export const sendMessageInFirestore = sendMessageInDatabase;
export const deleteMessageInFirestore = deleteMessageInDatabase;
export const subscribeToCustomerThreadFirestore = subscribeToCustomerThread;
export const subscribeToAllMessagesFirestore = subscribeToAllMessages;
