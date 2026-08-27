import React, { useEffect, useRef } from 'react';
import { 
  User as UserIcon, 
  Package, 
  Heart, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Building2, 
  ChevronRight, 
  LogIn, 
  UserPlus, 
  Truck,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PageView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';

interface AccountMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: PageView) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenSettings: () => void;
}

export const AccountMenuDropdown: React.FC<AccountMenuDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenAuth,
  onOpenSettings
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { wishlistCount } = useWishlist();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const triggerBtn = document.getElementById('nav-account-dropdown-btn');
      if (triggerBtn && triggerBtn.contains(e.target as Node)) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // 1. LOGGED IN STATE
  // -------------------------------------------------------------
  if (currentUser) {
    return (
      <div
        ref={dropdownRef}
        id="desktop-account-menu-dropdown"
        className="absolute right-0 top-full mt-2 w-80 max-h-[calc(100vh-80px)] overflow-y-auto bg-white/95 dark:bg-[#141414]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3.5 z-[120] animate-fadeIn text-slate-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User Card Header */}
        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F27D26] text-black flex items-center justify-center font-black text-sm shrink-0 shadow-xs border border-white/20">
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
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
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

        {/* Account Links */}
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
              <span>My Profile</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
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
              <span>My Orders</span>
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
              <span>Wishlist & Saved Items</span>
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
              onOpenSettings();
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200" />
              <span>Account Settings</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Admin Portal Section (For Admin Accounts) */}
        {isAdmin && (
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#F27D26] px-3 mb-1">
              Admin Portal
            </p>

            <button
              onClick={() => {
                onNavigate('admin');
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#F27D26]/10 hover:bg-[#F27D26]/20 border border-[#F27D26]/25 flex items-center justify-between text-xs font-bold text-[#F27D26] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#F27D26]" />
                <span>Admin Operations Console</span>
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
          </div>
        )}

        {/* Sign Out */}
        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
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
    );
  }

  // -------------------------------------------------------------
  // 2. GUEST (NOT LOGGED IN) STATE
  // -------------------------------------------------------------
  return (
    <div
      ref={dropdownRef}
      id="desktop-account-menu-dropdown-guest"
      className="absolute right-0 top-full mt-2 w-76 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3.5 z-[120] animate-fadeIn text-slate-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 bg-gradient-to-br from-amber-500/10 to-[#F27D26]/10 dark:from-[#F27D26]/15 dark:to-transparent rounded-xl border border-[#F27D26]/20 mb-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#F27D26]" />
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
            Wholesale Buyer Portal
          </h4>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
          Sign in to unlock discounted tiered pricing, invoice downloads, and real-time cargo tracking.
        </p>
      </div>

      <div className="space-y-1.5">
        <button
          onClick={() => {
            onOpenAuth('login');
            onClose();
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black text-xs font-black flex items-center justify-between shadow-xs transition-transform hover:scale-[1.01] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <LogIn className="w-4 h-4 text-black" />
            <span>Sign In</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-black" />
        </button>

        <button
          onClick={() => {
            onOpenAuth('signup');
            onClose();
          }}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#F27D26]" />
            <span>Create Account</span>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#F27D26]/15 text-[#e06d1a] dark:text-[#F27D26]">
            Register
          </span>
        </button>

        <button
          onClick={() => {
            onNavigate('orders');
            onClose();
          }}
          className="w-full py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-400" />
            <span>Track My Order</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

    </div>
  );
};
