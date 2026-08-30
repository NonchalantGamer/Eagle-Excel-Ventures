import React, { useMemo } from 'react';
import { 
  History, 
  Clock, 
  Trash2, 
  Search, 
  Sparkles, 
  Tag, 
  Layers, 
  ArrowRight, 
  X, 
  TrendingUp, 
  CornerDownLeft,
  Flame
} from 'lucide-react';
import { Product, PageView } from '../types';
import { SearchMatchResult, HighlightedText } from '../utils/searchMatcher';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { DEFAULT_B2B_SUGGESTIONS } from '../utils/searchHistory';

interface SearchAutocompleteDropdownProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  onNavigate: (view: PageView) => void;
  currentView: PageView;
  topSuggestions: SearchMatchResult[];
  matchingCategories: { id: string; name: string; count: number; directMatch: boolean }[];
  onSelectSuggestion: (product: Product) => void;
  onSelectCategory: (categoryId: string) => void;
  formatPrice: (amount: number) => string;
  isMobile?: boolean;
}

export const SearchAutocompleteDropdown: React.FC<SearchAutocompleteDropdownProps> = ({
  searchQuery = '',
  onSearchChange,
  onClose,
  onNavigate,
  currentView,
  topSuggestions,
  matchingCategories,
  onSelectSuggestion,
  onSelectCategory,
  formatPrice,
  isMobile = false
}) => {
  const { recentSearches, addSearch, removeSearch, clearHistory } = useSearchHistory();
  const trimmedQuery = (searchQuery || '').trim();

  // Filter recent searches matching current query when typing
  const matchingRecentSearches = useMemo(() => {
    if (!trimmedQuery) return recentSearches;
    return recentSearches.filter(item => 
      item.toLowerCase().includes(trimmedQuery.toLowerCase())
    );
  }, [recentSearches, trimmedQuery]);

  const handleSelectRecentSearch = (queryText: string) => {
    addSearch(queryText);
    onSearchChange(queryText);
    if (currentView !== 'catalog') {
      onNavigate('catalog');
    }
  };

  const handleSelectPopularSuggestion = (queryText: string) => {
    addSearch(queryText);
    onSearchChange(queryText);
    if (currentView !== 'catalog') {
      onNavigate('catalog');
    }
  };

  const handleViewAllInCatalog = () => {
    if (trimmedQuery) {
      addSearch(trimmedQuery);
    }
    onClose();
    if (currentView !== 'catalog') {
      onNavigate('catalog');
    }
  };

  return (
    <div 
      id={isMobile ? 'mobile-search-autocomplete-dropdown' : 'header-search-autocomplete-dropdown'}
      className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[120] animate-dropdownSlideDown divide-y divide-slate-100 dark:divide-white/5 ring-1 ring-black/10 dark:ring-white/10"
    >
      {/* 1. STATE A: Empty Query - Show Recent Searches (last 5) & Popular B2B Queries */}
      {!trimmedQuery ? (
        <div className="p-3 sm:p-4 space-y-4">
          {/* Recent Searches Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-zinc-200">
                <History className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Recent Searches</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F27D26]/10 text-[#e06d1a] dark:text-[#F27D26] border border-[#F27D26]/20">
                  {recentSearches.length > 0 ? `${recentSearches.length}/5` : 'Last 5 queries'}
                </span>
              </div>

              {recentSearches.length > 0 && (
                <button
                  type="button"
                  id={isMobile ? 'mobile-clear-recent-searches-btn' : 'clear-recent-searches-btn'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearHistory();
                  }}
                  className="text-[11px] font-semibold text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Clear all recent searches"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              )}
            </div>

            {recentSearches.length > 0 ? (
              <div className="space-y-1">
                {recentSearches.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-[#F27D26]/10 dark:hover:bg-[#F27D26]/15 border border-slate-200/60 dark:border-white/5 hover:border-[#F27D26]/30 transition-all group cursor-pointer"
                    onClick={() => handleSelectRecentSearch(item)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-[#F27D26] transition-colors shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 group-hover:text-[#e06d1a] dark:group-hover:text-[#F27D26] truncate">
                        {item}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
                        Search query ↵
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeSearch(item);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title={`Remove "${item}" from history`}
                        aria-label={`Remove "${item}" from history`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-center space-y-1">
                <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                  No recent product searches saved yet
                </p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                  Your last 5 product queries will be saved here in localStorage for fast 1-click access.
                </p>
              </div>
            )}
          </div>

          {/* Popular Wholesale Queries Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-zinc-400 px-1">
              <Flame className="w-3 h-3 text-[#F27D26]" />
              <span>Trending B2B Procurement Searches</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_B2B_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSelectPopularSuggestion(suggestion)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-[#F27D26]/10 hover:text-[#e06d1a] dark:hover:text-[#F27D26] border border-slate-200 dark:border-white/5 text-[11px] font-medium text-slate-700 dark:text-zinc-300 transition-all cursor-pointer"
                >
                  <Search className="w-2.5 h-2.5 text-[#F27D26]" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 2. STATE B: Active Search Query - Show Matching Recent Queries, Categories & Products */
        <>
          {/* Header Info */}
          <div className="px-3.5 py-2 bg-slate-50/90 dark:bg-white/[0.03] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>
                Suggestions for <strong className="text-[#F27D26]">"{searchQuery}"</strong>
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
              {topSuggestions.length} {topSuggestions.length === 1 ? 'product' : 'products'}
              {matchingCategories.length > 0 ? ` • ${matchingCategories.length} categories` : ''}
            </span>
          </div>

          {/* Optional Matching Recent Searches Strip */}
          {matchingRecentSearches.length > 0 && (
            <div className="px-3 py-2 bg-amber-500/5 dark:bg-[#F27D26]/5 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <History className="w-3 h-3 text-[#F27D26]" />
                  <span>From Your Recent Search History</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchingRecentSearches.map((item, idx) => (
                  <button
                    key={`${item}-${idx}`}
                    type="button"
                    onClick={() => handleSelectRecentSearch(item)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-white/10 hover:bg-[#F27D26]/20 border border-slate-200 dark:border-white/10 hover:border-[#F27D26] text-xs font-semibold text-slate-800 dark:text-zinc-200 transition-all cursor-pointer group"
                  >
                    <Clock className="w-3 h-3 text-[#F27D26]" />
                    <span><HighlightedText text={item} query={searchQuery} /></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 1. Matching Categories Section */}
          {matchingCategories.length > 0 && (
            <div className="p-2.5 bg-slate-50/50 dark:bg-white/[0.01]">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5 px-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#F27D26]" />
                <span>Matching Categories</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchingCategories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#F27D26] dark:hover:border-[#F27D26] hover:bg-[#F27D26]/10 text-xs font-semibold text-slate-800 dark:text-zinc-200 transition-all cursor-pointer group"
                  >
                    <Layers className="w-3 h-3 text-[#F27D26]" />
                    <span><HighlightedText text={cat.name} query={searchQuery} /></span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 font-mono">
                      ({cat.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Suggested Products List */}
          {topSuggestions.length === 0 && matchingCategories.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-1">
              <p>No products or categories matching <strong className="text-slate-700 dark:text-zinc-300">"{searchQuery}"</strong>.</p>
              <p className="text-[11px] text-slate-400">Try searching by category, brand, or SKU number.</p>
            </div>
          ) : (
            <div className={`${isMobile ? 'max-h-64' : 'max-h-80'} overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-white/5`}>
              {topSuggestions.map((item, index) => {
                const isTop = index === 0 && item.score >= 200;
                return (
                  <button
                    key={item.product.id}
                    type="button"
                    onClick={() => onSelectSuggestion(item.product)}
                    className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={item.product.images[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'}
                        alt={item.product.name}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-200 dark:bg-white/5 shrink-0 border border-slate-200/60 dark:border-white/5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isTop && (
                            <span className="bg-[#F27D26] text-black text-[9px] font-black px-1.5 py-0.2 rounded shrink-0">
                              Top Match
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase shrink-0">
                            <HighlightedText text={item.product.sku} query={searchQuery} />
                          </span>
                          <span className="text-[10px] text-[#F27D26] font-bold truncate">
                            {item.product.category}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-[#F27D26] transition-colors">
                          <HighlightedText text={item.product.name} query={searchQuery} />
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 whitespace-nowrap pl-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white block whitespace-nowrap">
                        {formatPrice(item.product.price)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap block">
                        MOQ: {item.product.minOrderQty || 1}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Action */}
          <div className="p-2.5 bg-slate-50 dark:bg-[#101010] text-center flex items-center justify-between px-4">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[9px]">Enter</kbd> to search catalog
            </span>
            <button
              type="button"
              onClick={handleViewAllInCatalog}
              className="text-[11px] font-bold text-[#F27D26] hover:underline flex items-center justify-center gap-1 cursor-pointer ml-auto"
            >
              View all matching results in Catalog <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
