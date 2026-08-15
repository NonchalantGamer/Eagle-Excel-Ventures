import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  FileSpreadsheet, 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Sparkles, 
  TrendingDown, 
  Globe2, 
  Anchor, 
  Cpu, 
  Wrench, 
  Package, 
  Factory, 
  Star, 
  ChevronRight,
  Headphones,
  Award,
  Layers,
  MapPin
} from 'lucide-react';
import { Product, PageView } from '../types';
import { HeroSection } from '../components/home/HeroSection';
import { WhatWeImportSection } from '../components/home/WhatWeImportSection';
import { HowItWorksSection } from '../components/home/HowItWorksSection';
import { LocalTrustSection } from '../components/home/LocalTrustSection';
import { ShippingLogisticsSection } from '../components/home/ShippingLogisticsSection';
import { TrustCredibilitySection } from '../components/home/TrustCredibilitySection';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { ChinaImportSupplyChainSection } from '../components/home/ChinaImportSupplyChainSection';
import { RegionalWholesaleNetworkSection } from '../components/home/RegionalWholesaleNetworkSection';
import { EnterpriseProcurementSection } from '../components/home/EnterpriseProcurementSection';
import { ProductCard } from '../components/ProductCard';
import { useCurrency } from '../context/CurrencyContext';

