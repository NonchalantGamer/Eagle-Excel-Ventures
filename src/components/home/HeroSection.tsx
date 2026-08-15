import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  FileSpreadsheet, 
  TrendingDown, 
  Truck, 
  ShieldCheck, 
  Ship, 
  Building2, 
  Boxes,
  CheckCircle2,
  Anchor,
  Globe2,
  Award
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface HeroSectionProps {
  onRequestQuote: () => void;
  onExploreCatalog: () => void;
}

// Highly compressed, responsive Cloudinary AVIF/WebP assets optimized for sub-second LCP
const HERO_BG_MOBILE = "https://res.cloudinary.com/doujptiz/image/upload/f_auto,q_auto:good,w_640,c_limit/v1786376597/ChatGPT_Image_Aug_10_2026_04_39_38_PM_eirooz.png";
const HERO_BG_TABLET = "https://res.cloudinary.com/doujptiz/image/upload/f_auto,q_auto:good,w_1024,c_limit/v1786376597/ChatGPT_Image_Aug_10_2026_04_39_38_PM_eirooz.png";
const HERO_BG_DESKTOP = "https://res.cloudinary.com/doujptiz/image/upload/f_auto,q_auto:good,w_1600,c_limit/v1786376597/ChatGPT_Image_Aug_10_2026_04_39_38_PM_eirooz.png";

export const HeroSection: React.FC<HeroSectionProps> = ({
  onRequestQuote,
  onExploreCatalog
}) => {
  const { currentCurrencyConfig } = useCurrency();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <section className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-white/10 text-white p-4 sm:p-7 md:p-10 transition-all bg-[#090d16]">
      
      {/* Background Cargo & Logistics Vessel Visual with High-End Contrast Filter & Instant Loading */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-br from-[#070b12] via-[#0e1626] to-[#0a0f1d]">
        <picture>
          <source
            media="(max-width: 640px)"
            srcSet={HERO_BG_MOBILE}
            type="image/webp"
          />
          <source
            media="(max-width: 1024px)"
            srcSet={HERO_BG_TABLET}
            type="image/webp"
          />
          <img
            src={HERO_BG_DESKTOP}
            srcSet={`${HERO_BG_MOBILE} 640w, ${HERO_BG_TABLET} 1024w, ${HERO_BG_DESKTOP} 1600w`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1280px"
            alt="Eagle Excel Commercial Procurement and Sea Freight Operations"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onLoad={() => setIsImageLoaded(true)}
            className={`w-full h-full object-cover object-[center_45%] transition-opacity duration-500 ease-out will-change-transform ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </picture>
      </div>

      {/* Layered Gradient Overlays ensuring crystal-clear text legibility in both themes */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-900/65 backdrop-blur-[0.5px] z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-[#F27D26]/20 via-transparent to-transparent pointer-events-none z-0" />

      {/* Hero Content Container */}
      <div className="relative z-10 w-full max-w-5xl space-y-3.5 sm:space-y-5">
        
        {/* Badges Ribbon */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-[#F27D26]/20 backdrop-blur-md border border-[#F27D26]/40 text-[#ff994d] text-[11px] sm:text-xs font-black shadow-xs">
            <Globe2 className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
            <span className="truncate">Direct Factory Sourcing • Guangzhou • Yiwu • Shenzhen</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[10px] sm:text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Pre-cleared at Lagos & Douala Port</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-zinc-200 text-[10px] sm:text-[11px] font-semibold">
            <span className="hidden sm:inline">Currency:</span>
            <strong className="text-white">{currentCurrencyConfig.flag} {currentCurrencyConfig.label}</strong>
          </div>
        </div>

        {/* High-Converting Main Headline */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-xl sm:text-3xl md:text-5xl font-extrabold tracking-tight font-serif leading-[1.2] sm:leading-[1.18] text-white drop-shadow-md">
            We Import Bulk Goods from China and Supply Businesses Across <span className="text-[#F27D26] underline decoration-[#F27D26]/40 underline-offset-4">Nigeria & Cameroon</span> at Wholesale Prices
          </h1>
          
          <p className="text-zinc-200 text-xs sm:text-sm md:text-base leading-relaxed max-w-3xl font-medium drop-shadow-xs">
            Eliminate middleman markups. <strong className="text-white font-bold">Eagle Excel Ventures</strong> provides end-to-end direct factory procurement, strict on-site quality inspection, container sea freight, fast customs clearance, and nationwide delivery across all 36 Nigerian states and 10 Cameroonian regions.
          </p>
        </div>

        {/* 2 Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-0.5">
          
          <button
            id="hero-request-quote-btn"
            type="button"
            onClick={onRequestQuote}
            className="py-3 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-[#F27D26] to-[#e06d1a] hover:from-[#ff8833] hover:to-[#ea7622] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[#F27D26]/30 transition-all btn-hover cursor-pointer touch-manipulation"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
            <span>Request a Bulk Quote</span>
          </button>

          <button
            id="hero-shop-bulk-btn"
            type="button"
            onClick={onExploreCatalog}
            className="py-3 px-5 sm:px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all btn-hover cursor-pointer touch-manipulation"
          >
            <Boxes className="w-4 h-4 text-[#F27D26]" />
            <span>Shop Bulk Products</span>
            <ArrowRight className="w-4 h-4 text-zinc-300" />
          </button>

        </div>

        {/* Industrial Highlights Metric Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-2.5 sm:pt-3 border-t border-white/15">
          
          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F27D26]/20 flex items-center justify-center text-[#F27D26] shrink-0 font-bold">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-black text-white truncate">Up to 45% Savings</div>
              <div className="text-[9px] sm:text-[10px] text-zinc-300 truncate">Direct factory wholesale</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
              <Ship className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-black text-white truncate">FCL & LCL Freight</div>
              <div className="text-[9px] sm:text-[10px] text-zinc-300 truncate">Sea container & pallets</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 font-bold">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-black text-white truncate">Lagos & Douala</div>
              <div className="text-[9px] sm:text-[10px] text-zinc-300 truncate">Warehouse ready stock</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-black text-white truncate">CAC & ANOR Certified</div>
              <div className="text-[9px] sm:text-[10px] text-zinc-300 truncate">RC-1849204 verified</div>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
};
