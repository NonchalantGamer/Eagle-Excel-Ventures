import React from 'react';
import { 
  Building2, 
  Globe2, 
  ShieldCheck, 
  Award, 
  MapPin, 
  Truck, 
  Ship, 
  FileCheck, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Anchor,
  Clock,
  Phone,
  Mail,
  FileSpreadsheet
} from 'lucide-react';
import { PageView } from '../types';
import { getBrandLogo } from '../constants/branding';

interface AboutPageProps {
  onNavigate: (view: PageView) => void;
  onOpenSupport: (prefilledText?: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onNavigate,
  onOpenSupport
}) => {
  return (
    <div className="space-y-7 sm:space-y-9 animate-fadeIn pb-10">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
        <button 
          onClick={() => onNavigate('home')}
          className="hover:text-[#F27D26] transition-colors cursor-pointer"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-bold text-slate-900 dark:text-white">About Eagle Excel Ventures</span>
      </div>

      {/* Hero Section */}
      <section className="reveal-on-scroll relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-6 sm:p-8 md:p-10 border border-slate-200/80 dark:border-white/10 shadow-xl">
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#ff994d] text-xs font-black">
            <Building2 className="w-3.5 h-3.5 text-[#F27D26]" />
            CAC Registered: RC-7281944 • Established 2018
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold font-serif leading-tight">
            Connecting African Commercial Enterprises Directly with China's Premier Manufacturing Network
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed font-medium">
            Eagle Excel Ventures is a cross-border procurement, wholesale supply, and end-to-end maritime logistics enterprise operating across Lagos, Douala, Kano, and Guangzhou. We remove intermediary markups to deliver verified industrial, electrical, and commercial goods at true factory prices.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onNavigate('rfq')}
              className="py-3 px-6 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all btn-hover cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Partner With Us / Request RFQ</span>
            </button>

            <button
              onClick={() => onOpenSupport('Hello Eagle Excel team, I want to discuss a corporate procurement partnership.')}
              className="py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all btn-hover cursor-pointer"
            >
              <Phone className="w-4 h-4 text-[#F27D26]" />
              <span>Contact Executive Desk</span>
            </button>
          </div>
        </div>
      </section>

      {/* Core Company Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="reveal-on-scroll stagger-1 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            100% Quality & Authenticity Guarantee
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Every product batch is physically audited by our on-the-ground engineering inspectors in China before container loading. Zero counterfeit components, verified raw materials.
          </p>
        </div>

        <div className="reveal-on-scroll stagger-2 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <Ship className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Seamless Customs Clearance
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Full compliance with Nigeria Customs Service (NCS), SONCAP import certification, Form M/PAAR processing, and Cameroon ANOR standards with zero demurrage guarantees.
          </p>
        </div>

        <div className="reveal-on-scroll stagger-3 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Unmatched Bulk Savings
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            We bypass middlemen and trading companies, passing wholesale discounts of 20% to 35% directly to distributors, contractors, and retail chain buyers.
          </p>
        </div>
      </section>

      {/* Strategic Operating Hubs & Depots */}
      <section className="reveal-on-scroll space-y-4">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black">
            <MapPin className="w-3.5 h-3.5" />
            Global & Regional Footprint
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900 dark:text-white">
            Our Physical Operating Facilities
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Dedicated logistics centers ensuring swift warehousing, inspection, and nationwide dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lagos HQ */}
          <div className="reveal-on-scroll stagger-1 p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇳🇬</span>
              <span className="text-[10px] font-bold text-[#F27D26] px-2 py-0.5 rounded-full bg-[#F27D26]/10">Primary Hub</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Lagos Central Depot</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Plot 14, Commercial Avenue, Trade Fair Complex & Apapa Port Terminal, Lagos, Nigeria
              </p>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2">
              <strong>Capacity:</strong> 12,000 sq.ft Warehousing
            </div>
          </div>

          {/* Douala Hub */}
          <div className="reveal-on-scroll stagger-2 p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇨🇲</span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10">CEMAC Depot</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Douala Distribution Center</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Boulevard de la Liberté, Akwa Commercial Zone, Douala, Cameroon
              </p>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2">
              <strong>Capacity:</strong> 8,500 sq.ft Warehousing
            </div>
          </div>

          {/* Kano Hub */}
          <div className="reveal-on-scroll stagger-3 p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇳🇬</span>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full bg-purple-500/10">Northern Depot</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Kano Inland Logistics Hub</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Bompai Industrial Area, Kano State, Nigeria
              </p>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2">
              <strong>Capacity:</strong> 6,000 sq.ft Warehousing
            </div>
          </div>

          {/* Guangzhou Hub */}
          <div className="reveal-on-scroll stagger-4 p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇨🇳</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">China Sourcing</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Guangzhou Operations Desk</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Tower B, Wanda Plaza, Baiyun District, Guangzhou, Guangdong, China
              </p>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2">
              <strong>Capability:</strong> Factory Audits & Container Sealing
            </div>
          </div>
        </div>
      </section>

      {/* Direct Contact & Executive Desks */}
      <section className="reveal-on-scroll p-6 sm:p-8 rounded-3xl bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-white/5 space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-serif">
            Direct Regional Contact Information
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Reach our regional directors and sourcing officers directly for partnerships, procurement orders, and container freight.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 space-y-2">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
              <span>🇳🇬</span> Nigeria Procurement Desk
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              <a href="tel:+2347063360982" className="hover:text-[#F27D26] transition-colors">
                +234 706 336 0982
              </a>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Lagos Trade Fair Complex, Apapa Corridor & Nationwide Delivery
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 space-y-2">
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
              <span>🇨🇲</span> Cameroon Regional Hub
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              <a href="tel:+237677626356" className="hover:text-[#F27D26] transition-colors">
                +237 677 626 356
              </a>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Boulevard de la Liberté, Akwa Douala & Yaoundé Hub
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 space-y-2">
            <div className="text-xs font-bold text-[#F27D26] uppercase flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Official Communications
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              <a href="mailto:priscaegesi1980@gmail.com" className="hover:text-[#F27D26] transition-colors font-mono text-xs sm:text-sm">
                priscaegesi1980@gmail.com
              </a>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Commercial Invoices, Proforma Requests & Corporate Partnerships
            </p>
          </div>
        </div>
      </section>

      {/* Leadership & Enterprise Procurement Statement */}
      <section className="reveal-on-scroll bg-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 space-y-6">
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-bold text-[#F27D26] uppercase tracking-wider">
            Enterprise Procurement Commitment
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold font-serif">
            "Our mission is to empower African commerce with direct factory access and rock-solid supply chain security."
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Whether you require a single pallet lot of in-stock solar equipment from our Lagos warehouse or 10 full containers of custom-branded building materials from Foshan, Eagle Excel Ventures guarantees transparent pricing, certified testing, and accountable doorstep delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={() => onNavigate('catalog')}
            className="py-3 px-6 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs transition-all btn-hover cursor-pointer"
          >
            Explore Product Lines
          </button>
          <button
            onClick={() => onNavigate('docs')}
            className="py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition-all btn-hover cursor-pointer"
          >
            View Import Documentation Guide
          </button>
        </div>
      </section>

    </div>
  );
};
