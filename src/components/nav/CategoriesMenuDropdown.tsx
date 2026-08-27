import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  SunMedium, 
  Cpu, 
  Wrench, 
  Sparkles, 
  Factory, 
  Package, 
  Layers, 
  Boxes, 
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { Category, Product, PageView } from '../../types';
import { INITIAL_CATEGORIES } from '../../data/seedData';
import { getCachedCategories, getCategoriesFromDatabase, subscribeToCategories } from '../../services/productService';

interface CategoriesMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: PageView, options?: { category?: string }) => void;
  products?: Product[];
}

export const CategoriesMenuDropdown: React.FC<CategoriesMenuDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
  products = []
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>(getCachedCategories);

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
      const triggerBtn = document.getElementById('nav-categories-dropdown-btn');
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

  // Derive all active categories with dynamic product counts
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

  return (
    <div
      ref={dropdownRef}
      id="desktop-categories-menu-dropdown"
      className="absolute left-0 top-full mt-2 w-[620px] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-4 z-[120] animate-fadeIn text-slate-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F27D26]">
            Wholesale Categories
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F27D26]/10 text-[#F27D26] font-bold">
            {availableCategories.length} Departments
          </span>
        </div>
        <button
          onClick={() => {
            onNavigate('catalog', { category: 'all' });
            onClose();
          }}
          className="text-xs font-bold text-[#F27D26] hover:text-[#e06d1a] flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>View All Products</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Grid of dynamic categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {availableCategories.map((cat) => {
          return (
            <button
              key={cat.id}
              onClick={() => {
                onNavigate('catalog', { category: cat.id });
                onClose();
              }}
              className="p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 flex items-start gap-3 text-left transition-all cursor-pointer group"
            >
              <div className="w-8.5 h-8.5 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-[#F27D26]/15 flex items-center justify-center shrink-0 transition-colors mt-0.5">
                {getCategoryIcon(cat.id)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#F27D26] dark:group-hover:text-[#F27D26] transition-colors truncate">
                    {cat.name}
                  </span>
                  {typeof cat.itemCount === 'number' && (
                    <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-zinc-500 shrink-0">
                      {cat.itemCount} {cat.itemCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                  {cat.description || `Verified factory imports & ready warehouse stock`}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom info bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 px-2">
        <span className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Factory Verified & Inspection Certified
        </span>
        <button
          onClick={() => {
            onNavigate('rfq');
            onClose();
          }}
          className="font-bold text-[#F27D26] hover:underline cursor-pointer"
        >
          Can't find a category? Request Sourcing →
        </button>
      </div>

    </div>
  );
};
