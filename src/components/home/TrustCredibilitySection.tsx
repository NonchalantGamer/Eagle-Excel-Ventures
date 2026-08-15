import React from 'react';
import { 
  ShieldCheck, 
  Award, 
  Building2, 
  MapPin, 
  Globe2, 
  Container, 
  CheckCircle2, 
  FileCheck2, 
  Clock, 
  Anchor, 
  Users2,
  Boxes
} from 'lucide-react';

export const TrustCredibilitySection: React.FC = () => {
  return (
    <section className="w-full space-y-4">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black">
          <ShieldCheck className="w-4 h-4" />
          Verified Corporate Trust & Institutional Credentials
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-serif tracking-tight text-slate-900 dark:text-white">
          Why Over 500+ Importers & Wholesalers Rely On Us
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          Registered with the Corporate Affairs Commission (CAC Nigeria) and Ministry of Commerce (Cameroon), <strong className="text-slate-900 dark:text-zinc-200">Eagle Excel Ventures</strong> has handled over 1,200+ containerized bulk cargo deliveries from China to West Africa.
        </p>
      </div>

      {/* 4 Trust Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Official Company Registration */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Official CAC & ANOR Registration
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Nigeria CAC Registration: <strong className="text-slate-800 dark:text-zinc-200">RC-1849204</strong>.<br />
              Cameroon Trade Reg: <strong className="text-slate-800 dark:text-zinc-200">RC/DLA/2019/B/1429</strong>.<br />
              Compliant with SONCAP & ANOR import standards.
            </p>
          </div>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" /> 100% Legally Bonded Trade
          </div>
        </div>

        {/* Card 2: 12+ Years Direct Factory Sourcing */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              12+ Years China Operations
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Operating our own ground inspection and procurement teams in Guangzhou, Yiwu, Shenzhen, and Ningbo ports since 2012.
            </p>
          </div>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" /> Direct Factory Pricing
          </div>
        </div>

        {/* Card 3: 1,200+ Containers Imported */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Bulk Import Specialists
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Over 1,200+ 40ft High Cube containers and 500+ tons of consolidated air freight cleared through Apapa, Tin Can & Douala Port.
            </p>
          </div>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" /> Zero Demurrage Guarantee
          </div>
        </div>

        {/* Card 4: Multi-Location Warehouse Network */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Physical Regional Warehouses
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Heavy storage facilities in Lagos (Trade Fair & Apapa), Kano, Onitsha, and Douala (Akwa Logistics Depot) for immediate pickup.
            </p>
          </div>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" /> 24-48h Local Dispatch
          </div>
        </div>

      </div>

      {/* Visual Proof: Authentic Industrial Operations & Container Fleet */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#F27D26]" />
              Real Sourcing Operations: China Factories to West African Depots
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Verified ground logistics, container stuffing, and customs clearance facilities
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300">
            Live Supply Chain Proof
          </span>
        </div>

        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 border border-slate-200 dark:border-white/10">
            <img 
              src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80" 
              alt="Container Shipping Port Sourcing"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 flex flex-col justify-end">
              <span className="text-[10px] font-bold text-[#F27D26] uppercase tracking-wider">China Sea Ports</span>
              <span className="text-xs font-black text-white">Ningbo & Shenzhen Container Terminal</span>
            </div>
          </div>

          <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 border border-slate-200 dark:border-white/10">
            <img 
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80" 
              alt="Bulk Warehouse Racking Logistics"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 flex flex-col justify-end">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Lagos Distribution Hub</span>
              <span className="text-xs font-black text-white">Trade Fair Complex Bulk Warehouse</span>
            </div>
          </div>

          <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 border border-slate-200 dark:border-white/10">
            <img 
              src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80" 
              alt="Quality Control and Sourcing Audit"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 flex flex-col justify-end">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Quality Assurance</span>
              <span className="text-xs font-black text-white">On-Site Factory Pre-Shipment Inspection</span>
            </div>
          </div>

          <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 border border-slate-200 dark:border-white/10">
            <img 
              src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=600&auto=format&fit=crop&q=80" 
              alt="Douala Cameroon Port Logistics Hub"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 flex flex-col justify-end">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Douala Central Depot</span>
              <span className="text-xs font-black text-white">Port Autonome de Douala Logistics Node</span>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
};
