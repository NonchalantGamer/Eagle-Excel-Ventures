export type UserRole = 'admin' | 'customer';

export type PageView = 'home' | 'catalog' | 'product' | 'supply-chain' | 'rfq' | 'orders' | 'about' | 'admin' | 'docs' | 'profile' | 'manage-products' | 'support' | 'wishlist';

export interface WishlistItem {
  product: Product;
  addedAt: string;
  notes?: string;
}

export interface RFQSubmission {
  id: string;
  refNumber: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  category: string;
  productName: string;
  specs?: string;
  quantity: number;
  unit: string;
  volumeType: string;
  destinationCountry: 'nigeria' | 'cameroon';
  destinationCity: string;
  shippingMethod: 'sea_fcl' | 'sea_lcl' | 'air_express' | 'warehouse_pickup';
  preferredCurrency: string;
  paymentTerm: 'wire_transfer' | 'invoice_net30' | 'cod' | 'letter_of_credit';
  targetLandedPrice?: number;
  notes?: string;
  status: 'pending' | 'reviewed' | 'quoted' | 'closed';
  createdAt: string;
}

export interface UserAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface UserProfile {
  id: string;
  uid?: string; // alias for id
  email: string;
  displayName: string;
  companyName?: string;
  phone?: string;
  photoURL?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  country?: string;
  role: UserRole;
  title?: string;
  taxId?: string;
  preferredPaymentMethod?: 'wire_transfer' | 'invoice_net30' | 'credit_card' | 'cod';
  notificationsEnabled?: boolean;
  importantOnlyNotifications?: boolean;
  address?: UserAddress;
  createdAt: string;
  updatedAt?: string;
  totalSpent?: number;
  ordersCount?: number;
  adminPreferences?: {
    lowStockThreshold?: number;
    currency?: string;
    autoInvoice?: boolean;
    emailAlerts?: boolean;
    auditLogs?: boolean;
    timezone?: string;
  };
}

export interface WholesaleTier {
  minQty: number;
  pricePerUnit: number;
  discountPercentage?: number;
}

export interface ResponsiveImageMap {
  original: string;
  webp320?: string;
  webp640?: string;
  webp1200?: string;
  thumbnail?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  price: number; // Base single unit price
  wholesaleTiers: WholesaleTier[]; // Tiered bulk discounts
  stock: number;
  minOrderQty: number; // Minimum Order Quantity (MOQ)
  moq?: number; // alias for minOrderQty
  unit: string; // e.g., "Case (24 pcs)", "Box (50 units)", "Pallet", "Piece"
  packagingUnit?: string; // alias for unit
  estimatedFreight?: number; // Admin-configured estimated freight shipping cost in USD
  freight?: number; // alias for estimatedFreight
  images: string[]; // URLs of product photos
  image?: string; // primary image alias
  responsiveImages?: ResponsiveImageMap[]; // Optimized WebP multi-size variants
  specs: Record<string, string>; // Technical specifications
  isFeatured?: boolean;
  rating?: number;
  reviewsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'flutterwave' | 'wire_transfer' | 'invoice_net30' | 'credit_card' | 'cod';

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  image: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  companyName?: string;
  phone?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax?: number;
  total: number;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod: 'flutterwave' | 'wire_transfer' | 'invoice_net30' | 'credit_card' | 'cod';
  paymentReference?: string;
  flwTransactionId?: string | number;
  paidAt?: string;
  currency?: string;
  shippingAddress: UserAddress;
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatAttachedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  image: string;
  images?: string[];
  category?: string;
  moq?: number;
  minOrderQty?: number;
  unit?: string;
  packagingUnit?: string;
}

export interface ChatQuoteItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ChatQuoteData {
  quoteRef: string;
  items: ChatQuoteItem[];
  grandTotal: number;
  totalAmount?: number;
  validDays: number;
  validityDays?: number;
  paymentTerms: string;
  freightTerms: string;
  notes?: string;
}

