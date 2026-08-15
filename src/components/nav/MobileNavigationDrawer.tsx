import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShoppingCart, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck, 
  Package, 
  MessageSquare, 
  Layers, 
  ChevronRight, 
  Sparkles, 
  HelpCircle, 
  Truck,
  Sun,
  Moon,
  Settings,
  X,
  FileText,
  Cpu,
  Wrench,
  Factory,
  Check,
  PhoneCall,
  Globe2,
  ChevronDown
} from 'lucide-react';
import { Product, PageView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency, CURRENCIES, CurrencyCode } from '../../context/CurrencyContext';
import { getBrandLogo } from '../../constants/branding';
import { INITIAL_CATEGORIES } from '../../data/seedData';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  onOpenAuth: () => void;
  onOpenSupport: () => void;
  onOpenSettings: () => void;
  unreadSupportCount?: number;
  products?: Product[];
  onSelectCategoryFilter?: (category: string) => void;
}

export const MobileNavigationDrawer: React.FC<MobileNavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenSupport,
  onOpenSettings,
  unreadSupportCount = 0,
  products = [],
  onSelectCategoryFilter
}) => {
  const { currentUser, userProfile, isAdmin, role, logout } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const { isDark, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  const [activeSegment, setActiveSegment] = useState<'main' | 'categories' | 'account'>('main');
  const [expandedCategories, setExpandedCategories] = useState(true);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadSupportCount);

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

  // When the menu is open: blur the main page background, lock body scrolling and disable all movement
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      
      document.body.classList.add('menu-open-locked');
      
      // Target the main content area and footer to blur them
      const mainContent = document.getElementById('main-content-area');
      const footer = document.querySelector('footer');
      
      if (mainContent) {
        mainContent.classList.add('menu-backdrop-blurred');
      }
      if (footer) {
        footer.classList.add('menu-backdrop-blurred');
      }

      // Escape key to dismiss the menu
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

  if (!isOpen) return null;

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'electronics':
        return <Cpu className="w-4 h-4 text-amber-500" />;
      case 'building':
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'textiles':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'machinery':
        return <Factory className="w-4 h-4 text-emerald-500" />;
      case 'packaging':
        return <Package className="w-4 h-4 text-orange-500" />;
      default:
        return <Layers className="w-4 h-4 text-[#F27D26]" />;
    }
  };

  const navLinks: { id: PageView; label: string; icon: any; badge?: string }[] = [
    { id: 'home', label: 'Home Overview', icon: Building2 },
    { id: 'catalog', label: 'Wholesale Catalog', icon: Layers },
    { id: 'supply-chain', label: 'Supply Chain & Shipping', icon: Truck, badge: 'LTL/FCL' },
    { id: 'rfq', label: 'Custom Sourcing & RFQ', icon: FileText, badge: 'Quote in 60s' },
    { id: 'docs', label: 'Import Compliance & Docs', icon: HelpCircle },
    { id: 'about', label: 'About Eagle Excel', icon: UserIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="mobile-navigation-drawer">
      {/* Full Screen High-Focus Backdrop with Frosted Blur */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xl transition-all duration-300 animate-fadeIn z-40 cursor-pointer"
        aria-label="Close navigation menu"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 top-0 bottom-0 max-w-full flex pl-4 sm:pl-10 h-full h-screen h-[100dvh] z-50 pointer-events-none">
        <div className="w-screen max-w-sm sm:max-w-md bg-white dark:bg-[#121212] shadow-2xl flex flex-col h-full min-h-screen h-screen h-[100dvh] border-l border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 animate-slide-in-right pointer-events-auto">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0f0f0f] flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl brand-logo-badge flex items-center justify-center p-1 sm:p-1.5 shrink-0">
                <img 
                  src={getBrandLogo(isDark)} 
                  alt="Eagle Excel Ventures" 
                  className="w-full h-full object-contain brand-logo-img" 
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight font-serif text-slate-950 dark:text-white">
                    Eagle Excel
                  </span>
                  <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-[#F27D26]/15 text-[#e06d1a] dark:text-[#F27D26] border border-[#F27D26]/40">
                    B2B
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium block">
                  Wholesale & Supply Distribution
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Tab Controls */}
          <div className="px-4 pt-3 pb-1 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 shrink-0">
            <div className="grid grid-cols-3 gap-1 bg-slate-200/70 dark:bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveSegment('main')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                  activeSegment === 'main'
                    ? 'bg-white dark:bg-[#1a1a1a] text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pages
              </button>
              <button
                type="button"
                onClick={() => setActiveSegment('categories')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                  activeSegment === 'categories'
                    ? 'bg-white dark:bg-[#1a1a1a] text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Categories
              </button>
              <button
                type="button"
                onClick={() => setActiveSegment('account')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                  activeSegment === 'account'
                    ? 'bg-white dark:bg-[#1a1a1a] text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Account
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* SEGMENT 1: MAIN NAVIGATION PAGES */}
            {activeSegment === 'main' && (
              <div className="space-y-3 animate-fadeIn">
                {/* User Status / Sign In Mini-Bar */}
                {currentUser ? (
                  <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#F27D26] text-black font-extrabold text-xs flex items-center justify-center shrink-0">
                        {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {userProfile?.displayName || 'Wholesale Buyer'}
                        </p>
                        <span className="text-[10px] text-[#F27D26] font-semibold">
                          {isAdmin ? '🛡️ Administrator' : '🏢 Verified Wholesale Profile'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        onClose();
                      }}
                      className="py-1 px-2.5 rounded-lg text-xs font-bold bg-[#F27D26]/10 text-[#F27D26] hover:bg-[#F27D26]/20 transition-colors"
                    >
                      Profile
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-[#F27D26]/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Wholesale Buyer Access</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Unlock Tier 1-3 pricing & live freight</p>
                    </div>
                    <button
                      onClick={() => {
                        onOpenAuth();
                        onClose();
                      }}
                      className="py-1.5 px-3 rounded-xl bg-[#F27D26] text-black font-extrabold text-xs shadow-xs"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {/* Wholesale Cart Quick CTA */}
                <button
                  onClick={() => {
                    setIsCartOpen(true);
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-[#F27D26]/10 hover:bg-[#F27D26]/15 border border-[#F27D26]/30 flex items-center justify-between text-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#F27D26]">
                    <ShoppingCart className="w-4 h-4 text-[#F27D26]" />
                    <span>View Wholesale Cart</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#F27D26] text-black text-[10px] font-extrabold">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#F27D26] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* Primary Nav Page Buttons */}
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 mb-1">
                    Main Storefront
                  </p>

                  {navLinks.map((link) => {
                    const IconComp = link.icon;
                    const isActive = currentView === link.id;

                    return (
                      <button
                        key={link.id}
                        onClick={() => {
                          onNavigate(link.id);
                          onClose();
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl text-left flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#F27D26] text-black shadow-xs font-black'
                            : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComp className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#F27D26]'}`} />
                          <span>{link.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {link.badge && (
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                              isActive ? 'bg-black/20 text-black' : 'bg-[#F27D26]/15 text-[#e06d1a] dark:text-[#F27D26]'
                            }`}>
                              {link.badge}
                            </span>
                          )}
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Admin Quick Link if Admin */}
                {isAdmin && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#F27D26] px-2 mb-1">
                      Operations Management
                    </p>
                    <button
                      onClick={() => {
                        onNavigate('admin');
                        onClose();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/25 text-left flex items-center justify-between text-xs font-bold text-[#F27D26]"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-[#F27D26]" />
                        <span>Admin Operations Console</span>
                      </div>
                      <span className="text-[9px] uppercase font-black bg-[#F27D26] text-black px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SEGMENT 2: BROWSE BY CATEGORY */}
            {activeSegment === 'categories' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Product Categories ({products.length} Products)
                  </span>
                  <button
                    onClick={() => {
                      if (onSelectCategoryFilter) onSelectCategoryFilter('all');
                      onNavigate('catalog');
                      onClose();
                    }}
                    className="text-xs font-bold text-[#F27D26] hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2">
                  {INITIAL_CATEGORIES.map((cat) => {
                    const catCount = cat.id === 'all' 
                      ? products.length 
                      : products.filter(p => p.category === cat.id).length;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          if (onSelectCategoryFilter) onSelectCategoryFilter(cat.id);
                          onNavigate('catalog');
                          onClose();
                        }}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 transition-all flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {getCategoryIcon(cat.id)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#F27D26] transition-colors">
                              {cat.name}
                            </p>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                              {catCount} {catCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                            {cat.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Sourcing Banner */}
                <div className="p-3.5 bg-[#F27D26]/10 border border-[#F27D26]/30 rounded-2xl space-y-1 text-center">
                  <p className="text-xs font-bold text-[#F27D26]">Looking for unlisted inventory?</p>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                    We source full containers directly from verified global manufacturers.
                  </p>
                  <button
                    onClick={() => {
                      onNavigate('rfq');
                      onClose();
                    }}
                    className="mt-2 w-full py-2 rounded-xl bg-[#F27D26] text-black font-extrabold text-xs shadow-xs"
                  >
                    Submit Sourcing RFQ
                  </button>
                </div>
              </div>
            )}

            {/* SEGMENT 3: ACCOUNT & SETTINGS */}
            {activeSegment === 'account' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Account Details */}
                {currentUser ? (
                  <div className="p-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F27D26] text-black flex items-center justify-center font-extrabold text-sm shrink-0">
                        {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {userProfile?.displayName || 'Wholesale Buyer'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate font-mono">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          onClose();
                        }}
                        className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-slate-300 dark:hover:bg-white/20 transition-all text-center"
                      >
                        My Profile
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('orders');
                          onClose();
                        }}
                        className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-slate-300 dark:hover:bg-white/20 transition-all text-center"
                      >
                        My Orders
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setIsCartOpen(true);
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#F27D26]/10 hover:bg-[#F27D26]/20 border border-[#F27D26]/30 text-xs font-bold text-[#F27D26] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Procurement Cart</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full bg-[#F27D26] text-black text-[9px] font-extrabold">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Sign In to Your Account</p>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                      Manage orders, track freight containers, and submit custom quotations.
                    </p>
                    <button
                      onClick={() => {
                        onOpenAuth();
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#F27D26] text-black font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      Sign In / Register
                    </button>
                  </div>
                )}

                {/* Quick Theme Switcher */}
                <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                      {isDark ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                        {isDark ? 'Dark Theme' : 'Light Theme'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                        {isDark ? 'Night high contrast' : 'Crisp daylight view'}
                      </span>
                    </div>
                  </div>

                  <button
                    role="switch"
                    aria-checked={isDark}
                    onClick={toggleTheme}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F27D26] ${
                      isDark ? 'bg-[#F27D26]' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        isDark ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    >
                      {isDark ? <Moon className="w-3 h-3 text-[#F27D26]" /> : <Sun className="w-3 h-3 text-amber-500" />}
                    </span>
                  </button>
                </div>

                {/* Currency Quick Grid */}
                <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Wholesale Currency
                      </span>
                    </div>
                    <span className="text-[10px] text-[#F27D26] font-bold">
                      {CURRENCIES[currency].symbol} {currency}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCurrency(code)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          currency === code
                            ? 'bg-[#F27D26] text-black shadow-xs font-extrabold'
                            : 'bg-white dark:bg-white/10 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/15'
                        }`}
                      >
                        <span>{CURRENCIES[code].flag}</span>
                        <span>{code}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Support & Settings Buttons */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onOpenSupport();
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 transition-all cursor-pointer"
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
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onOpenSettings();
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>App Preferences & Settings</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {currentUser && (
                    <button
                      onClick={() => {
                        logout();
                        onClose();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 flex items-center justify-between text-xs font-bold transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </div>
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* Wholesale Logistics Guarantee Footer Card */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1 text-[11px] text-slate-600 dark:text-zinc-400">
              <div className="font-bold text-slate-900 dark:text-zinc-200 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Eagle Excel Logistics SLA</span>
              </div>
              <p className="text-[10px]">
                Free freight on orders &gt; $1,500. Lagos & Douala direct warehouse fulfillment.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
