import React, { useState, useMemo, useEffect } from 'react';
import { 
  Filter, 
  ArrowUpDown, 
  ShieldCheck, 
  Truck, 
  TrendingDown, 
  Package, 
  Layers, 
  Sparkles, 
  Search, 
  CheckCircle2,
  Boxes,
  Award,
  Zap,
  ChevronDown,
  Check,
  X,
  Cpu,
  Wrench,
  Building2,
  LayoutGrid,
  List,
  FileSpreadsheet,
  ArrowRight,
  RotateCcw,
  History,
  Clock,
  Radio,
  SunMedium
} from 'lucide-react';
import { Product, PageView, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { INITIAL_CATEGORIES } from '../data/seedData';
import { getCachedCategories, getCategoriesFromDatabase, subscribeToCategories, subscribeToRealtimeStatus, isRealtimeConnected } from '../services/productService';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { scoreProductMatch, SearchMatchResult } from '../utils/searchMatcher';
import { useCurrency } from '../context/CurrencyContext';
import { ProductGridSkeleton } from '../components/ui/Skeleton';
import { useSearchHistory } from '../hooks/useSearchHistory';

interface CatalogPageProps {
  products: Product[];
  searchQuery: string;
  onSelectProduct: (product: Product) => void;
  onOpenAuth: () => void;
  onOpenSupport?: (prefilledText?: string) => void;
  onSearchChange?: (q: string) => void;
  onNavigate: (view: PageView) => void;
  onRequestQuote: (category?: string, productName?: string) => void;
  initialCategory?: string;
  isLoading?: boolean;
}

const HERO_BG_IMAGE = "https://res.cloudinary.com/doujptiz/image/upload/f_auto,q_auto:good,w_1200,c_limit/v1785975451/sean-pollock-PhYq704ffdA-unsplash_bt4wst.jpg";

export const CatalogPage: React.FC<CatalogPageProps> = ({
  products,
  searchQuery = '',
  onSelectProduct,
  onOpenAuth,
  onOpenSupport,
  onSearchChange,
  onNavigate,
  onRequestQuote,
  initialCategory = 'all',
  isLoading = false
}) => {
  const { formatPrice, currentCurrencyConfig } = useCurrency();
  const { recentSearches, addSearch } = useSearchHistory();
  const [categories, setCategories] = useState<Category[]>(getCachedCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (initialCategory && initialCategory !== 'all') return initialCategory;
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ee_catalog_category');
        if (stored) return stored;
      }
    } catch {}
    return initialCategory || 'all';
  });
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'discount_desc' | 'moq_asc'>('recommended');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    isRealtimeConnected() ? 'connected' : 'connecting'
  );
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  // Synchronize category change to sessionStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && selectedCategory) {
        sessionStorage.setItem('ee_catalog_category', selectedCategory);
      }
    } catch {}
  }, [selectedCategory]);

  // Listen to real-time connection status & newly added products
  useEffect(() => {
    const unsubStatus = subscribeToRealtimeStatus((status) => {
      setRealtimeStatus(status);
    });

    const handleNewArrival = (e: Event) => {
      const customEvt = e as CustomEvent<Product>;
      if (customEvt.detail?.id) {
        setNewlyAddedIds(prev => new Set(prev).add(customEvt.detail.id));
        setTimeout(() => {
          setNewlyAddedIds(prev => {
            const next = new Set(prev);
            next.delete(customEvt.detail.id);
            return next;
          });
        }, 45000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('eagle_product_newly_added', handleNewArrival);
    }

    return () => {
      unsubStatus();
      if (typeof window !== 'undefined') {
        window.removeEventListener('eagle_product_newly_added', handleNewArrival);
      }
    };
  }, []);

  // Load and subscribe to live categories
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

  // Synchronize active search query to search history
  useEffect(() => {
    const cleanSearch = (searchQuery || '').trim();
    if (cleanSearch.length > 1) {
      const timer = setTimeout(() => {
        addSearch(cleanSearch);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, addSearch]);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Keyboard escape key listener to close category menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Category list derived from live categories & product catalog
  const availableCategories = useMemo(() => {
    const activeCats = categories.length > 0 ? categories : INITIAL_CATEGORIES;
    const baseCategories = activeCats.filter(c => c.id !== 'all');
    const existingCatIds = new Set(baseCategories.map(c => c.id.toLowerCase()));
    const existingCatNames = new Set(baseCategories.map(c => c.name.toLowerCase()));
    
    // Discover any additional categories from custom products not yet in category list
    const dynamicCategories = products
      .filter(p => p.category && !existingCatIds.has(p.category.toLowerCase()) && !existingCatNames.has(p.category.toLowerCase()) && p.category !== 'all')
      .map(p => ({
        id: p.category,
        name: p.category.charAt(0).toUpperCase() + p.category.slice(1).replace(/[-_]/g, ' '),
        slug: p.category,
        description: `Wholesale ${p.category} supplies & bulk orders`,
        iconName: 'Boxes',
        itemCount: products.filter(item => (item.category || '').toLowerCase() === p.category.toLowerCase()).length
      }));

    return [
      {
        id: 'all',
        name: 'All Wholesale Categories',
        slug: 'all',
        description: 'Browse complete inventory across all product lines',
        iconName: 'Layers',
        itemCount: products.length
      },
      ...baseCategories.map(c => ({
        ...c,
        itemCount: products.filter(p => {
          const prodCat = (p.category || '').toLowerCase();
          return prodCat === c.id.toLowerCase() || prodCat === c.name.toLowerCase() || prodCat === c.slug.toLowerCase();
        }).length
      })),
      ...dynamicCategories
    ];
  }, [categories, products]);

  const activeCategory = useMemo(() => {
    return availableCategories.find(c => c.id === selectedCategory) || availableCategories[0];
  }, [availableCategories, selectedCategory]);

  const getCategoryIcon = (id: string) => {
    const norm = id.toLowerCase();
    if (norm === 'all') return Layers;
    if (norm === 'solar' || norm.includes('solar') || norm.includes('energy') || norm.includes('renewable')) return SunMedium;
    if (norm === 'electronics' || norm.includes('audio')) return Cpu;
    if (norm === 'industrial' || norm === 'building' || norm.includes('hardware')) return Wrench;
    if (norm === 'office') return Building2;
    if (norm === 'safety') return ShieldCheck;
    if (norm === 'packaging') return Package;
    return Boxes;
  };

  const { filteredAndSortedProducts, bestMatchId } = useMemo(() => {
    const trimmedQuery = (searchQuery || '').trim();

    const isCategoryMatch = (prodCategory: string | undefined, selectedCat: string): boolean => {
      if (!selectedCat || selectedCat === 'all') return true;
      if (!prodCategory) return false;
      
      const normProd = (prodCategory || '').trim().toLowerCase();
      const normSelected = (selectedCat || '').trim().toLowerCase();

      if (normProd === normSelected) return true;

      const matchedCat = availableCategories.find(c => 
        (c.id || '').toLowerCase() === normSelected ||
        (c.name || '').toLowerCase() === normSelected ||
        (c.slug && c.slug.toLowerCase() === normSelected)
      );

      if (matchedCat) {
        return (
          normProd === (matchedCat.id || '').toLowerCase() ||
          normProd === (matchedCat.name || '').toLowerCase() ||
          (matchedCat.slug ? normProd === matchedCat.slug.toLowerCase() : false)
        );
      }

      return false;
    };

    const scored = products.map(product => {
      const matchesCategory = isCategoryMatch(product.category, selectedCategory);
      const matchesStock = !inStockOnly || product.stock > 0;
      
      const matchResult = scoreProductMatch(product, trimmedQuery);
      const matchesSearch = trimmedQuery.length === 0 || matchResult.score > 0;
      const isIncluded = matchesCategory && matchesSearch && matchesStock;

      return {
        product,
        matchResult,
        isIncluded
      };
    });

    const matchingItems = scored.filter(item => item.isIncluded);

    matchingItems.sort((a, b) => {
      if (trimmedQuery.length > 0 && sortBy === 'recommended') {
        return b.matchResult.score - a.matchResult.score;
      }

      if (sortBy === 'price_asc') {
        if (a.product.price !== b.product.price) return a.product.price - b.product.price;
        return b.matchResult.score - a.matchResult.score;
      }
      if (sortBy === 'price_desc') {
        if (b.product.price !== a.product.price) return b.product.price - a.product.price;
        return b.matchResult.score - a.matchResult.score;
      }
      if (sortBy === 'moq_asc') {
        const aMoq = a.product.minOrderQty || 0;
        const bMoq = b.product.minOrderQty || 0;
        if (aMoq !== bMoq) return aMoq - bMoq;
        return b.matchResult.score - a.matchResult.score;
      }
      if (sortBy === 'discount_desc') {
        const aLowest = a.product.wholesaleTiers?.length ? Math.min(...a.product.wholesaleTiers.map(t => t.pricePerUnit)) : a.product.price;
        const bLowest = b.product.wholesaleTiers?.length ? Math.min(...b.product.wholesaleTiers.map(t => t.pricePerUnit)) : b.product.price;
        const aDiscount = ((a.product.price - aLowest) / a.product.price);
        const bDiscount = ((b.product.price - bLowest) / b.product.price);
        if (bDiscount !== aDiscount) return bDiscount - aDiscount;
        return b.matchResult.score - a.matchResult.score;
      }

      if (trimmedQuery.length > 0) {
        return b.matchResult.score - a.matchResult.score;
      }

      // Default 'recommended' or unsorted: New arrivals and newly created first
      const aIsNew = newlyAddedIds.has(a.product.id) ? 1 : 0;
      const bIsNew = newlyAddedIds.has(b.product.id) ? 1 : 0;
      if (aIsNew !== bIsNew) return bIsNew - aIsNew;

      const aTime = new Date(a.product.createdAt || 0).getTime();
      const bTime = new Date(b.product.createdAt || 0).getTime();
      if (aTime !== bTime) return bTime - aTime;

      return (b.product.isFeatured ? 1 : 0) - (a.product.isFeatured ? 1 : 0);
    });

    const sortedList = matchingItems.map(item => item.product);
    const topMatch = matchingItems.length > 0 && trimmedQuery.length > 0 && matchingItems[0].matchResult.score >= 200
      ? matchingItems[0].product.id 
      : null;

    return {
      filteredAndSortedProducts: sortedList,
      bestMatchId: topMatch
    };
  }, [products, selectedCategory, searchQuery, inStockOnly, sortBy, availableCategories, newlyAddedIds]);

  const catalogRef = useScrollReveal<HTMLDivElement>([
    filteredAndSortedProducts.length,
    selectedCategory,
    sortBy,
    inStockOnly
  ]);

  return (
    <div ref={catalogRef} className="space-y-6 animate-fadeIn pb-10">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
        <button 
          onClick={() => onNavigate('home')}
          className="hover:text-[#F27D26] transition-colors cursor-pointer"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-bold text-slate-900 dark:text-white">Wholesale Catalog</span>
        {selectedCategory !== 'all' && (
          <>
            <span>/</span>
            <span className="text-[#F27D26] font-bold">{activeCategory.name}</span>
          </>
        )}
      </div>

      {/* Hero Wholesale Value Proposition Banner */}
      <div 
        className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-white/10 text-white p-6 sm:p-8 md:p-10 reveal-on-scroll is-revealed"
        style={{
          backgroundImage: `url(${HERO_BG_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-radial-gradient from-[#F27D26]/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 w-full max-w-5xl space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/20 backdrop-blur-md border border-[#F27D26]/40 text-[#ff994d] text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
              Eagle Excel Ventures Direct Supply & Distribution
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-zinc-200 text-xs">
              <span>Prices in:</span>
              <strong className="text-white font-bold">{currentCurrencyConfig.flag} {currentCurrencyConfig.label}</strong>
            </div>

            {/* Real-time WebSockets / SSE Live Sync Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border transition-all ${
              realtimeStatus === 'connected'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : realtimeStatus === 'connecting'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-emerald-400 animate-ping' : realtimeStatus === 'connecting' ? 'bg-amber-400' : 'bg-zinc-500'
              }`} />
              <Radio className="w-3 h-3" />
              <span>{realtimeStatus === 'connected' ? 'Live Inventory Sync' : realtimeStatus === 'connecting' ? 'Connecting Stream...' : 'Offline Sync'}</span>
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-serif leading-tight text-white drop-shadow-md">
            Wholesale Catalog & Tiered Volume Pricing
          </h1>
          
          <p className="text-zinc-200 text-xs sm:text-sm md:text-base leading-relaxed max-w-3xl font-medium drop-shadow-sm">
            Order ready-to-dispatch inventory from our Lagos and Douala warehouses, or lock in automated tiered discounts of up to 35% on full pallet and container lots.
          </p>

          {/* Morphic Value Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 shadow-lg">
              <div className="w-9 h-9 rounded-xl icon-morphism icon-morphism-accent shrink-0 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Live Tier Repricing</div>
                <div className="text-[10px] text-zinc-300">Discounts apply automatically</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 shadow-lg">
              <div className="w-9 h-9 rounded-xl icon-morphism icon-morphism-accent shrink-0 flex items-center justify-center">
                <Truck className="w-4 h-4 text-[#F27D26]" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Pallet & LTL Shipping</div>
                <div className="text-[10px] text-zinc-300">Free freight over $1,500 POs</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 shadow-lg">
              <div className="w-9 h-9 rounded-xl icon-morphism icon-morphism-accent shrink-0 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Net 30 & Wire Terms</div>
                <div className="text-[10px] text-zinc-300">Flexible B2B invoice terms</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Category Chips Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {availableCategories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const Icon = getCategoryIcon(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all btn-hover cursor-pointer ${
                isSelected 
                  ? 'bg-[#F27D26] text-black shadow-md shadow-[#F27D26]/20'
                  : 'bg-white dark:bg-[#161616] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-black/20 text-black font-black' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400'
              }`}>
                {cat.id === 'all' ? products.length : products.filter(p => p.category === cat.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Categories Dropdown & Filter Controls */}
      <div className="relative z-30 bg-white dark:bg-[#161616] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-md dark:shadow-xl space-y-4 reveal-on-scroll is-revealed transition-colors duration-300">
        
        {/* Primary Row: Categories Dropdown Button + Active Category Badge + Product Count */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* The Categories Dropdown Toggle Button */}
            <div className="relative">
              <button
                id="catalog-page-categories-dropdown-btn"
                type="button"
                onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                className={`flex items-center justify-between gap-3 py-2.5 px-4 sm:px-5 rounded-2xl font-black text-xs sm:text-sm transition-all btn-hover cursor-pointer ${
                  isCategoryDropdownOpen
                    ? 'bg-black text-[#F27D26] border-2 border-[#F27D26]'
                    : 'bg-gradient-to-r from-[#F27D26] to-[#e06d1a] hover:from-[#ff8833] hover:to-[#ea7622] text-black'
                }`}
                aria-expanded={isCategoryDropdownOpen}
                aria-haspopup="true"
                aria-label="Toggle Categories Menu"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isCategoryDropdownOpen ? 'bg-[#F27D26]/20' : 'bg-black/15'
                  }`}>
                    <LayoutGrid className={`w-3.5 h-3.5 stroke-[2.5] ${
                      isCategoryDropdownOpen ? 'text-[#F27D26]' : 'text-black'
                    }`} />
                  </div>
                  <span className="tracking-tight">
                    Categories Directory
                  </span>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    isCategoryDropdownOpen ? 'bg-[#F27D26] text-black' : 'bg-black/20 text-black'
                  }`}>
                    {availableCategories.length - 1}
                  </span>
                </div>
                {isCategoryDropdownOpen ? (
                  <X className="w-4 h-4 stroke-[2.5] text-[#F27D26] animate-scaleUp" />
                ) : (
                  <ChevronDown className="w-4 h-4 stroke-[2.5] text-black" />
                )}
              </button>
            </div>

            {/* Active Selected Category Chip */}
            {selectedCategory !== 'all' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/30 text-xs font-bold text-slate-900 dark:text-white animate-fadeIn">
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Active Filter:</span>
                <span className="text-[#e06d1a] dark:text-[#F27D26] font-black">{activeCategory.name}</span>
                <button
                  id="catalog-clear-selected-category-btn"
                  onClick={() => setSelectedCategory('all')}
                  className="p-0.5 rounded-md hover:bg-[#F27D26]/20 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-0.5"
                  title="Clear Category Filter"
                  aria-label="Clear Category Filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Showing Count */}
          <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-900 dark:text-zinc-200 font-bold">{filteredAndSortedProducts.length}</strong> of {products.length} wholesale items
            </span>
          </div>
        </div>

        {/* Expanded Categories In-Flow Menu Panel */}
        {isCategoryDropdownOpen && (
          <div 
            id="catalog-categories-expanded-panel"
            className="pt-3 pb-1 border-t border-slate-100 dark:border-white/5 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Wholesale Categories Directory</span>
                  <span className="text-[10px] normal-case font-medium text-slate-500 dark:text-zinc-400">
                    ({availableCategories.length} options available)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Select any category below to immediately filter the inventory catalog
                </p>
              </div>

              <div className="flex items-center gap-3">
                {selectedCategory !== 'all' && (
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setIsCategoryDropdownOpen(false);
                    }}
                    className="text-xs font-bold text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    View All Categories
                  </button>
                )}
                <button
                  onClick={() => setIsCategoryDropdownOpen(false)}
                  className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Close Menu
                </button>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
              {availableCategories.map(cat => {
                const IconComponent = getCategoryIcon(cat.id);
                const isSelected = selectedCategory === cat.id;
                const count = cat.id === 'all' ? products.length : products.filter(p => p.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl text-left transition-all group btn-hover cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#F27D26]/20 to-[#F27D26]/10 border-2 border-[#F27D26] text-slate-950 dark:text-white'
                        : 'bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isSelected
                          ? 'bg-[#F27D26] text-black'
                          : 'bg-white dark:bg-white/10 text-slate-600 dark:text-zinc-300 group-hover:text-[#F27D26] group-hover:bg-[#F27D26]/10'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${
                          isSelected ? 'text-[#e06d1a] dark:text-[#F27D26]' : 'text-slate-900 dark:text-white group-hover:text-[#F27D26]'
                        }`}>
                          {cat.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                          {cat.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        isSelected
                          ? 'bg-[#F27D26] text-black'
                          : 'bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-zinc-300 group-hover:bg-[#F27D26]/20 group-hover:text-[#F27D26]'
                      }`}>
                        {count} items
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#F27D26] stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Secondary Toolbar: Stock filter & Sorting */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-zinc-300 font-medium select-none">
              <input
                id="catalog-stock-filter-checkbox"
                type="checkbox"
                checked={inStockOnly}
                onChange={e => setInStockOnly(e.target.checked)}
                className="w-4 h-4 text-[#F27D26] bg-slate-100 dark:bg-white/5 rounded border-slate-300 dark:border-white/20 focus:ring-[#F27D26]"
              />
              <span>In Stock Inventory Only</span>
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <span className="text-slate-600 dark:text-zinc-400 shrink-0 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#F27D26]" /> Sort by:
            </span>
            <select
              id="catalog-page-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none transition-colors"
            >
              <option value="recommended" className="bg-white dark:bg-[#161616] text-slate-900 dark:text-zinc-200">
                {(searchQuery || '').trim() ? 'Closest Match (Ranked by Relevance)' : 'Featured / Default'}
              </option>
              <option value="discount_desc" className="bg-white dark:bg-[#161616] text-slate-900 dark:text-zinc-200">Highest Bulk Savings %</option>
              <option value="price_asc" className="bg-white dark:bg-[#161616] text-slate-900 dark:text-zinc-200">Price: Low to High</option>
              <option value="price_desc" className="bg-white dark:bg-[#161616] text-slate-900 dark:text-zinc-200">Price: High to Low</option>
              <option value="moq_asc" className="bg-white dark:bg-[#161616] text-slate-900 dark:text-zinc-200">Lowest MOQ</option>
            </select>
          </div>

        </div>

      </div>

      {/* Active Search Keyword Indicator */}
      {(searchQuery || '').trim() && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-4 sm:px-5 bg-gradient-to-r from-[#F27D26]/15 via-[#F27D26]/5 to-transparent border border-[#F27D26]/30 rounded-2xl text-xs text-slate-800 dark:text-zinc-200 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#F27D26]/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
            </div>
            <span>
              Showing <strong className="text-slate-950 dark:text-white font-bold">{filteredAndSortedProducts.length}</strong> {filteredAndSortedProducts.length === 1 ? 'product' : 'products'} containing <strong className="text-[#e06d1a] dark:text-[#F27D26]">"{searchQuery}"</strong>
            </span>
          </div>
          {onSearchChange && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 transition-all btn-hover cursor-pointer"
            >
              <X className="w-3 h-3 text-[#F27D26]" /> Clear search
            </button>
          )}
        </div>
      )}

      {/* Recent Searches Bar on Catalog Page */}
      {recentSearches.length > 0 && !(searchQuery || '').trim() && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-zinc-400 shrink-0">
            <History className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Recent:</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {recentSearches.map((item, idx) => (
              <button
                key={`${item}-${idx}`}
                type="button"
                onClick={() => onSearchChange?.(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 hover:bg-[#F27D26]/10 hover:border-[#F27D26] border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
              >
                <Clock className="w-2.5 h-2.5 text-[#F27D26]" />
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      {isLoading ? (
        <ProductGridSkeleton count={10} />
      ) : filteredAndSortedProducts.length === 0 ? (
        <div className="bg-white dark:bg-[#161616] rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-white/5 space-y-5 shadow-sm reveal-on-scroll">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-zinc-500 mx-auto icon-morphism">
            <Package className="w-8 h-8 text-[#F27D26]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">No Matching Wholesale Products</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              We couldn't find any products matching your query. Would you like us to source this item directly from our Chinese manufacturing network?
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setInStockOnly(false);
                onSearchChange?.('');
              }}
              className="py-2.5 px-5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={() => {
                onRequestQuote('Custom Sourcing', searchQuery);
                onNavigate('rfq');
              }}
              className="py-2.5 px-6 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-bold shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              Request Custom Factory Quote
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {filteredAndSortedProducts.map((product, idx) => {
            const staggerClass = `stagger-${(idx % 6) + 1}`;
            const isBestMatch = product.id === bestMatchId;
            return (
              <div 
                key={product.id} 
                className={`reveal-on-scroll ${staggerClass} product-card-container`}
              >
                <ProductCard
                  product={product}
                  onSelect={onSelectProduct}
                  isBestMatch={isBestMatch}
                  isNewlyAdded={newlyAddedIds.has(product.id)}
                  searchQuery={searchQuery}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom RFQ Sourcing Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#F27D26]" />
            Looking for something specific not in our local stock?
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xl">
            We source custom containers of electrical, industrial, building, textile, and packaging items directly from verified manufacturers in Guangzhou & Yiwu.
          </p>
        </div>
        <button
          onClick={() => onNavigate('rfq')}
          className="py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F27D26] to-[#e06d1a] hover:from-[#ff8833] hover:to-[#ea7622] text-black font-black text-xs shrink-0 shadow-lg transition-all btn-hover cursor-pointer"
        >
          Submit Custom RFQ
        </button>
      </div>

    </div>
  );
};
