import React, { useEffect, useRef } from 'react';
import { 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Star, 
  Flame, 
  ArrowRight, 
  ChevronRight,
  Truck,
  ShieldCheck,
  PackageCheck,
  Zap
} from 'lucide-react';
import { PageView } from '../../types';

interface ShopMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: PageView, options?: { category?: string; filter?: 'all' | 'new' | 'bestsellers' | 'featured' | 'deals' }) => void;
  onRequestQuote?: () => void;
}

export const ShopMenuDropdown: React.FC<ShopMenuDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onRequestQuote
}) => {
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
      const triggerBtn = document.getElementById('nav-shop-dropdown-btn');
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

  const shopItems = [
    {
      id: 'all',
      filter: 'all' as const,
      label: 'All Products',
      subtitle: 'Complete wholesale catalog & import lines',
      icon: Layers,
      badge: 'Full Inventory',
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-300'
    },
    {
      id: 'new',
      filter: 'new' as const,
      label: 'New Arrivals',
      subtitle: 'Latest factory shipments & newly listed products',
      icon: Sparkles,
      badge: 'NEW',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
    },
    {
      id: 'bestsellers',
      filter: 'bestsellers' as const,
      label: 'Best Sellers',
      subtitle: 'Highest volume & most re-ordered bulk stock',
      icon: TrendingUp,
      badge: 'TOP',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
    },
    {
      id: 'featured',
      filter: 'featured' as const,
      label: 'Featured Products',
      subtitle: 'Curated factory-direct selections with guaranteed stock',
      icon: Star,
      badge: 'FEATURED',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
    },
    {
      id: 'deals',
      filter: 'deals' as const,
      label: 'Deals & Discounts',
      subtitle: 'Exclusive tiered bulk discounts & clearance prices',
      icon: Flame,
      badge: '% OFF',
      badgeColor: 'bg-[#F27D26]/20 text-[#e06d1a] dark:text-[#F27D26] border border-[#F27D26]/40'
    }
  ];

  return (
    <div
      ref={dropdownRef}
      id="desktop-shop-menu-dropdown"
      className="absolute left-0 top-full mt-2 w-[520px] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3.5 z-[120] animate-fadeIn text-slate-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        
        {/* Main 5 items column */}
        <div className="md:col-span-3 space-y-1">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-white/5 mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F27D26]">
              Explore Catalog
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
              Direct B2B Pricing
            </span>
          </div>

          {shopItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate('catalog', { filter: item.filter, category: 'all' });
                  onClose();
                }}
                className="w-full p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-white/5 flex items-start gap-2.5 transition-all text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#F27D26]/10 dark:bg-[#F27D26]/15 flex items-center justify-center shrink-0 group-hover:bg-[#F27D26] transition-colors mt-0.5">
                  <Icon className="w-4 h-4 text-[#F27D26] group-hover:text-black transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#F27D26] dark:group-hover:text-[#F27D26] transition-colors">
                      {item.label}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                    {item.subtitle}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
              </button>
            );
          })}
        </div>

        {/* Featured Promo & Custom RFQ Banner */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#F27D26]/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26] text-[9px] font-black uppercase tracking-wider">
              <Zap className="w-3 h-3" />
              Factory Direct
            </div>
            <h4 className="text-xs font-black tracking-tight text-white leading-tight">
              Container Load & Tiered Savings
            </h4>
            <p className="text-[10px] text-zinc-300 leading-relaxed">
              Order full 20ft/40ft containers or LCL pallets directly with landed clearance in Lagos or Douala.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 mt-3 space-y-1.5 relative z-10">
            <button
              onClick={() => {
                onNavigate('catalog', { filter: 'deals' });
                onClose();
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#F27D26] hover:bg-[#e06d1a] text-black text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>View Volume Deals</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                onNavigate('rfq');
                onClose();
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <span>Custom Sourcing RFQ</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
