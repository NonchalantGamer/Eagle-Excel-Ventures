import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  User as UserIcon, 
  Package, 
  MessageSquare, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Building2, 
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  ShoppingCart,
  Heart
} from 'lucide-react';
import { PageView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

interface ProfileMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: PageView) => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  unreadSupportCount?: number;
}

export const ProfileMenuDropdown: React.FC<ProfileMenuDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenSettings,
  onOpenSupport,
  unreadSupportCount = 0
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { setIsCartOpen, itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadSupportCount);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 70, right: 16 });

  useEffect(() => {
    setLiveUnreadCount(unreadSupportCount);
  }, [unreadSupportCount]);

  useEffect(() => {
    const handleUnread = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      if (customEvent.detail && typeof customEvent.detail.count === 'number') {
        setLiveUnreadCount(customEvent.detail.count);
      }
    };
    window.addEventListener('ee_customer_unread_count', handleUnread);
    return () => window.removeEventListener('ee_customer_unread_count', handleUnread);
  }, []);

  // Calculate coordinates based on the profile button location
  useEffect(() => {
    if (isOpen) {
      const updatePosition = () => {
        const btn = document.getElementById('header-desktop-profile-btn');
        if (btn) {
          const rect = btn.getBoundingClientRect();
          setCoords({
            top: rect.bottom + 8,
            right: Math.max(16, window.innerWidth - rect.right)
          });
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  // Background blur, movement unreactiveness, and focus lock when menu is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      // Lock body scrolling and freeze background movement
      document.body.classList.add('menu-open-locked');

      // Blur background page content and disable all background interactions
      const mainContent = document.getElementById('main-content-area');
      const footer = document.querySelector('footer');

      if (mainContent) {
        mainContent.classList.add('menu-backdrop-blurred');
      }
      if (footer) {
        footer.classList.add('menu-backdrop-blurred');
      }

      // Close on Escape key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.classList.remove('menu-open-locked');
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
        if (mainContent) {
          mainContent.classList.remove('menu-backdrop-blurred');
        }
        if (footer) {
          footer.classList.remove('menu-backdrop-blurred');
        }
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const triggerBtn = document.getElementById('header-desktop-profile-btn');
      if (triggerBtn && triggerBtn.contains(e.target as Node)) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser) return null;

  const content = (
    <div className="fixed inset-0 z-[99999] pointer-events-none" id="portal-profile-menu-container">
      {/* Focus Backdrop with Frosted Blur & Click-to-Dismiss (starts below header) */}
      <div
        id="profile-menu-backdrop-overlay"
        onClick={onClose}
        className="fixed inset-0 top-14 sm:top-16 z-40 bg-black/60 dark:bg-black/80 backdrop-blur-xl transition-all duration-300 animate-fadeIn cursor-pointer pointer-events-auto"
        aria-label="Close profile menu"
      />

      {/* Profile Menu Popover Dropdown Container - Fixed to Viewport */}
      <div
        ref={dropdownRef}
        id="desktop-profile-menu-dropdown"
        style={{
          top: `${coords.top}px`,
          right: `${coords.right}px`
        }}
        className="fixed w-80 sm:w-88 max-h-[calc(100vh-100px)] overflow-y-auto bg-white/95 dark:bg-[#141414]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3.5 z-50 animate-scaleUp text-slate-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User Info Header */}
        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#F27D26] text-black flex items-center justify-center font-black text-base shrink-0 shadow-xs border border-white/20">
              {userProfile?.photoURL || userProfile?.avatarUrl ? (
                <img
                  src={userProfile.photoURL || userProfile.avatarUrl}
                  alt={userProfile.displayName || 'Profile'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {userProfile?.displayName || 'Wholesale Buyer'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                {currentUser.email}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                  isAdmin 
                    ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40' 
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                }`}>
                  {isAdmin ? '🛡️ Administrator' : '🏢 Verified Wholesale Buyer'}
                </span>
              </div>
            </div>
          </div>

          {userProfile?.companyName && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400">
              <Building2 className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="truncate font-semibold">{userProfile.companyName}</span>
            </div>
          )}
        </div>

        {/* Main Account Links */}
        <div className="space-y-1">
          <button
            onClick={() => {
              onNavigate('profile');
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <UserIcon className="w-4 h-4 text-[#F27D26]" />
              <span>My Account & Business Profile</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => {
              onNavigate('wishlist');
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              <span>Saved Products & Wishlist</span>
            </div>
            {wishlistCount > 0 ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                {wishlistCount}
              </span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>

          <button
            onClick={() => {
              onNavigate('orders');
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-[#F27D26]" />
              <span>My Orders & Shipments</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => {
              onOpenSupport();
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-[#F27D26]" />
              <span>Live 24/7 B2B Support Channel</span>
            </div>
            {liveUnreadCount > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                  {liveUnreadCount}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        </div>

        {/* Admin Specific Links */}
        {isAdmin && (
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#F27D26] px-3 mb-1">
              Operations & Control
            </p>

            <button
              onClick={() => {
                onNavigate('admin');
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#F27D26]/10 hover:bg-[#F27D26]/20 border border-[#F27D26]/20 flex items-center justify-between text-xs font-bold text-[#F27D26] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#F27D26]" />
                <span>Admin Operations Portal</span>
              </div>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-[#F27D26]/20">
                Console
              </span>
            </button>

            <button
              onClick={() => {
                onNavigate('manage-products');
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>Manage Products Database</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => {
                setIsCartOpen(true);
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4 text-amber-500" />
                <span>Procurement Cart</span>
              </div>
              {itemCount > 0 ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F27D26] text-black">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
          </div>
        )}

        {/* Preferences & Sign Out */}
        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/5 space-y-1">
          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Preferences & Theme Settings</span>
            </div>
          </button>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 flex items-center justify-between text-xs font-bold transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
};
