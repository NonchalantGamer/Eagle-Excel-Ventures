import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Building2, 
  User as UserIcon, 
  Search, 
  Menu, 
  X, 
  ChevronDown
} from 'lucide-react';
import { Product, PageView } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';
import { getBrandLogo } from '../constants/branding';
import { getTopSearchSuggestions } from '../utils/searchMatcher';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { SearchAutocompleteDropdown } from './SearchAutocompleteDropdown';
import { NotificationDropdown } from './NotificationDropdown';
import { ProfileMenuDropdown } from './nav/ProfileMenuDropdown';
import { CurrencyMenuDropdown } from './nav/CurrencyMenuDropdown';
import { MobileNavigationDrawer } from './nav/MobileNavigationDrawer';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  onOpenAuth: () => void;
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
  const { isDark } = useTheme();
  const { currency, formatPrice } = useCurrency();
  const { addSearch } = useSearchHistory();
  
  // State for mobile drawer and dropdowns
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

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

  // Dismiss dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current && 
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
      if (
        mobileSearchContainerRef.current && 
        !mobileSearchContainerRef.current.contains(e.target as Node)
      ) {
        setIsMobileSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    setIsMobileSearchFocused(false);
    setIsMobileMenuOpen(false);
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
    setIsMobileSearchFocused(false);
    setIsMobileMenuOpen(false);
    onSelectCategoryFilter?.(categoryId);
    if (currentView !== 'catalog') {
      onNavigate('catalog');
    }
  };

  return (
    <header id="main-header" className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#101010]/95 backdrop-blur-xl border-b border-slate-200/90 dark:border-white/5 text-slate-900 dark:text-zinc-100 transition-colors duration-300 shadow-xs">
      
      {/* 1. Main Navigation Row */}
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              id="header-brand-logo-btn"
              onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-2 sm:gap-3 group text-left cursor-pointer"
            >
              <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl brand-logo-badge flex items-center justify-center p-1 sm:p-1.5 shrink-0 transition-transform group-hover:scale-105">
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
                  <span className="font-black text-sm sm:text-base lg:text-lg tracking-tight font-serif text-slate-950 dark:text-white whitespace-nowrap">
                    <span className="hidden sm:inline">Eagle Excel Ventures</span>
                    <span className="sm:hidden">Eagle Excel</span>
                  </span>
                  <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-[#F27D26]/15 text-[#e06d1a] dark:text-[#F27D26] border border-[#F27D26]/40">
                    B2B
                  </span>
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600 dark:text-zinc-300 font-bold hidden xl:block">
                  Wholesale & Supply Distribution
                </div>
              </div>
            </button>
          </div>

          {/* Desktop Search Input with Autocomplete */}
          <div 
            ref={searchContainerRef}
            className="hidden md:flex flex-1 max-w-md lg:max-w-xl mx-4 relative" 
            id="header-search-bar-container"
          >
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                placeholder="Search catalog, SKU, categories (e.g., Solar)..."
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 text-xs rounded-xl pl-8.5 pr-14 py-2 focus:ring-2 focus:ring-[#F27D26] focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
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
                    title="Close search (Exit)"
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

            {/* Desktop Autocomplete & Recent Searches Dropdown */}
            {isSearchFocused && (
              <SearchAutocompleteDropdown
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                  onSearchChange(q);
                  setIsSearchFocused(true);
                }}
                onClose={() => setIsSearchFocused(false)}
                onNavigate={onNavigate}
                currentView={currentView}
                topSuggestions={topSuggestions}
                matchingCategories={matchingCategories}
                onSelectSuggestion={handleSelectSuggestion}
                onSelectCategory={handleSelectCategory}
                formatPrice={formatPrice}
              />
            )}
          </div>

          {/* Right Action Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" id="header-actions">
            
            {/* Currency Selector Pill (Desktop) */}
            <div className="relative hidden sm:block">
              <button
                id="header-currency-selector-btn"
                type="button"
                onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCurrencyMenuOpen
                    ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/50 ring-2 ring-[#F27D26]/30 shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200'
                }`}
                title={isCurrencyMenuOpen ? "Close currency selector (Exit)" : "Select Wholesale Currency"}
                aria-expanded={isCurrencyMenuOpen}
                aria-label={isCurrencyMenuOpen ? "Close currency selector" : "Select Wholesale Currency"}
              >
                <span>{CURRENCIES[currency].flag}</span>
                <span>{currency}</span>
                {isCurrencyMenuOpen ? (
                  <X className="w-3.5 h-3.5 text-[#F27D26] stroke-[2.5] animate-scaleUp" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </button>

              <CurrencyMenuDropdown
                isOpen={isCurrencyMenuOpen}
                onClose={() => setIsCurrencyMenuOpen(false)}
              />
            </div>

            {/* Real-time Notification Alert Dropdown */}
            <NotificationDropdown onNavigate={onNavigate} onOpenAuth={onOpenAuth} />

            {/* User Profile Picture with Dropdown Popover */}
            {currentUser ? (
              <div className={`relative ${isProfileMenuOpen ? 'z-50' : ''}`}>
                <button
                  id="header-desktop-profile-btn"
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className={`relative rounded-full p-0.5 focus:outline-none transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                    isProfileMenuOpen ? 'z-50 ring-2 ring-[#F27D26]' : 'focus:ring-2 focus:ring-[#F27D26]'
                  }`}
                  title={isProfileMenuOpen ? "Close profile menu (Exit)" : `Account Menu: ${userProfile?.displayName || currentUser.email}`}
                  aria-label={isProfileMenuOpen ? "Close profile menu" : "Toggle user profile menu"}
                  aria-expanded={isProfileMenuOpen}
                >
                  {isProfileMenuOpen ? (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#F27D26] text-black flex items-center justify-center shadow-md animate-scaleUp">
                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[3]" />
                    </div>
                  ) : (
                    <>
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 transition-all ${
                        currentView === 'profile'
                          ? 'border-[#F27D26] ring-2 ring-[#F27D26]/40'
                          : isAdmin
                            ? 'border-[#F27D26]'
                            : 'border-slate-300 dark:border-white/20'
                      } bg-slate-200 dark:bg-white/10 shadow-xs`}>
                        {userProfile?.photoURL || userProfile?.avatarUrl ? (
                          <img
                            src={userProfile.photoURL || userProfile.avatarUrl}
                            alt={userProfile.displayName || 'User Profile'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-[#F27D26] text-black font-extrabold text-xs flex items-center justify-center">
                            {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>

                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#101010] ${
                          isAdmin ? 'bg-[#F27D26]' : 'bg-emerald-500'
                        }`}
                      />
                    </>
                  )}
                </button>

                {/* Desktop Profile Popover Menu */}
                <ProfileMenuDropdown
                  isOpen={isProfileMenuOpen}
                  onClose={() => setIsProfileMenuOpen(false)}
                  onNavigate={onNavigate}
                  onOpenSettings={onOpenSettings}
                  onOpenSupport={onOpenSupport}
                  unreadSupportCount={unreadSupportCount}
                />
              </div>
            ) : (
              <button
                id="header-desktop-signin-btn"
                type="button"
                onClick={onOpenAuth}
                className="py-1.5 px-2.5 sm:py-2 sm:px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Mobile / Tablet Menu Button */}
            <button
              id="header-nav-menu-btn"
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden relative p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center cursor-pointer shrink-0"
              aria-label={isMobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
              title={isMobileMenuOpen ? "Close menu (Exit)" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 text-[#F27D26] stroke-[2.5] animate-scaleUp" />
              ) : (
                <Menu className="w-4 h-4 text-[#F27D26]" />
              )}
            </button>

          </div>

        </div>

        {/* Mobile Search Row (Only visible on small screens under md) */}
        <div 
          ref={mobileSearchContainerRef}
          className="pb-2.5 pt-0.5 md:hidden relative" 
          id="mobile-header-search-bar-container"
        >
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="mobile-header-search-input"
              type="text"
              value={searchQuery}
              onFocus={() => setIsMobileSearchFocused(true)}
              onChange={e => {
                onSearchChange(e.target.value);
                setIsMobileSearchFocused(true);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const cleanSearch = (searchQuery || '').trim();
                  if (cleanSearch) {
                    addSearch(cleanSearch);
                  }
                  setIsMobileSearchFocused(false);
                  if (currentView !== 'catalog') {
                    onNavigate('catalog');
                  }
                }
              }}
              placeholder="Search catalog, SKU, category (e.g., Solar)..."
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 text-xs rounded-xl pl-8.5 pr-8 py-2 focus:ring-2 focus:ring-[#F27D26] focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
            {(searchQuery || isMobileSearchFocused) && (
              <button
                id="mobile-header-search-clear-btn"
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setIsMobileSearchFocused(false);
                  const input = document.getElementById('mobile-header-search-input');
                  if (input) input.blur();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#F27D26] hover:text-[#e06d1a] dark:text-[#F27D26] p-1 cursor-pointer"
                aria-label="Close search"
                title="Close search (Exit)"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Mobile Search Suggestions Dropdown */}
          {isMobileSearchFocused && (
            <SearchAutocompleteDropdown
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                onSearchChange(q);
                setIsMobileSearchFocused(true);
              }}
              onClose={() => setIsMobileSearchFocused(false)}
              onNavigate={onNavigate}
              currentView={currentView}
              topSuggestions={topSuggestions}
              matchingCategories={matchingCategories}
              onSelectSuggestion={handleSelectSuggestion}
              onSelectCategory={handleSelectCategory}
              formatPrice={formatPrice}
              isMobile={true}
            />
          )}
        </div>

      </div>

      {/* 2. Mobile Navigation Drawer */}
      <MobileNavigationDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        onNavigate={onNavigate}
        onOpenAuth={onOpenAuth}
        onOpenSupport={onOpenSupport}
        onOpenSettings={onOpenSettings}
        unreadSupportCount={unreadSupportCount}
        products={products}
        onSelectCategoryFilter={onSelectCategoryFilter}
      />

    </header>
  );
};
