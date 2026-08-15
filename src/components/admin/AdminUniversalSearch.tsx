import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Package, 
  ShoppingCart, 
  Users, 
  MessageSquare, 
  Megaphone, 
  Sparkles, 
  Plus, 
  Layers, 
  Code, 
  TrendingUp, 
  ArrowRight, 
  X,
  BookOpen,
  History
} from 'lucide-react';
import { Product, Order, UserProfile } from '../../types';

interface AdminUniversalSearchProps {
  products: Product[];
  orders: Order[];
  users: UserProfile[];
  onSelectTab: (tab: string) => void;
  onSelectProduct?: (product: Product) => void;
  onSelectOrder?: (order: Order) => void;
  onOpenProductModal?: () => void;
  onOpenCategoryModal?: () => void;
  onOpenStaffManual?: () => void;
}

export const AdminUniversalSearch: React.FC<AdminUniversalSearchProps> = ({
  products,
  orders,
  users,
  onSelectTab,
  onSelectProduct,
  onSelectOrder,
  onOpenProductModal,
  onOpenCategoryModal,
  onOpenStaffManual,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const trimmed = query.trim().toLowerCase();

  // Search matches
  const matchedActions = [
    { label: 'Add New Wholesale Product', action: () => onOpenProductModal?.(), icon: Plus, category: 'Quick Action' },
    { label: 'Staff Operating Manual & SOP Guide', action: () => onOpenStaffManual?.(), icon: BookOpen, category: 'Staff Training' },
    { label: 'Manage Product Categories', action: () => onOpenCategoryModal?.(), icon: Layers, category: 'Quick Action' },
    { label: 'Send Wholesale Broadcast to Buyers', action: () => onSelectTab('broadcasts'), icon: Megaphone, category: 'Marketing' },
    { label: 'Open Live Support Helpdesk', action: () => onSelectTab('messages'), icon: MessageSquare, category: 'Operations' },
    { label: 'View Commercial Purchase Orders', action: () => onSelectTab('orders'), icon: ShoppingCart, category: 'Fulfillment' },
    { label: 'View Inventory & SKUs', action: () => onSelectTab('products'), icon: Package, category: 'Inventory' },
    { label: 'Product Audit Log & Live Sync Trail', action: () => onSelectTab('audit'), icon: History, category: 'Technical' },
    { label: 'View Regional Trade Analytics', action: () => onSelectTab('analytics'), icon: TrendingUp, category: 'Analytics' },
    { label: 'Supabase Database & API Reference', action: () => onSelectTab('docs'), icon: Code, category: 'Technical' },
  ].filter(a => !trimmed || a.label.toLowerCase().includes(trimmed) || a.category.toLowerCase().includes(trimmed));

  const matchedProducts = products.filter(p => 
    trimmed && (p.name.toLowerCase().includes(trimmed) || p.sku.toLowerCase().includes(trimmed) || p.category.toLowerCase().includes(trimmed))
  ).slice(0, 4);

  const matchedOrders = orders.filter(o => 
    trimmed && (o.orderNumber.toLowerCase().includes(trimmed) || o.customerName?.toLowerCase().includes(trimmed) || o.companyName?.toLowerCase().includes(trimmed))
  ).slice(0, 4);

  const matchedUsers = users.filter(u => 
    trimmed && (u.displayName.toLowerCase().includes(trimmed) || u.email.toLowerCase().includes(trimmed) || u.companyName?.toLowerCase().includes(trimmed))
  ).slice(0, 4);

  const totalResults = matchedActions.length + matchedProducts.length + matchedOrders.length + matchedUsers.length;

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Jump to SKU, PO #, Buyer, or Tab... (Press ⌘K)"
          className="w-full pl-10 pr-9 py-2 text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] focus:bg-white dark:focus:bg-[#161616] outline-none placeholder-slate-400 dark:placeholder-zinc-500 transition-all"
        />
        {query ? (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/10">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Instant Dropdown Search Results */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[999] max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 animate-fadeIn text-xs">
          
          {/* Quick Actions & Navigation */}
          {matchedActions.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center justify-between">
                <span>Navigation & Actions</span>
                <span className="text-[#F27D26] font-mono text-[9px]">{matchedActions.length}</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {matchedActions.slice(0, 5).map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        act.action();
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left font-medium text-slate-700 dark:text-zinc-300 hover:bg-[#F27D26]/10 hover:text-[#F27D26] flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#F27D26] group-hover:scale-110 transition-transform" />
                        <span>{act.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 group-hover:text-[#F27D26] font-sans">
                        {act.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Products */}
          {matchedProducts.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center justify-between">
                <span>Products & SKUs</span>
                <span className="text-emerald-500 font-mono text-[9px]">{matchedProducts.length}</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {matchedProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (onSelectProduct) onSelectProduct(p);
                      onSelectTab('products');
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={p.images[0]} alt="" className="w-6 h-6 rounded-md object-cover bg-black" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">SKU: {p.sku} • ${p.price.toFixed(2)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {p.stock} units
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Orders */}
          {matchedOrders.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center justify-between">
                <span>Purchase Orders</span>
                <span className="text-[#F27D26] font-mono text-[9px]">{matchedOrders.length}</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {matchedOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      if (onSelectOrder) onSelectOrder(o);
                      onSelectTab('orders');
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-bold font-mono text-slate-900 dark:text-white">{o.orderNumber}</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-500">{o.companyName || o.customerName} • ${o.total.toFixed(2)}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      o.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                      o.status === 'shipped' ? 'bg-purple-500/10 text-purple-400' :
                      o.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {o.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Users */}
          {matchedUsers.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center justify-between">
                <span>Buyers & Accounts</span>
                <span className="text-purple-500 font-mono text-[9px]">{matchedUsers.length}</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {matchedUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectTab('customers');
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{u.displayName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">{u.email}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      u.role === 'admin' ? 'bg-[#F27D26]/10 text-[#F27D26]' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {trimmed && totalResults === 0 && (
            <div className="p-6 text-center text-slate-500 dark:text-zinc-500">
              <p>No results found for "{query}"</p>
              <p className="text-[11px] mt-1 text-slate-400 dark:text-zinc-600">
                Try searching by SKU (e.g. EE-AUD-902), PO number, customer name, or "manual".
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
