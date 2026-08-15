import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  ShoppingCart, 
  MessageSquare, 
  ShieldCheck, 
  Trash2, 
  Megaphone, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Package, 
  Truck, 
  Copy, 
  Check, 
  Clock, 
  ArrowUpRight, 
  Activity, 
  ExternalLink,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { UserProfile, Order, Message } from '../../types';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../Toast';
import { useCurrency } from '../../context/CurrencyContext';

interface CustomerActivityDossierModalProps {
  user: UserProfile;
  orders: Order[];
  messages: Message[];
  currentUserId?: string;
  onClose: () => void;
  onToggleRole: (user: UserProfile) => Promise<void> | void;
  onDirectBroadcast: (userId: string) => void;
  onOpenChat: (customerId: string) => void;
  onViewOrder: (order: Order) => void;
  onDeleteUser: (userId: string, userName: string) => Promise<void>;
}

type TabType = 'activity' | 'orders' | 'messages' | 'profile';

interface ActivityItem {
  id: string;
  type: 'order' | 'message' | 'account' | 'quote';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  amount?: number;
  metadata?: any;
  orderRef?: Order;
}

export const CustomerActivityDossierModal: React.FC<CustomerActivityDossierModalProps> = ({
  user,
  orders,
  messages,
  currentUserId,
  onClose,
  onToggleRole,
  onDirectBroadcast,
  onOpenChat,
  onViewOrder,
  onDeleteUser
}) => {
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRoleToggling, setIsRoleToggling] = useState(false);

  // Lock body scroll and handle Escape key to close
  useModalFocusLock(true, onClose);

  // Filter orders and messages belonging to this customer
  const customerOrders = useMemo(() => {
    return orders.filter(o => {
      const matchId = o.userId && o.userId.toLowerCase() === user.id.toLowerCase();
      const matchEmail = o.customerEmail && user.email && o.customerEmail.toLowerCase() === user.email.toLowerCase();
      return matchId || matchEmail;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, user]);

  const customerMessages = useMemo(() => {
    return messages.filter(m => {
      const matchCustomerId = m.customerId && (
        m.customerId.toLowerCase() === user.id.toLowerCase() ||
        (user.email && m.customerId.toLowerCase() === user.email.toLowerCase())
      );
      const matchEmail = m.customerEmail && user.email && m.customerEmail.toLowerCase() === user.email.toLowerCase();
      return matchCustomerId || matchEmail;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages, user]);

  // Aggregate Customer Stats
  const stats = useMemo(() => {
    const totalOrders = customerOrders.length;
    const completedOrders = customerOrders.filter(o => o.status === 'delivered').length;
    const pendingOrders = customerOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const totalSpent = customerOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0) || (user.totalSpent || 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const totalInquiries = customerMessages.length;

    let tierLabel = 'New Wholesale Lead';
    let tierColor = 'text-slate-500 bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300';
    if (user.role === 'admin') {
      tierLabel = 'Executive Console Administrator';
      tierColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    } else if (totalSpent >= 10000 || totalOrders >= 5) {
      tierLabel = 'Tier 1 Enterprise Partner';
      tierColor = 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400';
    } else if (totalSpent > 0 || totalOrders > 0) {
      tierLabel = 'Verified Corporate Buyer';
      tierColor = 'text-[#F27D26] bg-[#F27D26]/10 border-[#F27D26]/30';
    }

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      totalSpent,
      averageOrderValue,
      totalInquiries,
      tierLabel,
      tierColor
    };
  }, [customerOrders, customerMessages, user]);

  // Build Comprehensive Chronological Activity Timeline
  const activities: ActivityItem[] = useMemo(() => {
    const feed: ActivityItem[] = [];

    // 1. Account Created Event
    if (user.createdAt) {
      feed.push({
        id: `act-acc-${user.id}`,
        type: 'account',
        title: 'Account Registered & Verified',
        description: `Profile established with email ${user.email} as ${user.role === 'admin' ? 'Administrator' : 'Wholesale Buyer'}`,
        timestamp: user.createdAt,
        status: 'registered'
      });
    }

    // 2. Orders Events
    customerOrders.forEach(order => {
      feed.push({
        id: `act-ord-${order.id}`,
        type: 'order',
        title: `Purchase Order Placed: ${order.orderNumber}`,
        description: `${order.items?.length || 1} product item(s) • Total: $${(order.total || 0).toLocaleString()} • Destination: ${order.shippingAddress?.city || 'Local Port'}`,
        timestamp: order.createdAt,
        status: order.status,
        amount: order.total,
        orderRef: order
      });
    });

    // 3. Messages & Inquiries Events
    customerMessages.forEach(msg => {
      let desc = msg.message;
      if (msg.quoteData) {
        desc = `Pro-Forma Quote ${msg.quoteData.quoteRef} generated (${formatPrice(msg.quoteData.grandTotal)})`;
      } else if (msg.attachedProduct) {
        desc = `Inquired about product: ${msg.attachedProduct.name}`;
      } else if (msg.attachedOrder) {
        desc = `Inquired regarding Order #${msg.attachedOrder.orderNumber}`;
      }

      feed.push({
        id: `act-msg-${msg.id}`,
        type: msg.quoteData ? 'quote' : 'message',
        title: msg.senderRole === 'admin' ? `Staff Sent Message (${msg.senderName})` : 'Customer Sent Support Inquiry',
        description: desc,
        timestamp: msg.createdAt,
        metadata: msg
      });
    });

    // Sort newest first
    return feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [user, customerOrders, customerMessages, formatPrice]);

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    showToast(`Copied ${fieldKey} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isSelf = Boolean(currentUserId && currentUserId === user.id);

  const handleDeleteConfirm = async () => {
    if (isSelf) {
      showToast('You cannot delete your own active administrator account.');
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteUser(user.id, user.displayName || user.email);
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete user account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRoleToggle = async () => {
    if (isSelf) {
      showToast('You cannot alter your own admin privileges from here.');
      return;
    }
    setIsRoleToggling(true);
    try {
      await onToggleRole(user);
    } finally {
      setIsRoleToggling(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'shipped':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'processing':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-zinc-400 border-slate-500/20';
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div 
        data-portal-modal="true"
        className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div 
          className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp text-slate-900 dark:text-zinc-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-dossier-title"
        >
          {/* TOP HEADER */}
          <div className="p-5 sm:p-6 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={user.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'}
                  alt={user.displayName}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-zinc-800 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 ${
                  user.role === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} title={user.role === 'admin' ? 'Administrator' : 'Active Customer'} />
              </div>

              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h2 id="customer-dossier-title" className="text-lg sm:text-xl font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{user.displayName || 'Wholesale Buyer'}</span>
                  </h2>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${stats.tierColor}`}>
                    {user.role === 'admin' ? '🛡️ Administrator' : '🏢 Wholesale Buyer'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
                    ID: {user.id.slice(0, 10)}...
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  <span className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#F27D26]" />
                    {user.companyName || 'Corporate Client'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {user.email}
                  </span>
                  {user.phone && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {user.phone}
                      </span>
                    </>
                  )}
                  {user.city && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {user.city}, {user.country || 'Nigeria'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => {
                  onDirectBroadcast(user.id);
                  onClose();
                }}
                className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#F27D26] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Send direct broadcast alert to this customer"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send Alert</span>
              </button>

              <button
                onClick={() => {
                  onOpenChat(user.id);
                  onClose();
                }}
                className="py-2 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Open live chat support thread"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Chat</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* KEY METRICS SUMMARY ROW */}
          <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100/50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 shrink-0">
            <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Verified Trade Spend</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                ${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Avg: ${Math.round(stats.averageOrderValue).toLocaleString()} / PO
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Purchase Orders</span>
                <ShoppingCart className="w-4 h-4 text-[#F27D26]" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-[#F27D26] mt-1">
                {stats.totalOrders} Placed
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                {stats.completedOrders} Delivered • {stats.pendingOrders} Active
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Support Inquiries</span>
                <MessageSquare className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {stats.totalInquiries} Messages
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Live Chat & RFQ threads
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Client Lifecycle</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-1.5 truncate">
                {stats.tierLabel}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Since {new Date(user.createdAt || Date.now()).toLocaleDateString([], { month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="px-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto shrink-0 bg-white dark:bg-[#121212]">
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'border-[#F27D26] text-[#F27D26]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Activity Timeline ({activities.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-[#F27D26] text-[#F27D26]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Purchase Orders ({customerOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'messages'
                  ? 'border-[#F27D26] text-[#F27D26]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Live Support & Quotes ({customerMessages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-[#F27D26] text-[#F27D26]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Corporate Info & Contact Card</span>
            </button>
          </div>

          {/* TAB CONTENT (SCROLLABLE) */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            
            {/* TAB 1: UNIFIED ACTIVITY TIMELINE */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Important Actions & Historical Timeline
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    {activities.length} Recorded Action{activities.length === 1 ? '' : 's'}
                  </span>
                </div>

                {activities.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">No activity recorded yet</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      This customer has registered their profile. Placed orders, inquiries, and role changes will appear here in chronological sequence.
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
                    {activities.map((act) => (
                      <div key={act.id} className="relative group">
                        {/* Timeline Node Icon */}
                        <div className={`absolute -left-6 top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-white dark:border-[#121212] shadow-xs ${
                          act.type === 'order' 
                            ? 'bg-[#F27D26] text-black font-bold'
                            : act.type === 'quote'
                            ? 'bg-emerald-500 text-white'
                            : act.type === 'message'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-white'
                        }`}>
                          {act.type === 'order' && <ShoppingCart className="w-3 h-3" />}
                          {act.type === 'quote' && <DollarSign className="w-3 h-3" />}
                          {act.type === 'message' && <MessageSquare className="w-3 h-3" />}
                          {act.type === 'account' && <ShieldCheck className="w-3 h-3" />}
                        </div>

                        {/* Activity Card */}
                        <div className="bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {act.title}
                              </span>
                              {act.status && (
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getOrderStatusBadge(act.status)}`}>
                                  {act.status}
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                              {new Date(act.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                            {act.description}
                          </p>

                          {/* Quick action for order events */}
                          {act.orderRef && (
                            <div className="pt-2 flex items-center gap-2">
                              <button
                                onClick={() => {
                                  onViewOrder(act.orderRef!);
                                  onClose();
                                }}
                                className="py-1 px-2.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-white/10 text-xs font-bold text-[#F27D26] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>Inspect Full Purchase Order</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PURCHASE ORDERS LIST */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Purchase Orders Placed by {user.displayName}
                  </h4>
                  <span className="text-xs font-semibold text-[#F27D26]">
                    Total: ${stats.totalSpent.toLocaleString()}
                  </span>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <ShoppingCart className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">No purchase orders placed yet</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                      This customer has not placed any formal purchase orders yet. You can construct a Pro-Forma Quote for them in Live Support.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map(order => (
                      <div 
                        key={order.id}
                        className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 hover:border-[#F27D26]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                              {order.orderNumber}
                            </span>
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getOrderStatusBadge(order.status)}`}>
                              {order.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(order.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {/* Items Breakdown summary */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {order.items?.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-white dark:bg-zinc-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs">
                                <img src={item.image} alt={item.name} className="w-4 h-4 object-cover rounded" />
                                <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate max-w-[140px]">{item.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">x{item.quantity}</span>
                              </div>
                            ))}
                            {(order.items?.length || 0) > 3 && (
                              <span className="text-xs text-slate-500 font-semibold">
                                +{(order.items?.length || 0) - 3} more items
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                            <span>Ship to: {order.shippingAddress?.city || 'Nigeria'}, {order.shippingAddress?.country || 'Nigeria'}</span>
                            {order.trackingNumber && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[#F27D26]">Tracking: {order.trackingNumber}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-white/5">
                          <div className="text-right">
                            <div className="text-base font-extrabold text-slate-900 dark:text-white">
                              ${(order.total || 0).toLocaleString()}
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{order.paymentMethod || 'Wire Transfer'}</span>
                          </div>

                          <button
                            onClick={() => {
                              onViewOrder(order);
                              onClose();
                            }}
                            className="py-1.5 px-3 rounded-xl bg-linear-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black font-extrabold text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <span>Inspect PO</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LIVE SUPPORT & MESSAGES */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Live Chat Transcripts & Support Desk History
                  </h4>
                  <button
                    onClick={() => {
                      onOpenChat(user.id);
                      onClose();
                    }}
                    className="py-1 px-2.5 rounded-lg bg-[#F27D26]/10 text-[#F27D26] hover:bg-[#F27D26]/20 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Open Live Chat Session</span>
                  </button>
                </div>

                {customerMessages.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <MessageSquare className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">No chat messages yet</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                      There are no support inquiries or chat messages exchanged with this buyer yet.
                    </p>
                    <button
                      onClick={() => {
                        onOpenChat(user.id);
                        onClose();
                      }}
                      className="mt-3 py-1.5 px-3.5 rounded-xl bg-[#F27D26] text-black font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Start Conversation</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {customerMessages.map(msg => (
                      <div 
                        key={msg.id}
                        className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                          msg.senderRole === 'admin'
                            ? 'bg-amber-500/10 border border-amber-500/20 text-slate-900 dark:text-zinc-100 ml-4'
                            : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className={msg.senderRole === 'admin' ? 'text-[#F27D26] font-bold' : 'text-slate-700 dark:text-zinc-300'}>
                              {msg.senderName} ({msg.senderRole === 'admin' ? 'Staff' : 'Customer'})
                            </span>
                          </span>
                          <span className="font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <p className="text-slate-800 dark:text-zinc-200 leading-relaxed">
                          {msg.message}
                        </p>

                        {msg.quoteData && (
                          <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between">
                            <span>Quotation #{msg.quoteData.quoteRef}</span>
                            <span>{formatPrice(msg.quoteData.grandTotal)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CORPORATE PROFILE & CONTACT INFO */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* General Profile Info */}
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#F27D26] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>Corporate Enterprise Profile</span>
                    </h4>

                    <div className="space-y-2 text-xs divide-y divide-slate-200/60 dark:divide-white/5">
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-400">Full Name:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">{user.displayName}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400">Company Name:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">{user.companyName || 'Corporate Wholesale Account'}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400">Corporate Email:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{user.email}</span>
                          <button
                            onClick={() => copyToClipboard(user.email, 'Email')}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            title="Copy email"
                          >
                            {copiedField === 'Email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400">Phone / WhatsApp:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{user.phone || 'Not provided'}</span>
                          {user.phone && (
                            <button
                              onClick={() => copyToClipboard(user.phone!, 'Phone')}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                              title="Copy phone"
                            >
                              {copiedField === 'Phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400">Account Role:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200 uppercase">{user.role}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400">Tax ID / RC:</span>
                        <span className="font-mono text-slate-800 dark:text-zinc-200">{user.taxId || 'Pending Verification'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sourcing Port & Delivery Address */}
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>Logistics & Delivery Port</span>
                    </h4>

                    <div className="space-y-2 text-xs divide-y divide-slate-200/60 dark:divide-white/5">
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-400">Destination City / Port:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">{user.city || 'Apapa Port, Lagos'}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400">Country:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">{user.country || 'Nigeria'}</span>
                      </div>

                      <div className="flex items-start justify-between pt-2">
                        <span className="text-slate-400">Full Delivery Street:</span>
                        <span className="font-medium text-slate-800 dark:text-zinc-200 text-right max-w-[200px]">
                          {user.address?.street || 'Central Wholesale Terminal'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400">Supabase User UUID:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]">{user.id}</span>
                          <button
                            onClick={() => copyToClipboard(user.id, 'User ID')}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            title="Copy UUID"
                          >
                            {copiedField === 'User ID' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400">Registered Date:</span>
                        <span className="text-slate-800 dark:text-zinc-200">
                          {new Date(user.createdAt || Date.now()).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sourcing Guidance Notice */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#F27D26]" />
                  <div>
                    <strong>Direct Enterprise Channel:</strong> Verified corporate wholesale clients receive tiered volume pricing, dedicated container consolidation at Apapa/Douala ports, and custom Pro-Forma billing.
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM ACTION FOOTER */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Left: Destructive Action (Delete Account) */}
            <div>
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isSelf}
                className={`py-2 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelf
                    ? 'border-slate-200 dark:border-white/10 text-slate-400 dark:text-zinc-600 cursor-not-allowed opacity-60'
                    : 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:border-rose-500/50'
                }`}
                title={isSelf ? 'You cannot delete your own active administrator account' : 'Permanently remove this account and profile from Supabase'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>

            {/* Right: Operational Actions */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={handleRoleToggle}
                disabled={isSelf || isRoleToggling}
                className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-xs transition-colors text-slate-700 dark:text-zinc-200 disabled:opacity-50 cursor-pointer"
                title={`Switch permissions to ${user.role === 'admin' ? 'Customer' : 'Admin'}`}
              >
                <span>Switch to {user.role === 'admin' ? 'Customer' : 'Admin'}</span>
              </button>

              <button
                onClick={() => {
                  onDirectBroadcast(user.id);
                  onClose();
                }}
                className="py-2 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#F27D26] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Push Alert</span>
              </button>

              <button
                onClick={() => {
                  onOpenChat(user.id);
                  onClose();
                }}
                className="py-2 px-4 rounded-xl bg-linear-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat with Buyer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Account"
        message={
          <div className="space-y-2 text-xs">
            <p>
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{user.displayName || user.email}</strong>?
            </p>
            <p className="text-slate-500 dark:text-zinc-400">
              This will remove their profile record from <code className="font-mono text-amber-500">public.profiles</code> and Supabase authentication. Historical order transaction records are maintained for audit integrity.
            </p>
          </div>
        }
        confirmText="Yes, Delete Account"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        icon="trash"
        id="delete-user-confirm-dialog"
      />
    </>,
    document.body
  );
};