interface HomePageProps {
  products: Product[];
  onNavigate: (view: PageView) => void;
  onSelectProduct: (product: Product) => void;
  onRequestQuote: (category?: string, productName?: string) => void;
  onOpenSupport: (prefilledText?: string) => void;
  onSelectCategoryFilter?: (category: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  onNavigate,
  onSelectProduct,
  onRequestQuote,
  onOpenSupport,
  onSelectCategoryFilter
}) => {
  const { currency, formatPrice } = useCurrency();
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  // Listen for real-time live product additions
  useEffect(() => {
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('eagle_product_newly_added', handleNewArrival);
      }
    };
  }, []);

  // Featured 4-8 products for quick showcase, prioritizing newly added arrivals and featured items
  const featuredProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const aIsNew = newlyAddedIds.has(a.id) ? 1 : 0;
        const bIsNew = newlyAddedIds.has(b.id) ? 1 : 0;
        if (aIsNew !== bIsNew) return bIsNew - aIsNew;

        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        if (aTime !== bTime) return bTime - aTime;

        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      })
      .slice(0, 8);
  }, [products, newlyAddedIds]);

  const handleCategoryClick = (catId: string) => {
    onSelectCategoryFilter?.(catId);
    onNavigate('catalog');
  };

  return (
    <div className="homepage-section-flow animate-fadeIn pb-6">
      
      {/* 1. Modern Hero Section */}
      <HeroSection 
        onRequestQuote={() => onNavigate('rfq')}
        onExploreCatalog={() => onNavigate('catalog')}
      />

      {/* 2. Key Live Enterprise Stats Ribbon */}
      <section className="reveal-on-scroll bg-white dark:bg-[#141414] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/5 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-white/5">
          <div className="space-y-1 pt-1 md:pt-0">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F27D26] font-serif">1,200+</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Containers Cleared</div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Direct from China to Lagos & Douala</p>
          </div>
          <div className="space-y-1 pt-1 md:pt-0 md:pl-4 lg:md:pl-6">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-serif">850+</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Verified Factories</div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Guangzhou, Yiwu, Shenzhen & Ningbo</p>
          </div>
          <div className="space-y-1 pt-1 md:pt-0 md:pl-4 lg:md:pl-6">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-blue-600 dark:text-blue-400 font-serif">35%</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Bulk Volume Savings</div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Eliminating 3rd-party broker fees</p>
          </div>
          <div className="space-y-1 pt-1 md:pt-0 md:pl-4 lg:md:pl-6">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-purple-600 dark:text-purple-400 font-serif">4 Hubs</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Regional Depots</div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Lagos, Douala, Kano & Guangzhou</p>
          </div>
        </div>
      </section>

      {/* 3. Featured Wholesale Inventory Showcase */}
      <section className="reveal-on-scroll space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black">
              <Boxes className="w-3.5 h-3.5" />
              Ready In-Stock Inventory
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900 dark:text-white">
              Featured Wholesale Products & Pallet Lots
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Immediate dispatch available from our Lagos (Trade Fair) and Douala (Akwa) warehouses
            </p>
          </div>

          <button
            onClick={() => onNavigate('catalog')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-black hover:bg-[#F27D26] dark:hover:bg-[#F27D26] hover:text-black dark:hover:text-black transition-all btn-hover self-start sm:self-auto cursor-pointer"
          >
            <span>View All {products.length} Products</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-5">
          {featuredProducts.map((product, idx) => (
            <div key={product.id} className={`h-full reveal-on-scroll stagger-${Math.min(idx + 1, 6)} product-card-container`}>
              <ProductCard
                product={product}
                onSelect={onSelectProduct}
                isNewlyAdded={newlyAddedIds.has(product.id)}
                searchQuery=""
              />
            </div>
          ))}
        </div>
      </section>

      {/* 4. What We Import & Wholesale Lines */}
      <div className="reveal-on-scroll">
        <WhatWeImportSection 
          onSelectCategory={handleCategoryClick}
          onRequestQuoteWithCategory={(categoryName) => {
            onRequestQuote(categoryName);
            onNavigate('rfq');
          }}
        />
      </div>

      {/* 5. Direct China-to-Africa Supply Chain Showcase */}
      <div className="reveal-on-scroll">
        <ChinaImportSupplyChainSection 
          onOpenSupport={onOpenSupport}
          onNavigateToRFQ={() => onNavigate('rfq')}
        />
      </div>

      {/* 6. Step-by-Step Import & Procurement Process */}
      <div className="reveal-on-scroll">
        <HowItWorksSection onRequestQuote={() => onNavigate('rfq')} />
      </div>

      {/* 7. Regional Distribution & Warehouse Network */}
      <div className="reveal-on-scroll">
        <RegionalWholesaleNetworkSection onOpenSupport={onOpenSupport} />
      </div>

      {/* 8. Physical Depots & Local Contact Information */}
      <div className="reveal-on-scroll">
        <LocalTrustSection 
          onOpenWhatsApp={(country) => {
            const phone = country === 'nigeria' ? '2347063360982' : '237677626356';
            window.open(`https://wa.me/${phone}?text=Hello%20Eagle%20Excel%20Ventures,%20I%20am%20inquiring%20about%20wholesale%20procurement`, '_blank');
          }}
          onRequestQuote={() => onNavigate('rfq')}
        />
      </div>

      {/* 9. Verified Trust & Legal Registrations */}
      <div className="reveal-on-scroll">
        <TrustCredibilitySection />
      </div>

      {/* 10. Shipping Corridors & Port Clearance */}
      <div className="reveal-on-scroll">
        <ShippingLogisticsSection onRequestQuote={() => onNavigate('rfq')} />
      </div>

      {/* 11. Customer Testimonials Across Nigeria & Cameroon */}
      <div className="reveal-on-scroll">
        <TestimonialsSection />
      </div>

      {/* 12. Interactive Procurement & Custom RFQ Banner */}
      <section className="reveal-on-scroll relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white p-6 sm:p-8 md:p-10 border border-[#F27D26]/30 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F27D26]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26] text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            Custom Factory Procurement & White-Labeling
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif leading-tight">
            Need a Specific Product Sourced from China in Container Volume?
          </h2>
          
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
            Send us your product specification, technical drawings, or AliExpress/1688 links. Our Guangzhou sourcing specialists negotiate direct manufacturer pricing, inspect quality on-site, and manage sea freight clearance directly to your warehouse.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <button
              onClick={() => onNavigate('rfq')}
              className="py-3.5 px-7 rounded-2xl bg-gradient-to-r from-[#F27D26] to-[#e06d1a] hover:from-[#ff8833] hover:to-[#ea7622] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl hover:shadow-[#F27D26]/30 transition-all btn-hover cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
              <span>Launch Step-by-Step RFQ Builder</span>
            </button>

            <button
              onClick={() => onNavigate('supply-chain')}
              className="py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all btn-hover cursor-pointer"
            >
              <Globe2 className="w-4 h-4 text-[#F27D26]" />
              <span>Explore China Supply Corridors</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
