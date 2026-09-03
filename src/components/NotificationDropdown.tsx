import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  BellRing,
  BellOff,
  Check, 
  CheckCheck, 
  Trash2, 
  Package, 
  Truck, 
  FileText, 
  MessageSquare, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  ExternalLink,
  X,
  Megaphone,
  Tag,
  Copy,
  Shield,
  Star,
  Filter,
  LogIn
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { AppNotification, PageView } from '../types';
import { isImportantNotification } from '../services/notificationService';

interface NotificationDropdownProps {
  onNavigate?: (view: PageView) => void;
  onOpenAuth?: () => void;
  className?: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNavigate, onOpenAuth, className = '' }) => {
  const { currentUser } = useAuth();
  const { 
    notifications,
    importantNotifications,
    unreadCount, 
    soundEnabled, 
    setSoundEnabled, 
    importantOnly,
    setImportantOnly,
    browserPermission,
    browserNotificationsEnabled,
    setBrowserNotificationsEnabled,
    requestBrowserPermission,
    markAsRead, 
    markAllAsRead, 
    markThreadNotificationsAsRead,
    deleteNotification, 
    clearAll 
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'important' | 'orders' | 'rfqs' | 'unread' | 'all'>('important');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);

  // Background blur and key dismissal when notification dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    // Close on Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Close when clicking outside dropdown wrapper
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sourceNotifications = importantOnly ? importantNotifications : notifications;

  const filteredNotifications = sourceNotifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'important') return isImportantNotification(n);
    if (filter === 'orders') return n.type === 'order_status' || n.type === 'new_order' || n.type === 'customs_update';
    if (filter === 'rfqs') return n.type === 'rfq_submission' || n.type === 'new_message';
    return true;
  });

  const getNotificationIcon = (notif: AppNotification) => {
    switch (notif.type) {
      case 'promotional':
        return <Tag className="w-4 h-4 text-amber-500" />;
      case 'broadcast':
        return <Megaphone className="w-4 h-4 text-[#F27D26]" />;
      case 'order_status':
      case 'new_order':
        return <Truck className="w-4 h-4 text-emerald-500" />;
      case 'rfq_submission':
        return <FileText className="w-4 h-4 text-[#F27D26]" />;
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'customs_update':
        return <ShieldCheck className="w-4 h-4 text-amber-500" />;
      default:
        return <Package className="w-4 h-4 text-zinc-400" />;
    }
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    
    // If this is a chat message notification, mark all related notifications as read
    if (notif.type === 'new_message' || notif.targetView === 'support' || notif.targetView === 'admin') {
      if (notif.referenceId) {
        markThreadNotificationsAsRead(notif.referenceId);
      }
      if (typeof window !== 'undefined') {
        if (notif.targetView === 'support') {
          window.dispatchEvent(new CustomEvent('ee_open_support_chat', { detail: { customerId: notif.referenceId } }));
        } else if (notif.targetView === 'admin') {
          window.dispatchEvent(new CustomEvent('ee_open_admin_chat', { detail: { customerId: notif.referenceId } }));
        }
      }
    }

    if (notif.targetView && onNavigate) {
      onNavigate(notif.targetView);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Full-Screen Backdrop Overlay with Blur & Interaction Lock (positioned below header) */}
      {isOpen && (
        <div
          id="notification-backdrop-overlay"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 top-14 sm:top-16 z-[95] bg-black/40 dark:bg-black/60 backdrop-blur-xs transition-all duration-200 animate-fadeIn cursor-pointer"
        />
      )}

      <div className={`relative ${className} ${isOpen ? 'z-[110]' : 'z-20'}`} id="notification-dropdown-wrapper" ref={dropdownRef}>
        {/* Bell / Close Trigger Button */}
        <button
          id="notification-bell-btn"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close notifications" : "View notifications"}
          aria-expanded={isOpen}
          title={isOpen ? "Close notifications (Exit)" : "View notifications"}
          className={`relative p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center group shrink-0 ${
            isOpen
              ? 'bg-[#F27D26]/20 text-[#F27D26] ring-2 ring-[#F27D26]/50 shadow-md z-50'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
          }`}
        >
          {isOpen ? (
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-[#F27D26] stroke-[2.5] transition-transform animate-scaleUp" />
          ) : (
            <>
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:rotate-12 text-slate-700 dark:text-zinc-200" />
              
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] sm:h-5 sm:min-w-[20px] px-0.5 sm:px-1 items-center justify-center rounded-full bg-[#F27D26] text-[9px] sm:text-[10px] font-black text-black ring-1 sm:ring-2 ring-white dark:ring-[#121212] animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </>
          )}
        </button>

        {/* Notification Dropdown Panel */}
        {isOpen && (
          <div 
            ref={dropdownPanelRef}
            id="notification-dropdown-panel"
            className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-sm sm:max-w-md rounded-2xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/10 shadow-2xl z-[120] overflow-hidden animate-dropdownSlideDown ring-1 ring-black/10 dark:ring-white/10"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#1a1a1a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
                </div>
                {currentUser && unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F27D26]/20 text-[#F27D26]">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {currentUser && (
                  <>
                    {/* Anti-Spam Important-Only Toggle Button */}
                    <button
                      id="toggle-important-only-btn"
                      type="button"
                      onClick={() => setImportantOnly(!importantOnly)}
                      title={importantOnly ? "Spam Filter Active (Important only)" : "Show all notifications"}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        importantOnly 
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">{importantOnly ? 'Spam Shield' : 'All'}</span>
                    </button>

                    {/* Browser Push Notification Toggle */}
                    {browserPermission !== 'unsupported' && (
                      <button
                        id="toggle-browser-push-btn"
                        type="button"
                        onClick={() => {
                          if (browserPermission === 'default') {
                            requestBrowserPermission();
                          } else if (browserPermission === 'granted') {
                            setBrowserNotificationsEnabled(!browserNotificationsEnabled);
                          }
                        }}
                        title={
                          browserPermission === 'denied'
                            ? 'Browser notifications blocked in browser settings'
                            : browserNotificationsEnabled && browserPermission === 'granted'
                            ? 'Browser push alerts active (Click to disable)'
                            : 'Enable browser desktop/mobile push alerts'
                        }
                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          browserNotificationsEnabled && browserPermission === 'granted'
                            ? 'text-[#F27D26] hover:bg-[#F27D26]/10'
                            : browserPermission === 'denied'
                            ? 'text-slate-300 dark:text-zinc-600 opacity-60 cursor-not-allowed'
                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        {browserNotificationsEnabled && browserPermission === 'granted' ? (
                          <BellRing className="w-4 h-4" />
                        ) : (
                          <BellOff className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Sound Toggle */}
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
                      className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        soundEnabled 
                          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10' 
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    {/* Mark All As Read */}
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllAsRead()}
                        title="Mark all as read"
                        className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!currentUser ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 text-[#F27D26] flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Sign in to view notifications</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Log in to track your wholesale shipments, real-time customs clearance, and direct freight messages.
                </p>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAuth();
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#F27D26] text-black font-extrabold text-xs shadow-xs hover:bg-[#e06d1a] transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Register</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Browser Push Notification Prompt Banner if not enabled */}
                {browserPermission === 'default' && (
                  <div className="px-3.5 py-2 bg-gradient-to-r from-[#F27D26]/10 to-amber-500/10 border-b border-[#F27D26]/20 flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
                      <BellRing className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                      <span>Enable browser alerts for live order status changes</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => requestBrowserPermission()}
                      className="px-2.5 py-1 rounded-md bg-[#F27D26] text-black font-extrabold text-[10px] hover:bg-[#e06d1a] transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      Turn On
                    </button>
                  </div>
                )}

                {/* Anti-Spam Security Info Banner */}
                {importantOnly && (
                  <div className="px-3.5 py-1.5 bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/15 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      Only important order, cargo & RFQ alerts are sent.
                    </span>
                    <button 
                      type="button"
                      onClick={() => setImportantOnly(false)} 
                      className="text-[10px] underline hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
                    >
                      Show all
                    </button>
                  </div>
                )}

                {/* Filter Pills */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#18181b] overflow-x-auto text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFilter('important')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                      filter === 'important'
                        ? 'bg-[#F27D26] text-black font-extrabold'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current" /> Important ({importantNotifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('orders')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      filter === 'orders'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    Orders & Cargo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('rfqs')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      filter === 'rfqs'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    RFQs / Inquiries
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('unread')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      filter === 'unread'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      filter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                </div>

                {/* Notification List */}
                <div className="max-h-80 sm:max-h-96 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-white/5">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <Bell className="w-5 h-5 opacity-40" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">No notifications found</p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      {filter === 'unread' ? 'You are all caught up!' : 'Actionable freight alerts and order updates will appear here.'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const isItemImportant = isImportantNotification(notif);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                          !notif.read ? 'bg-[#F27D26]/5 dark:bg-[#F27D26]/5' : ''
                        }`}
                      >
                        {/* Type Icon Badge */}
                        <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0">
                          {getNotificationIcon(notif)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {notif.title}
                              </span>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-[#F27D26] shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                              {formatRelativeTime(notif.timestamp)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>

                          {/* Promo Code & Discount Chip */}
                          {(notif.promoCode || notif.discountPercentage) && (
                            <div className="mt-2 flex items-center gap-2">
                              {notif.promoCode && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyCode(e, notif.promoCode!)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-[#F27D26] font-mono text-[10px] font-bold border border-amber-500/20 cursor-pointer"
                                  title="Click to copy code"
                                >
                                  {copiedCode === notif.promoCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  <span>{notif.promoCode}</span>
                                </button>
                              )}
                              {notif.discountPercentage && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  {notif.discountPercentage}% OFF
                                </span>
                              )}
                            </div>
                          )}

                          {/* Footer Tags & Action */}
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isItemImportant && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-current" /> Important
                                </span>
                              )}
                              {notif.country && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                                  {notif.country === 'nigeria' ? '🇳🇬 Nigeria' : notif.country === 'cameroon' ? '🇨🇲 Cameroon' : '🌐 Cross-Border'}
                                </span>
                              )}
                              {notif.status && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  {notif.status}
                                </span>
                              )}
                              {notif.actionLabel && (
                                <span className="text-[10px] font-bold text-[#F27D26] hover:underline flex items-center gap-0.5">
                                  {notif.actionLabel} <ArrowRight className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!notif.read && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif.id);
                                  }}
                                  title="Mark as read"
                                  className="p-1 text-slate-400 hover:text-emerald-500 rounded transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notif.id);
                                }}
                                title="Delete notification"
                                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Actions */}
              {notifications.length > 0 && (
                <div className="p-2.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[11px] font-semibold text-slate-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>

                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Anti-Spam Active
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
};

