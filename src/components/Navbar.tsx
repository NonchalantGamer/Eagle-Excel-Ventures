import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Menu, 
  X, 
  ChevronDown,
  ShoppingCart,
  Flame,
  Layers,
  Boxes,
  HelpCircle,
  User as UserIcon,
  Sparkles,
  FileText,
  Truck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { Product, PageView } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { getBrandLogo } from '../constants/branding';
import { getTopSearchSuggestions } from '../utils/searchMatcher';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { SearchAutocompleteDropdown } from './SearchAutocompleteDropdown';
import { NotificationDropdown } from './NotificationDropdown';
import { CurrencyMenuDropdown } from './nav/CurrencyMenuDropdown';
import { DesktopMegaDropdown } from './nav/DesktopMegaDropdown';
import { MobileNavigationDrawer } from './nav/MobileNavigationDrawer';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView, options?: { category?: string; filter?: 'all' | 'new' | 'bestsellers' | 'featured' | 'deals'; docTab?: string }) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenSupport: () => void;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadSupportCount?: number;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  onSelectCategoryFilter?: (category: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenSupport,
  onOpenSettings,
  searchQuery = '',
  onSearchChange,
  unreadSupportCount = 0,
  products = [],
  onSelectProduct,
  onSelectCategoryFilter
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { isDark } = useTheme();
  const { currency, formatPrice } = useCurrency();
  const { addSearch } = useSearchHistory();
  
  // Navigation dropdown states
  const [activeDropdown, setActiveDropdown] = useState<'shop' | 'categories' | 'help' | 'account' | 'currency' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navBarRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleDropdown = (name: 'shop' | 'categories' | 'help' | 'account' | 'currency') => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveDropdown(prev => prev === name ? null : name);
  };

  const handleMouseEnterNav = (name: 'shop' | 'categories' | 'help' | 'account') => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeaveNav = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(prev => (prev === 'currency' ? prev : null));
    }, 180);
  };

  const handleDropdownMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleDropdownMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(prev => (prev === 'currency' ? prev : null));
    }, 180);
  };

  const closeAllDropdowns = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveDropdown(null);
  };

  // Compute top closest matching product suggestions
  const topSuggestions = useMemo(() => {
    const cleanSearch = (searchQuery || '').trim();
    if (!products.length || !cleanSearch) return [];
    return getTopSearchSuggestions(products, cleanSearch, 5);
  }, [products, searchQuery]);

  // Compute real-time matching categories from products & current inventory
  const matchingCategories = useMemo(() => {
    const cleanSearch = (searchQuery || '').trim();
    if (!products.length || !cleanSearch) return [];
    const query = cleanSearch.toLowerCase();
    
    const catMap = new Map<string, { id: string; name: string; count: number; directMatch: boolean }>();

    products.forEach(p => {
      if (!p.category) return;
      const catId = p.category.toLowerCase();
      const catDisplayName = p.category.charAt(0).toUpperCase() + p.category.slice(1).replace(/[-_]/g, ' ');
      const isDirectMatch = catId.includes(query) || catDisplayName.toLowerCase().includes(query);
      const isProductMatch = p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);

      if (isDirectMatch || isProductMatch) {
        const existing = catMap.get(catId);
        if (existing) {
          existing.count += 1;
          if (isDirectMatch) existing.directMatch = true;
        } else {
          catMap.set(catId, {
            id: p.category,
            name: catDisplayName,
            count: 1,
            directMatch: isDirectMatch
          });
        }
      }
    });

    return Array.from(catMap.values())
      .sort((a, b) => (b.directMatch ? 1 : 0) - (a.directMatch ? 1 : 0) || b.count - a.count)
      .slice(0, 4);
  }, [products, searchQuery]);

  // Dismiss dropdowns and search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current && 
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
      if (
        navBarRef.current && 
        !navBarRef.current.contains(e.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut '/' to focus search & 'Escape' to close dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setIsSearchFocused(false);
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('header-search-input');
        if (searchInput) {
          searchInput.focus();
          setIsSearchFocused(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectSuggestion = (product: Product) => {
    const cleanSearch = (searchQuery || '').trim();
    if (cleanSearch) {
      addSearch(cleanSearch);
    } else if (product.name) {
      addSearch(product.name);
    }
    setIsSearchFocused(false);
    closeAllDropdowns();
    if (currentView !== 'catalog') {
      onNavigate('catalog');
    }
    onSelectProduct?.(product);
  };

  const handleSelectCategory = (categoryId: string) => {
    const cleanSearch = (searchQuery || '').trim();
    if (cleanSearch) {
      addSearch(cleanSearch);
    }
    setIsSearchFocused(false);
    closeAllDropdowns();
    onSelectCategoryFilter?.(categoryId);
    if (currentView !== 'catalog') {
      onNavigate('catalog', { category: categoryId });
    }
  };

  return (
    <header id="main-header" ref={navBarRef} className="w-full bg-white dark:bg-[#101010] border-b border-slate-200 dark:border-white/5 text-slate-900 dark:text-zinc-100 transition-colors duration-300 shadow-xs">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP BAR: Brand Logo | Search Bar | Utilities & Actions        */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full px-3 sm:px-6 lg:px-8 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3 lg:gap-6">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              id="header-brand-logo-btn"
              onClick={() => { onNavigate('home'); closeAllDropdowns(); }}
              className="flex items-center gap-2 sm:gap-3 group text-left cursor-pointer"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl brand-logo-badge flex items-center justify-center p-1 sm:p-1.5 shrink-0 transition-transform group-hover:scale-105 shadow-xs">
                <img 
                  src={getBrandLogo(isDark)} 
                  alt="Eagle Excel Ventures Logo" 
                  className="w-full h-full object-contain brand-logo-img"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#F27D26] hidden group-data-[fallback=true]:block" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base sm:text-lg tracking-tight font-serif text-slate-950 dark:text-white whitespace-nowrap">
                    <span className="hidden sm:inline">Eagle Excel Ventures</span>
                    <span className="sm:hidden">Eagle Excel</span>
                  </span>
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-[#F27D26]/15 text-[#e06d1a] dark:text-[#F27D26] border border-[#F27D26]/40">
                    B2B
                  </span>
                </div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400 font-semibold hidden md:block">
                  Direct Factory Wholesale & Logistics
                </div>
              </div>
            </button>
          </div>

          {/* Desktop Search Bar with Autocomplete */}
          <div 
            ref={searchContainerRef}
            className={`hidden md:flex flex-1 max-w-md lg:max-w-xl mx-2 lg:mx-6 relative ${isSearchFocused ? 'z-[110]' : 'z-20'}`} 
            id="header-search-bar-container"
          >
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={e => {
                  onSearchChange(e.target.value);
                  setIsSearchFocused(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const cleanSearch = (searchQuery || '').trim();
                    if (cleanSearch) {
                      addSearch(cleanSearch);
                    }
                    setIsSearchFocused(false);
                    if (currentView !== 'catalog') {
                      onNavigate('catalog');
                    }
                  }
                }}
                placeholder="Search products, wholesale categories, SKUs (e.g. Solar)..."
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 text-xs rounded-xl pl-9 pr-14 py-2 focus:ring-2 focus:ring-[#F27D26] focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />
              
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {(searchQuery || isSearchFocused) ? (
                  <button
                    id="header-search-clear-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSearchChange('');
                      setIsSearchFocused(false);
                      const input = document.getElementById('header-search-input');
                      if (input) input.blur();
                    }}
                    className="text-[#F27D26] hover:text-[#e06d1a] dark:text-[#F27D26] p-1 rounded-md hover:bg-[#F27D26]/10 transition-colors cursor-pointer"
                    aria-label="Close search"
                    title="Close search"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                ) : (
                  <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 dark:text-zinc-300 bg-slate-200 dark:bg-white/10 rounded border border-slate-300 dark:border-white/10">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchFocused && (
              <SearchAutocompleteDropdown
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                  onSearchChange(q);
                  setIsSearchFocused(true);
                }}
                onClose={() => setIsSearchFocused(false)}
                onNavigate={(v) => { onNavigate(v); closeAllDropdowns(); }}
                currentView={currentView}
                topSuggestions={topSuggestions}
                matchingCategories={matchingCategories}
                onSelectSuggestion={handleSelectSuggestion}
                onSelectCategory={handleSelectCategory}
                formatPrice={formatPrice}
              />
            )}
          </div>

          {/* Right Action Utilities (Currency, Notification, Cart, Mobile Toggle) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" id="header-actions">
            
            {/* Currency Selector Pill */}
            <div className={`relative hidden sm:block ${activeDropdown === 'currency' ? 'z-[110]' : 'z-20'}`}>
              <button
                id="header-currency-selector-btn"
                type="button"
                onClick={() => toggleDropdown('currency')}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDropdown === 'currency'
                    ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/50 ring-2 ring-[#F27D26]/30 shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200'
                }`}
                title="Wholesale Settlement Currency"
                aria-expanded={activeDropdown === 'currency'}
              >
                <span>{CURRENCIES[currency].flag}</span>
                <span>{currency}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${activeDropdown === 'currency' ? 'rotate-180 text-[#F27D26]' : ''}`} />
              </button>

              <CurrencyMenuDropdown
                isOpen={activeDropdown === 'currency'}
                onClose={closeAllDropdowns}
              />
            </div>

            {/* Real-time Notifications Bell */}
            <NotificationDropdown 
              onNavigate={(v) => { onNavigate(v); closeAllDropdowns(); }} 
              onOpenAuth={() => onOpenAuth('login')} 
            />

            {/* Wholesale Profile Icon Button (Takes user to profile dashboard) */}
            <button
              id="header-profile-action-btn"
              type="button"
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth('login');
                } else {
                  onNavigate('profile');
                }
                closeAllDropdowns();
              }}
              title={currentUser ? (userProfile?.displayName ? `${userProfile.displayName}'s Profile` : 'Wholesale Profile') : 'Sign In to Wholesale Profile'}
              aria-label="User Profile"
              className={`relative p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center group shrink-0 ${
                currentView === 'profile'
                  ? 'bg-[#F27D26]/20 text-[#F27D26] ring-2 ring-[#F27D26]/50 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
              }`}
            >
              {userProfile?.avatarUrl || userProfile?.photoURL || currentUser?.photoURL ? (
                <img 
                  src={userProfile?.avatarUrl || userProfile?.photoURL || currentUser?.photoURL} 
                  alt="Profile" 
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover ring-1 ring-[#F27D26]/40 group-hover:ring-[#F27D26] transition-all"
                />
              ) : (
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 text-slate-700 dark:text-zinc-200 group-hover:text-[#F27D26]" />
              )}
            </button>

            {/* Mobile / Tablet Menu Button */}
            <button
              id="header-nav-menu-btn"
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden relative p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center cursor-pointer shrink-0"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 text-[#F27D26] stroke-[2.5]" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>

          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN NAVIGATION BAR (Desktop):                                */}
      {/* Home | Shop ▾ | Categories ▾ | Help & Support ▾ | Account ▾ | 🛒 Cart */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden xl:block w-full px-4 sm:px-6 lg:px-8 bg-slate-50/70 dark:bg-[#141414]/70 border-b border-slate-200/60 dark:border-white/5 relative">
        <div className="flex items-center justify-between h-11">
          
          {/* Main Menu Links & Dropdowns */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold" aria-label="Main Navigation">
            
            {/* 1. HOME */}
            <button
              id="nav-home-btn"
              onClick={() => {
                onNavigate('home');
                closeAllDropdowns();
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'home'
                  ? 'bg-[#F27D26] text-black font-extrabold shadow-xs'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>Home</span>
            </button>

            {/* 2. SHOP ▾ */}
            <button
              id="nav-shop-dropdown-btn"
              type="button"
              onClick={() => toggleDropdown('shop')}
              onMouseEnter={() => handleMouseEnterNav('shop')}
              onMouseLeave={handleMouseLeaveNav}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeDropdown === 'shop'
                  ? 'bg-[#F27D26]/20 text-[#e06d1a] dark:text-[#F27D26] font-extrabold ring-1 ring-[#F27D26]/40'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white'
              }`}
              aria-expanded={activeDropdown === 'shop'}
            >
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Shop</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${activeDropdown === 'shop' ? 'rotate-180 text-[#F27D26]' : ''}`} />
            </button>

            {/* 3. CATEGORIES ▾ */}
            <button
              id="nav-categories-dropdown-btn"
              type="button"
              onClick={() => toggleDropdown('categories')}
              onMouseEnter={() => handleMouseEnterNav('categories')}
              onMouseLeave={handleMouseLeaveNav}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeDropdown === 'categories'
                  ? 'bg-[#F27D26]/20 text-[#e06d1a] dark:text-[#F27D26] font-extrabold ring-1 ring-[#F27D26]/40'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white'
              }`}
              aria-expanded={activeDropdown === 'categories'}
            >
              <Boxes className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Categories</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${activeDropdown === 'categories' ? 'rotate-180 text-[#F27D26]' : ''}`} />
            </button>

            {/* 4. HELP & SUPPORT ▾ */}
            <button
              id="nav-helpsupport-dropdown-btn"
              type="button"
              onClick={() => toggleDropdown('help')}
              onMouseEnter={() => handleMouseEnterNav('help')}
              onMouseLeave={handleMouseLeaveNav}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeDropdown === 'help'
                  ? 'bg-[#F27D26]/20 text-[#e06d1a] dark:text-[#F27D26] font-extrabold ring-1 ring-[#F27D26]/40'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white'
              }`}
              aria-expanded={activeDropdown === 'help'}
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Help & Support</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${activeDropdown === 'help' ? 'rotate-180 text-[#F27D26]' : ''}`} />
            </button>

            {/* 5. ACCOUNT ▾ */}
            <button
              id="nav-account-dropdown-btn"
              type="button"
              onClick={() => toggleDropdown('account')}
              onMouseEnter={() => handleMouseEnterNav('account')}
              onMouseLeave={handleMouseLeaveNav}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeDropdown === 'account'
                  ? 'bg-[#F27D26]/20 text-[#e06d1a] dark:text-[#F27D26] font-extrabold ring-1 ring-[#F27D26]/40'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white'
              }`}
              aria-expanded={activeDropdown === 'account'}
            >
              <UserIcon className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>
                {currentUser ? (userProfile?.displayName || 'My Account') : 'Account'}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${activeDropdown === 'account' ? 'rotate-180 text-[#F27D26]' : ''}`} />
            </button>

            {/* 6. CART Button */}
            <button
              id="nav-cart-btn"
              onClick={() => {
                setIsCartOpen(true);
                closeAllDropdowns();
              }}
              onMouseEnter={closeAllDropdowns}
              className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Cart</span>
              {itemCount > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-[#F27D26] text-black">
                  {itemCount}
                </span>
              )}
            </button>

          </nav>

          {/* Quick Direct Sourcing Shortcuts (Desktop Right) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNavigate('rfq');
                closeAllDropdowns();
              }}
              onMouseEnter={closeAllDropdowns}
              className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 hover:text-[#F27D26] dark:hover:text-[#F27D26] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Custom Sourcing RFQ</span>
            </button>

            <span className="text-slate-300 dark:text-white/10">|</span>

            <button
              onClick={() => {
                onNavigate('supply-chain');
                closeAllDropdowns();
              }}
              onMouseEnter={closeAllDropdowns}
              className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 hover:text-[#F27D26] dark:hover:text-[#F27D26] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-blue-500" />
              <span>Freight & Shipping</span>
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* INTEGRATED DESKTOP MEGA DROPDOWN (100% Blended with secondary header)      */}
        {/* ========================================================================= */}
        <DesktopMegaDropdown
          isOpen={['shop', 'categories', 'help', 'account'].includes(activeDropdown as string)}
          activeSection={activeDropdown as ('shop' | 'categories' | 'help' | 'account' | null)}
          onClose={closeAllDropdowns}
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
          onNavigate={(v, opts) => {
            onNavigate(v, opts);
            closeAllDropdowns();
          }}
          onOpenAuth={(mode) => {
            onOpenAuth(mode);
            closeAllDropdowns();
          }}
          onOpenSupport={() => {
            onOpenSupport();
            closeAllDropdowns();
          }}
          onOpenSettings={() => {
            onOpenSettings();
            closeAllDropdowns();
          }}
          unreadSupportCount={unreadSupportCount}
          products={products}
        />

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE NAVIGATION DRAWER                                      */}
      {/* ------------------------------------------------------------- */}
      <MobileNavigationDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        onNavigate={(view, opts) => {
          onNavigate(view, opts);
          setIsMobileMenuOpen(false);
        }}
        onOpenAuth={(mode) => {
          onOpenAuth(mode);
          setIsMobileMenuOpen(false);
        }}
        onOpenSupport={() => {
          onOpenSupport();
          setIsMobileMenuOpen(false);
        }}
        onOpenSettings={() => {
          onOpenSettings();
          setIsMobileMenuOpen(false);
        }}
        unreadSupportCount={unreadSupportCount}
        products={products}
      />

    </header>
  );
};