export interface Message {
  id: string;
  threadId: string;
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
  reactions?: Record<string, string[]>; // emoji => array of userIds
  isInternalNote?: boolean; // private admin operational note
  messageType?: 'text' | 'product_card' | 'quote_offer' | 'order_ref' | 'internal_note' | 'voice_note';
  readByAdmin: boolean;
  readByCustomer: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    senderRole: UserRole;
    message: string;
    messageType?: string;
  };
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface SupportThread {
  customerId: string;
  customerName: string;
  customerEmail?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCountAdmin: number;
  unreadCountCustomer: number;
  lastSenderRole?: UserRole;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedTierPrice: number;
  subtotal: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  itemCount?: number;
}

export type NotificationType = 
  | 'order_status' 
  | 'new_order' 
  | 'rfq_submission' 
  | 'new_message' 
  | 'system' 
  | 'customs_update'
  | 'inventory_alert'
  | 'broadcast'
  | 'promotional';

export interface BroadcastCampaign {
  id: string;
  title: string;
  message: string;
  type: 'promotional' | 'announcement' | 'catalog_update' | 'supply_chain' | 'urgent';
  targetAudience: 'all' | 'nigeria' | 'cameroon' | 'selected';
  targetUserIds?: string[];
  promoCode?: string;
  discountPercentage?: number;
  bannerImage?: string;
  actionLabel?: string;
  actionTargetView?: PageView;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientCount: number;
  sentAt: string;
  active: boolean;
  priority?: 'normal' | 'urgent';
}

export interface AppNotification {
  id: string;
  userId?: string; // target user ID, or 'all_admins' or 'customer'
  recipientRole?: UserRole | 'all';
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  referenceId?: string; // order ID, rfq ID, customer ID, broadcast ID
  actionUrl?: string;
  targetView?: PageView;
  status?: string; // e.g. 'shipped', 'delivered', 'pending'
  country?: 'nigeria' | 'cameroon' | 'china' | 'cross_border';
  promoCode?: string;
  discountPercentage?: number;
  priority?: 'normal' | 'urgent';
  importance?: 'critical' | 'high' | 'normal' | 'low';
  isImportant?: boolean;
  actionLabel?: string;
}

export interface OfflinePendingAction {
  id: string;
  type: 'cart_add' | 'cart_update' | 'cart_remove' | 'rfq_draft' | 'order_draft';
  payload: any;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
}

export type ProductAuditAction = 
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'CATALOG_SEEDED'
  | 'STOCK_ADJUSTED'
  | 'PRICE_CHANGED'
  | 'REALTIME_INSERT_RECEIVED'
  | 'REALTIME_UPDATE_RECEIVED'
  | 'REALTIME_DELETE_RECEIVED'
  | 'SSE_STREAM_SYNC'
  | 'DIAGNOSTIC_VERIFY'
  | 'SCHEMA_CACHE_RELOAD'
  | 'USER_ROLE_CHANGED'
  | 'ADMIN_PROMOTED'
  | 'ADMIN_REVOKED';

export type AuditLogSeverity = 'info' | 'success' | 'warning' | 'error';
export type AuditLogSource = 'admin_ui' | 'supabase_realtime' | 'sse_stream' | 'server_api' | 'local_cache' | 'system';

export interface ProductAuditDiff {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface RoleChangeLog {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  targetUserId: string;
  targetUserName?: string;
  targetUserEmail?: string;
  previousRole: UserRole;
  newRole: UserRole;
  reason?: string;
  authMethod?: string;
}

export interface ProductAuditLog {
  id: string;
  timestamp: string;
  action: ProductAuditAction;
  severity: AuditLogSeverity;
  source: AuditLogSource;
  productId?: string;
  productName?: string;
  productSku?: string;
  category?: string;
  summary: string;
  details?: string;
  diffs?: ProductAuditDiff[];
  actorEmail?: string;
  actorRole?: string;
  adminId?: string;
  adminName?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  previousRole?: UserRole;
  newRole?: UserRole;
  payloadSnapshot?: any;
  syncLatencyMs?: number;
  clientMemoryCount?: number;
  serverCount?: number;
  supabaseCount?: number;
}

