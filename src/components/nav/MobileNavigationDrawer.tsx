import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronDown, 
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
  Heart,
  Flame,
  Star,
  TrendingUp,
  RotateCcw,
  LogIn,
  UserPlus,
  Ship,
  Boxes,
  ArrowRight,
  SunMedium,
  Search
} from 'lucide-react';
import { Product, PageView, Category } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency, CURRENCIES, CurrencyCode } from '../../context/CurrencyContext';
import { getBrandLogo } from '../../constants/branding';
import { INITIAL_CATEGORIES } from '../../data/seedData';
import { getCachedCategories, getCategoriesFromDatabase, subscribeToCategories } from '../../services/productService';
import { CONTACT_INFO } from '../../constants/contact';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: PageView;
  onNavigate: (view: PageView, options?: { category?: string; filter?: 'all' | 'new' | 'bestsellers' | 'featured' | 'deals'; docTab?: string }) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenSupport: () => void;
  onOpenSettings: () => void;
  unreadSupportCount?: number;
  products?: Product[];
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
  products = []
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { isDark, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    shop: false,
    categories: false,
    help: false,
    account: false
  });

  const [categories, setCategories] = useState<Category[]>(getCachedCategories);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Subscribe to live categories
  useEffect(() => {
    getCategoriesFromDatabase()
      .then(cats => {
        if (cats && cats.length > 0) setCategories(cats);
      })
      .catch(() => {});

    const unsubscribe = subscribeToCategories((liveCats) => {
      if (liveCats && liveCats.length > 0) setCategories(liveCats);
    });

    return () => unsubscribe();
  }, []);

  // When the menu is open: manage body scroll lock and escape key dismissal
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Derive categories with product counts
  const availableCategories = useMemo(() => {
    const activeCats = categories.length > 0 ? categories : INITIAL_CATEGORIES;
    const baseCategories = activeCats.filter(c => c.id !== 'all');
    const existingCatIds = new Set(baseCategories.map(c => c.id.toLowerCase()));
    const existingCatNames = new Set(baseCategories.map(c => c.name.toLowerCase()));
    
    const dynamicCategories = products
      .filter(p => p.category && !existingCatIds.has(p.category.toLowerCase()) && !existingCatNames.has(p.category.toLowerCase()) && p.category !== 'all')
      .map(p => ({
        id: p.category,
        name: p.category.charAt(0).toUpperCase() + p.category.slice(1).replace(/[-_]/g, ' '),
        slug: p.category,
        description: `Wholesale ${p.category} supplies`,
        iconName: 'Boxes',
        itemCount: products.filter(item => (item.category || '').toLowerCase() === p.category.toLowerCase()).length
      }));

    return [
      ...baseCategories.map(c => ({
        ...c,
        itemCount: products.length > 0 
          ? products.filter(p => {
              const prodCat = (p.category || '').toLowerCase();
              return prodCat === c.id.toLowerCase() || prodCat === c.name.toLowerCase() || prodCat === c.slug.toLowerCase();
            }).length
          : c.itemCount || 0
      })),
      ...dynamicCategories
    ];
  }, [categories, products]);

  const getCategoryIcon = (id: string) => {
    const norm = id.toLowerCase();
    if (norm === 'solar' || norm.includes('solar') || norm.includes('energy') || norm.includes('renewable')) {
      return <SunMedium className="w-4 h-4 text-amber-500" />;
    }
    if (norm === 'electronics' || norm.includes('audio') || norm.includes('tech')) {
      return <Cpu className="w-4 h-4 text-blue-500" />;
    }
    if (norm === 'building' || norm.includes('hardware') || norm.includes('tools')) {
      return <Wrench className="w-4 h-4 text-indigo-500" />;
    }
    if (norm === 'textiles' || norm.includes('garment') || norm.includes('fabric') || norm.includes('fashion')) {
      return <Sparkles className="w-4 h-4 text-purple-500" />;
    }
    if (norm === 'machinery' || norm.includes('equipment') || norm.includes('factory')) {
      return <Factory className="w-4 h-4 text-emerald-500" />;
    }
    if (norm === 'packaging' || norm.includes('merchandise') || norm.includes('carton')) {
      return <Package className="w-4 h-4 text-[#F27D26]" />;
    }
    return <Boxes className="w-4 h-4 text-slate-500" />;
  };

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      try {
        sessionStorage.setItem('ee_catalog_search_term', mobileSearchQuery.trim());
      } catch {}
      onNavigate('catalog');
      onClose();
    }
  };

  return (
    <div data-portal-modal="true" className="fixed inset-0 z-[99999] isolate overflow-hidden" id="mobile-navigation-drawer">
      {/* Full Screen High-Focus Backdrop with Frosted Blur */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-all duration-300 animate-fadeIn z-40 cursor-pointer"
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
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Eagle Excel Ventures
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-[#F27D26] text-black shrink-0">
                    B2B
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                  Direct Factory Wholesale & Logistics
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              id="mobile-drawer-close-btn"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Search */}
          <div className="p-3 bg-white dark:bg-[#121212] border-b border-slate-100 dark:border-white/5">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                placeholder="Search products, SKUs, or categories..."
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#F27D26]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </form>
          </div>

          {/* Drawer Body - Scrollable Accordion List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">

            {/* 1. HOME */}
            <button
              onClick={() => {
                onNavigate('home');
                onClose();
              }}
              className={`w-full p-3 rounded-xl flex items-center justify-between font-bold text-xs transition-all cursor-pointer ${
                currentView === 'home'
                  ? 'bg-[#F27D26] text-black shadow-md'
                  : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className={`w-4 h-4 ${currentView === 'home' ? 'text-black' : 'text-[#F27D26]'}`} />
                <span>Home</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${currentView === 'home' ? 'text-black' : 'text-slate-400'}`} />
            </button>

            {/* 2. SHOP (Accordion) */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
              <button
                onClick={() => toggleSection('shop')}
                className="w-full p-3 flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-[#F27D26]" />
                  <span>Shop</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F27D26]/10 text-[#F27D26]">
                    5 Views
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.shop ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {openSections.shop && (
                <div className="p-2 pt-0 space-y-1 border-t border-slate-200/50 dark:border-white/5 animate-fadeIn">
                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'all', category: 'all' });
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>All Products</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'new', category: 'all' });
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span>New Arrivals</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      NEW
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'bestsellers', category: 'all' });
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                      <span>Best Sellers</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      TOP
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'featured', category: 'all' });
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Star className="w-3.5 h-3.5 text-blue-500" />
                      <span>Featured Products</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      FEATURED
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'deals', category: 'all' });
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Flame className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span>Deals & Discounts</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#F27D26]/20 text-[#e06d1a] dark:text-[#F27D26]">
                      % OFF
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. CATEGORIES (Accordion) */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
              <button
                onClick={() => toggleSection('categories')}
                className="w-full p-3 flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Boxes className="w-4 h-4 text-[#F27D26]" />
                  <span>Categories</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300">
                    {availableCategories.length}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.categories ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {openSections.categories && (
                <div className="p-2 pt-0 space-y-1 border-t border-slate-200/50 dark:border-white/5 animate-fadeIn max-h-56 overflow-y-auto">
                  <button
                    onClick={() => {
                      onNavigate('catalog', { category: 'all' });
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg bg-[#F27D26]/10 text-[#F27D26] font-bold text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span>Browse All Categories</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {availableCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onNavigate('catalog', { category: cat.id });
                        onClose();
                      }}
                      className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {getCategoryIcon(cat.id)}
                        <span className="truncate">{cat.name}</span>
                      </div>
                      {typeof cat.itemCount === 'number' && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cat.itemCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. DEALS (Direct Link) */}
            <button
              onClick={() => {
                onNavigate('catalog', { filter: 'deals', category: 'all' });
                onClose();
              }}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#F27D26]/15 to-transparent border border-[#F27D26]/30 flex items-center justify-between font-bold text-xs text-[#e06d1a] dark:text-[#F27D26] hover:bg-[#F27D26]/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Flame className="w-4 h-4 text-[#F27D26]" />
                <span>Deals & Wholesale Discounts</span>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#F27D26] text-black">
                HOT SAVINGS
              </span>
            </button>

            {/* 5. HELP & SUPPORT (Accordion) */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
              <button
                onClick={() => toggleSection('help')}
                className="w-full p-3 flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-[#F27D26]" />
                  <span>Help & Support</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.help ? 'rotate-180' : ''}`} />
              </button>

              {openSections.help && (
                <div className="p-2 pt-0 space-y-1 border-t border-slate-200/50 dark:border-white/5 animate-fadeIn">
                  <button
                    onClick={() => {
                      onNavigate('orders');
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Track My Order</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('supply-chain');
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Ship className="w-3.5 h-3.5 text-blue-500" />
                      <span>Shipping Information</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      try {
                        sessionStorage.setItem('ee_docs_active_tab', 'payment_terms');
                      } catch {}
                      onNavigate('docs', { docTab: 'payment_terms' });
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                      <span>Returns & Refunds</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      try {
                        sessionStorage.setItem('ee_docs_active_tab', 'faq');
                      } catch {}
                      onNavigate('docs', { docTab: 'faq' });
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                      <span>FAQs</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      onOpenSupport();
                      onClose();
                    }}
                    className="w-full p-2 rounded-lg bg-slate-900 dark:bg-white/10 text-white font-bold text-xs flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span>Live 24/7 B2B Support Desk</span>
                    </div>
                    {unreadSupportCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">
                        {unreadSupportCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 6. ACCOUNT (Accordion based on Auth) */}
            <div className="rounded-xl border border-slate-200/80 dark:border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
              <button
                onClick={() => toggleSection('account')}
                className="w-full p-3 flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-[#F27D26]" />
                  <span>Account</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300">
                    {currentUser ? 'Signed In' : 'Guest'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections.account ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {openSections.account && (
                <div className="p-2 pt-0 space-y-1.5 border-t border-slate-200/50 dark:border-white/5 animate-fadeIn">
                  {currentUser ? (
                    <>
                      {/* Logged in header */}
                      <div className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-lg mb-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {userProfile?.displayName || 'Wholesale Buyer'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                          {currentUser.email}
                        </p>
                        {isAdmin && (
                          <span className="inline-block mt-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#F27D26]/20 text-[#F27D26]">
                            🛡️ Administrator
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onNavigate('profile');
                          onClose();
                        }}
                        className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-[#F27D26]" />
                          <span>My Profile</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      <button
                        onClick={() => {
                          onNavigate('orders');
                          onClose();
                        }}
                        className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-[#F27D26]" />
                          <span>My Orders</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      <button
                        onClick={() => {
                          onNavigate('wishlist');
                          onClose();
                        }}
                        className="w-full p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 flex items-center justify-between text-xs font-semibold cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                          <span>Wishlist & Saved Items</span>
                        </div>
                        {wishlistCount > 0 ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                            {wishlistCount}
                          </span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          onOpenSettings();
                          onClose();
                        }}
                        className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          <span>Account Settings</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {isAdmin && (
                        <div className="pt-1.5 border-t border-slate-200/50 dark:border-white/5 space-y-1">
                          <button
                            onClick={() => {
                              onNavigate('admin');
                              onClose();
                            }}
                            className="w-full p-2 rounded-lg bg-[#F27D26]/10 text-[#F27D26] font-bold text-xs flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#F27D26]" />
                              <span>Admin Operations Portal</span>
                            </div>
                            <span className="text-[8px] uppercase font-black px-1.5 py-0.2 rounded bg-[#F27D26]/20">
                              Admin
                            </span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          onClose();
                        }}
                        className="w-full p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 font-bold text-xs flex items-center justify-between cursor-pointer mt-1"
                      >
                        <div className="flex items-center gap-2">
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onOpenAuth('login');
                          onClose();
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Sign In</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          onOpenAuth('signup');
                          onClose();
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-3.5 h-3.5 text-[#F27D26]" />
                          <span>Create Account</span>
                        </div>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#F27D26]/15 text-[#F27D26]">
                          Register
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          onNavigate('orders');
                          onClose();
                        }}
                        className="w-full py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Track My Order</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 7. CART (Action) */}
            <button
              onClick={() => {
                setIsCartOpen(true);
                onClose();
              }}
              className="w-full p-3 rounded-xl bg-slate-900 text-white dark:bg-white/10 hover:bg-black flex items-center justify-between font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-4 h-4 text-[#F27D26]" />
                <span>Procurement Cart</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#F27D26] text-black">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#F27D26]" />
              </div>
            </button>

          </div>

          {/* Drawer Footer - Quick Preferences & Support */}
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#0d0d0d] border-t border-slate-200 dark:border-white/5 shrink-0 space-y-2.5">
            
            {/* Currency and Theme Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map(code => (
                  <button
                    key={code}
                    onClick={() => setCurrency(code)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                      currency === code
                        ? 'bg-[#F27D26] text-black shadow-xs'
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {CURRENCIES[code].flag} {code}
                  </button>
                ))}
              </div>

              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:text-[#F27D26] transition-colors cursor-pointer"
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>

            {/* Helpline */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
              <span className="font-medium">Direct Trade Helpline:</span>
              <a 
                href={`tel:${CONTACT_INFO.nigeria.phoneRaw}`}
                className="font-bold text-[#F27D26] hover:underline"
              >
                {CONTACT_INFO.nigeria.phoneDisplay}
              </a>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
