import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Command,
  Package,
  Layers,
  Truck,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
  BookOpen,
  User,
  Moon,
  Sun,
  Coins,
  ShoppingCart,
  MessageSquare,
  Sparkles,
  ArrowRight,
  X,
  Keyboard,
  CornerDownLeft
} from 'lucide-react';
import { Product, PageView } from '../types';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getTopSearchSuggestions, HighlightedText } from '../utils/searchMatcher';
import { useModalFocusLock } from '../hooks/useModalFocusLock';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onNavigate: (view: PageView) => void;
  onSelectProduct: (product: Product) => void;
  onOpenSupport: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  products,
  onNavigate,
  onSelectProduct,
  onOpenSupport
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'actions' | 'shortcuts'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const { currency, setCurrency, formatPrice } = useCurrency();
  const { isDark, toggleTheme } = useTheme();
  const { setIsCartOpen, itemCount } = useCart();
  const { isAdmin } = useAuth();

  useModalFocusLock(isOpen, onClose);

  // Reset query and focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveTab('all');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Actions list
  const systemActions = useMemo(() => {
    const navActions = [
      {
        id: 'nav-catalog',
        title: 'Wholesale Catalog',
        category: 'Navigation',
        icon: Layers,
        shortcut: 'G C',
        action: () => {
          onNavigate('catalog');
          onClose();
        }
      },
      {
        id: 'nav-rfq',
        title: 'Request Custom RFQ',
        category: 'Procurement',
        icon: FileText,
        shortcut: 'G R',
        action: () => {
          onNavigate('rfq');
          onClose();
        }
      },
      {
        id: 'nav-supply-chain',
        title: 'Supply Chain & China Import Hub',
        category: 'Navigation',
        icon: Truck,
        shortcut: 'G S',
        action: () => {
          onNavigate('supply-chain');
          onClose();
        }
      },
      {
        id: 'nav-orders',
        title: 'Orders & Shipments',
        category: 'Account',
        icon: Clock,
        shortcut: 'G O',
        action: () => {
          onNavigate('orders');
          onClose();
        }
      },
      {
        id: 'nav-profile',
        title: 'Enterprise Profile & Settings',
        category: 'Account',
        icon: User,
        shortcut: 'G P',
        action: () => {
          onNavigate('profile');
          onClose();
        }
      },
      {
        id: 'action-cart',
        title: `Open Wholesale Cart (${itemCount} items)`,
        category: 'Cart',
        icon: ShoppingCart,
        shortcut: 'C',
        action: () => {
          setIsCartOpen(true);
          onClose();
        }
      },
      {
        id: 'action-support',
        title: 'Contact B2B Procurement Desk (24/7)',
        category: 'Support',
        icon: MessageSquare,
        shortcut: 'H',
        action: () => {
          onOpenSupport();
          onClose();
        }
      },
      {
        id: 'action-theme',
        title: isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme',
        category: 'Appearance',
        icon: isDark ? Sun : Moon,
        shortcut: 'T',
        action: () => {
          toggleTheme();
        }
      }
    ];

    if (isAdmin) {
      navActions.unshift({
        id: 'nav-admin',
        title: 'Admin Master Command Center',
        category: 'Administration',
        icon: ShieldCheck,
        shortcut: 'G A',
        action: () => {
          onNavigate('admin');
          onClose();
        }
      });
    }

    return navActions;
  }, [isAdmin, isDark, itemCount, onNavigate, onClose, setIsCartOpen, onOpenSupport, toggleTheme]);

  // Matching products
  const matchingProducts = useMemo(() => {
    if (!products.length) return [];
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      return products.slice(0, 6);
    }
    return getTopSearchSuggestions(products, cleanQuery, 8);
  }, [products, query]);

  // Filtered items based on query & tab
  const filteredActions = useMemo(() => {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return systemActions;
    const q = cleanQuery.toLowerCase();
    return systemActions.filter(
      a => (a.title || '').toLowerCase().includes(q) || (a.category || '').toLowerCase().includes(q)
    );
  }, [systemActions, query]);

  // Combined flat list for keyboard navigation
  const flatItems = useMemo(() => {
    if (activeTab === 'shortcuts') return [];
    if (activeTab === 'products') {
      return matchingProducts.map(p => ({ type: 'product' as const, data: p }));
    }
    if (activeTab === 'actions') {
      return filteredActions.map(a => ({ type: 'action' as const, data: a }));
    }
    return [
      ...matchingProducts.slice(0, 4).map(p => ({ type: 'product' as const, data: p })),
      ...filteredActions.slice(0, 5).map(a => ({ type: 'action' as const, data: a }))
    ];
  }, [activeTab, matchingProducts, filteredActions]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (flatItems.length || 1)) % (flatItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = flatItems[selectedIndex];
      if (current) {
        if (current.type === 'product') {
          onSelectProduct(current.data);
          onClose();
        } else if (current.type === 'action') {
          current.data.action();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' ? createPortal(
    <div
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-start justify-center p-3 sm:p-6 md:p-10 bg-black/80 backdrop-blur-xl overflow-hidden animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#141414] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col mt-4 sm:mt-8 transition-all animate-scaleUp text-slate-900 dark:text-zinc-100"
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#111111] gap-3">
          <Search className="w-5 h-5 text-[#F27D26] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search products, SKUs, wholesale tiers, or run commands..."
            className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 text-sm sm:text-base font-medium"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-zinc-400 rounded border border-slate-300 dark:border-white/10 shadow-xs">
                ESC
              </kbd>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100/70 dark:bg-[#0c0c0c] border-b border-slate-200/80 dark:border-white/5 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-xl font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            All Results
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1 rounded-xl font-bold transition-colors flex items-center gap-1 ${
              activeTab === 'products'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Package className="w-3 h-3 text-[#F27D26]" /> Products
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1 rounded-xl font-bold transition-colors flex items-center gap-1 ${
              activeTab === 'actions'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Command className="w-3 h-3 text-[#F27D26]" /> Quick Actions
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-1 rounded-xl font-bold transition-colors flex items-center gap-1 ${
              activeTab === 'shortcuts'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Keyboard className="w-3 h-3 text-[#F27D26]" /> Shortcuts
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {activeTab === 'shortcuts' ? (
            <div className="p-3 space-y-4 text-xs">
              <div className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                Global Hotkeys & Accessibility
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">Open Command Palette</span>
                  <kbd className="px-2 py-0.5 font-mono text-[10px] font-bold bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded shadow-xs">
                    Ctrl + K / ⌘K / /
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">Open Wholesale Cart</span>
                  <kbd className="px-2 py-0.5 font-mono text-[10px] font-bold bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded shadow-xs">
                    C
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">Toggle Theme (Dark / Light)</span>
                  <kbd className="px-2 py-0.5 font-mono text-[10px] font-bold bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded shadow-xs">
                    T
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">Open Support Chat</span>
                  <kbd className="px-2 py-0.5 font-mono text-[10px] font-bold bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded shadow-xs">
                    H
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">Close Modals / Drawers</span>
                  <kbd className="px-2 py-0.5 font-mono text-[10px] font-bold bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded shadow-xs">
                    ESC
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">Confirm Selection</span>
                  <kbd className="px-2 py-0.5 font-mono text-[10px] font-bold bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded shadow-xs">
                    Enter ↵
                  </kbd>
                </div>
              </div>
            </div>
          ) : flatItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-zinc-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#F27D26]" />
              <p className="text-sm font-semibold">No matching results for "{query}"</p>
              <p className="text-xs mt-1">Try searching by category, product name, or SKU number.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {flatItems.map((item, idx) => {
                const isSelected = selectedIndex === idx;

                if (item.type === 'product') {
                  const product = item.data;
                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#F27D26]/10 border border-[#F27D26]/40 dark:bg-[#F27D26]/15'
                          : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <img
                        src={product.images[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'}
                        alt={product.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#F27D26] font-bold">
                            <HighlightedText text={product.sku} query={query} />
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-zinc-400 font-medium">
                            {product.category}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-auto shrink-0">
                            {product.stock} in stock
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate mt-0.5">
                          <HighlightedText text={product.name} query={query} />
                        </h4>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold text-[#F27D26]">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">MOQ: {product.minOrderQty || 1}</span>
                      </div>
                    </div>
                  );
                }

                const action = item.data;
                const IconComponent = action.icon;
                return (
                  <div
                    key={action.id}
                    onClick={() => action.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#F27D26]/10 border border-[#F27D26]/40 dark:bg-[#F27D26]/15'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-zinc-300 shrink-0">
                        <IconComponent className="w-4 h-4 text-[#F27D26]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {action.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium">
                          {action.category}
                        </span>
                      </div>
                    </div>
                    {action.shortcut && (
                      <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded shadow-xs text-slate-600 dark:text-zinc-400 shrink-0">
                        {action.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer helper */}
        <div className="p-3 bg-slate-50 dark:bg-[#0f0f0f] border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 rounded font-mono text-[9px]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 rounded font-mono text-[9px]">↵</kbd> Select
            </span>
          </div>
          <span className="font-semibold text-slate-600 dark:text-zinc-400">Eagle Excel B2B Platform</span>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
};
