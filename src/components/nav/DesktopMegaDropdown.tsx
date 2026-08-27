import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Star, 
  Flame, 
  Boxes,
  SunMedium, 
  Cpu, 
  Wrench, 
  Factory, 
  Package, 
  HelpCircle,
  Truck,
  RotateCcw,
  FileText,
  MessageSquare,
  User as UserIcon,
  ShoppingBag,
  Heart,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Building2,
  ChevronRight,
  CheckCircle2,
  PhoneCall,
  Globe,
  Ship,
  Zap,
  CreditCard,
  ClipboardList,
  Scale,
  Headphones,
  HardHat,
  BadgeCheck,
  Tag,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import { Product, Category, PageView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { getCachedCategories, getCategoriesFromDatabase, subscribeToCategories } from '../../services/productService';
import { CONTACT_INFO } from '../../constants/contact';

interface DesktopMegaDropdownProps {
  isOpen: boolean;
  activeSection: 'shop' | 'categories' | 'help' | 'account' | null;
  onClose: () => void;
  onNavigate: (view: PageView, options?: { 
    category?: string; 
    filter?: 'all' | 'new' | 'bestsellers' | 'featured' | 'deals'; 
    docTab?: 'nigeria' | 'cameroon' | 'payment_terms' | 'faq' 
  }) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenSupport: () => void;
  onOpenSettings: () => void;
  unreadSupportCount?: number;
  products?: Product[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const DesktopMegaDropdown: React.FC<DesktopMegaDropdownProps> = ({
  isOpen,
  activeSection,
  onClose,
  onNavigate,
  onOpenAuth,
  onOpenSupport,
  onOpenSettings,
  unreadSupportCount = 0,
  products = [],
  onMouseEnter,
  onMouseLeave
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { wishlistCount } = useWishlist();
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const navBar = document.getElementById('main-header');
      if (navBar && navBar.contains(e.target as Node)) {
        return; // Handled by header toggle buttons
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  // Dynamic category mapping with live product counts
  const categoryItems = useMemo(() => {
    const categoryCountMap = new Map<string, number>();
    products.forEach(p => {
      if (p.category) {
        const catKey = p.category.toLowerCase().trim();
        categoryCountMap.set(catKey, (categoryCountMap.get(catKey) || 0) + 1);
      }
    });

    const getIcon = (id: string) => {
      const lower = id.toLowerCase();
      if (lower.includes('solar') || lower.includes('energy')) return SunMedium;
      if (lower.includes('electronic') || lower.includes('gadget')) return Cpu;
      if (lower.includes('build') || lower.includes('hardware')) return Wrench;
      if (lower.includes('machin') || lower.includes('industrial')) return Factory;
      if (lower.includes('textil') || lower.includes('fabric') || lower.includes('garment')) return Sparkles;
      if (lower.includes('packag') || lower.includes('box')) return Package;
      return Boxes;
    };

    return categories.map(cat => ({
      ...cat,
      icon: getIcon(cat.id),
      count: categoryCountMap.get(cat.id.toLowerCase()) || 0
    }));
  }, [categories, products]);

  if (!isOpen || !activeSection) return null;

  return (
    <div
      ref={menuRef}
      id="desktop-header-mega-dropdown"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 right-0 w-full bg-slate-50/90 dark:bg-[#141414]/90 backdrop-blur-xl border-none shadow-none z-[120] animate-fadeIn text-slate-900 dark:text-zinc-100 transition-all duration-300 ease-out"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="min-h-[340px] max-h-[380px] flex flex-col justify-between">
          
          {/* ========================================================================= */}
          {/* VIEW 1: SHOP SPECIFIC DROPDOWN                                            */}
          {/* ========================================================================= */}
          {activeSection === 'shop' && (
            <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start h-full animate-fadeIn">
              
              {/* Column 1: Featured Collections */}
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <Layers className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Collections
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'all', category: 'all' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-zinc-300 group-hover:bg-[#F27D26] group-hover:text-black transition-colors shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors">
                          All Products
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Complete wholesale catalog
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'new', category: 'all' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">
                            New Arrivals
                          </span>
                          <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            NEW
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Fresh container arrivals
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'bestsellers', category: 'all' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-colors shrink-0">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                            Best Sellers
                          </span>
                          <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            TOP
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Highest volume re-orders
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'deals', category: 'all' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-[#F27D26]/10 dark:hover:bg-[#F27D26]/15 transition-all flex items-center justify-between group cursor-pointer border border-[#F27D26]/20 bg-[#F27D26]/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#F27D26] text-black flex items-center justify-center shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-[#e06d1a] dark:text-[#F27D26]">
                            Deals & Discounts
                          </span>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full bg-[#F27D26] text-black">
                            % OFF
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Volume price breaks & sales
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#F27D26] group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Column 2: Procurement Models */}
              <div className="col-span-3 space-y-2 border-l border-slate-200/50 dark:border-white/5 pl-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <BadgeCheck className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Wholesale Programs
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('catalog');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Direct Factory Pricing</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      Zero middleman markup directly from verified Chinese manufacturers.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('rfq');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5 text-blue-500" />
                      <span>OEM / ODM Custom Stamping</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      Custom branding, logo engraving, and bespoke wholesale specs.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('docs', { docTab: 'payment_terms' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                      <span>Trade Credit & Escrow</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      Multi-currency settlement with Letters of Credit (LC) & TT terms.
                    </div>
                  </button>
                </div>
              </div>

              {/* Column 3: Freight & Shipping Modes */}
              <div className="col-span-3 space-y-2 border-l border-slate-200/50 dark:border-white/5 pl-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <Ship className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Freight & Shipping
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('docs', { docTab: 'nigeria' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-500" />
                      <span>Full Container (FCL 20ft / 40ft)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      Dedicated sea container shipping directly to Lagos / Douala ports.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('docs', { docTab: 'cameroon' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>LCL Cargo Groupage</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      Consolidated sea freight for smaller carton quantities.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('orders');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-purple-500" />
                      <span>Doorstep Port Clearing</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      Complete customs clearance & warehouse delivery in Nigeria and Cameroon.
                    </div>
                  </button>
                </div>
              </div>

              {/* Column 4: Spotlight Promo Card */}
              <div className="col-span-3 border-l border-slate-200/50 dark:border-white/5 pl-6 flex flex-col justify-between h-full">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-black text-white border border-slate-800 dark:border-white/10 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-[#F27D26] text-black">
                      Factory Direct
                    </span>
                    <Flame className="w-4 h-4 text-[#F27D26]" />
                  </div>
                  <h4 className="text-sm font-black mt-2 font-serif text-white">
                    China-Africa Container Supply
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Access over 10,000+ verified industrial & consumer product lines with negotiated volume rates.
                  </p>
                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'deals', category: 'all' });
                      onClose();
                    }}
                    className="mt-3 w-full py-2 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>View Wholesale Deals</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onNavigate('catalog', { filter: 'all' });
                      onClose();
                    }}
                    className="text-xs font-bold text-[#e06d1a] dark:text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Browse All 10,000+ Inventory Items</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: CATEGORIES SPECIFIC DROPDOWN                                      */}
          {/* ========================================================================= */}
          {activeSection === 'categories' && (
            <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start h-full animate-fadeIn">
              
              {/* Column 1: Primary Power & Electronics */}
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <SunMedium className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Energy & Electronics
                  </h3>
                </div>

                <div className="space-y-1">
                  {categoryItems.slice(0, 3).map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onNavigate('catalog', { category: cat.id });
                          onClose();
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-zinc-300 group-hover:bg-[#F27D26] group-hover:text-black transition-colors shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors truncate">
                              {cat.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                              {cat.count > 0 ? `${cat.count} models available` : 'Wholesale imports'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Industrial & Building */}
              <div className="col-span-3 space-y-2 border-l border-slate-200/50 dark:border-white/5 pl-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <Wrench className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Hardware & Industry
                  </h3>
                </div>

                <div className="space-y-1">
                  {categoryItems.slice(3, 6).map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onNavigate('catalog', { category: cat.id });
                          onClose();
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-zinc-300 group-hover:bg-[#F27D26] group-hover:text-black transition-colors shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors truncate">
                              {cat.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                              {cat.count > 0 ? `${cat.count} models available` : 'Wholesale imports'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 3: Commercial & Commodities */}
              <div className="col-span-3 space-y-2 border-l border-slate-200/50 dark:border-white/5 pl-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <Package className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Commercial Supplies
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('catalog', { category: 'all' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Commercial Solar Streetlights</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      High-lumen municipal & estate lighting fixtures.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { category: 'all' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5 text-blue-500" />
                      <span>Agricultural Equipment</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      Grain mills, packaging machines & processing plants.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('catalog', { category: 'all' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Packaging & Cartons</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 pl-5">
                      Industrial bulk corrugated boxes, tapes & sealing bags.
                    </div>
                  </button>
                </div>
              </div>

              {/* Column 4: Sourcing Assistance Card */}
              <div className="col-span-3 border-l border-slate-200/50 dark:border-white/5 pl-6 flex flex-col justify-between h-full">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 dark:border-white/10 shadow-lg">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#F27D26]">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Custom Sourcing</span>
                  </div>
                  <h4 className="text-sm font-black mt-2 font-serif text-white">
                    Need an Unlisted Category?
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Our on-ground sourcing teams in Guangzhou and Yiwu can procure any raw material or equipment.
                  </p>
                  <button
                    onClick={() => {
                      onNavigate('rfq');
                      onClose();
                    }}
                    className="mt-3 w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-[#F27D26] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Request Custom RFQ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onNavigate('catalog');
                      onClose();
                    }}
                    className="text-xs font-bold text-[#e06d1a] dark:text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Full Category Directory</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: HELP & SUPPORT SPECIFIC DROPDOWN                                  */}
          {/* ========================================================================= */}
          {activeSection === 'help' && (
            <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start h-full animate-fadeIn">
              
              {/* Column 1: Order & Tracking */}
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <Truck className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Shipping & Tracking
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('orders');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">
                          Track My Order
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Real-time air & sea cargo milestones
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('docs', { docTab: 'nigeria' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">
                          Nigeria Logistics & Ports
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Lagos (Apapa/Tin Can) & Onne terminals
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('docs', { docTab: 'cameroon' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-colors shrink-0">
                        <Ship className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                          Cameroon Logistics Hub
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Douala Port & Yaoundé bonded delivery
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Column 2: Guarantees & Terms */}
              <div className="col-span-3 space-y-2 border-l border-slate-200/50 dark:border-white/5 pl-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <ShieldCheck className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Guarantees & Terms
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('docs', { docTab: 'payment_terms' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-purple-500 transition-colors">
                          Returns & Claims Policy
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Pre-shipment inspection warranty
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('docs', { docTab: 'payment_terms' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                        <Scale className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">
                          Payment Terms & Escrow
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Naira, CFA & USD settlement guide
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Column 3: Documentation & FAQs */}
              <div className="col-span-3 space-y-2 border-l border-slate-200/50 dark:border-white/5 pl-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <FileText className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Documentation & FAQs
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('docs', { docTab: 'faq' });
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                        <QuestionIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">
                          Wholesale FAQs
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          MOQ, invoices & lead-time answers
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('docs');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-zinc-300 group-hover:bg-[#F27D26] group-hover:text-black transition-colors shrink-0">
                        <ClipboardList className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors">
                          Import Document Center
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          PAAR, Form M & Bill of Lading guides
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Column 4: Live Trade Desk Support */}
              <div className="col-span-3 border-l border-slate-200/50 dark:border-white/5 pl-6 flex flex-col justify-between h-full">
                <div className="p-4 rounded-2xl bg-slate-900 text-white dark:bg-black border border-slate-800 dark:border-white/10 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-[#F27D26] text-black">
                      24/7 Desk
                    </span>
                    {unreadSupportCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-red-500 text-white animate-pulse">
                        {unreadSupportCount} Active
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black mt-2 font-serif text-white">
                    Need Real-time Trade Help?
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Connect directly with an on-duty import specialist for container allocations, quotations, or tracking.
                  </p>
                  <button
                    onClick={() => {
                      onOpenSupport();
                      onClose();
                    }}
                    className="mt-3 w-full py-2 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Live Support Desk</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onNavigate('docs');
                      onClose();
                    }}
                    className="text-xs font-bold text-[#e06d1a] dark:text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Visit Full Documentation Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 4: ACCOUNT SPECIFIC DROPDOWN                                         */}
          {/* ========================================================================= */}
          {activeSection === 'account' && (
            <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start h-full animate-fadeIn">
              
              {/* Column 1: User Identity / Auth Options */}
              <div className="col-span-3 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#F27D26]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                      Account Profile
                    </h3>
                  </div>
                  {currentUser && (
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-[#F27D26]/15 text-[#e06d1a] dark:text-[#F27D26] border border-[#F27D26]/30">
                      {isAdmin ? 'Admin' : 'Wholesale Buyer'}
                    </span>
                  )}
                </div>

                {currentUser ? (
                  <div className="space-y-1">
                    <div className="p-2.5 rounded-xl bg-slate-200/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
                      <div className="text-xs font-black text-slate-900 dark:text-zinc-100 truncate">
                        {userProfile?.displayName || currentUser.email}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                        {currentUser.email}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate('profile');
                        onClose();
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-[#F27D26]" />
                        <span>Manage Profile & Details</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        onOpenSettings();
                        onClose();
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Account Preferences</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        onClose();
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-all flex items-center justify-between text-xs font-bold cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Account</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                      Sign in to view wholesale pricing, manage shipment milestones, and download invoices.
                    </p>
                    <button
                      onClick={() => {
                        onOpenAuth('login');
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenAuth('signup');
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-900 dark:text-zinc-100 font-bold text-xs border border-slate-300 dark:border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Wholesale Account</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Column 2: Orders & Procurement */}
              <div className="col-span-3 space-y-2 border-l border-slate-200/50 dark:border-white/5 pl-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <ShoppingBag className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Orders & Invoices
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('orders');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">
                          My Purchase Orders
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Active & completed wholesale orders
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('orders');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">
                          Proforma & Invoices
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Download official tax & customs receipts
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Column 3: Saved Lists & Wishlist */}
              <div className="col-span-3 space-y-2 border-l border-slate-200/50 dark:border-white/5 pl-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <Heart className="w-4 h-4 text-red-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    Saved & Wishlist
                  </h3>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('wishlist');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors shrink-0">
                        <Heart className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-red-500 transition-colors">
                            Saved Wholesale Items
                          </span>
                          {wishlistCount > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                              {wishlistCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Bookmark models for bulk re-order
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('rfq');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-colors shrink-0">
                        <ClipboardList className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                          My RFQ Quotations
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Review factory bids & specs
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Column 4: VIP Wholesale Benefits */}
              <div className="col-span-3 border-l border-slate-200/50 dark:border-white/5 pl-6 flex flex-col justify-between h-full">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 dark:border-white/10 shadow-lg">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#F27D26]">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Direct Factory Sourcing</span>
                  </div>
                  <h4 className="text-sm font-black mt-2 font-serif text-white">
                    Need Custom Import Orders?
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Direct China-to-Africa container manufacturing & bulk quote negotiation.
                  </p>
                  <button
                    onClick={() => {
                      onNavigate('rfq');
                      onClose();
                    }}
                    className="mt-3 w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-[#F27D26] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Request RFQ Quote</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      onClose();
                    }}
                    className="text-xs font-bold text-[#e06d1a] dark:text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Account Dashboard</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
