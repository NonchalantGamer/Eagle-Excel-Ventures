import React, { useState } from 'react';
import { 
  Globe2, 
  Ship, 
  Plane, 
  Truck, 
  ShieldCheck, 
  SearchCheck, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight, 
  Calculator, 
  Clock, 
  Anchor, 
  Building2, 
  Boxes, 
  Factory, 
  AlertCircle,
  HelpCircle,
  Cpu,
  Wrench,
  Sparkles,
  MapPin
} from 'lucide-react';
import { PageView } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface SupplyChainPageProps {
  onNavigate: (view: PageView) => void;
  onRequestQuote: (category?: string, productName?: string) => void;
  onOpenSupport: (prefilledText?: string) => void;
}

export const SupplyChainPage: React.FC<SupplyChainPageProps> = ({
  onNavigate,
  onRequestQuote,
  onOpenSupport
}) => {
  const { formatPrice } = useCurrency();

  // Interactive Container & Transit Estimator state
  const [calcCargoType, setCalcCargoType] = useState<'electronics' | 'building' | 'textiles' | 'machinery' | 'general'>('electronics');
  const [calcVolume, setCalcVolume] = useState<'lcl_small' | 'lcl_medium' | 'fcl_20' | 'fcl_40hq' | 'air_express'>('fcl_40hq');
  const [calcDestination, setCalcDestination] = useState<'lagos_apapa' | 'douala_cameroon' | 'kano_depot' | 'port_harcourt'>('lagos_apapa');

  // Dynamic estimate calculations
  const calculateEstimates = () => {
    let cbm = 68;
    let baseSeaFreightUSD = 4200;
    let baseAirUSD = 0;
    let seaDays = '28 - 35 Days';
    let airDays = '5 - 8 Days';
    let customsDays = '4 - 7 Business Days';
    let containerTitle = '40ft High Cube Container (FCL)';

    if (calcVolume === 'lcl_small') {
      cbm = 5;
      baseSeaFreightUSD = 950;
      containerTitle = 'LCL Groupage Consolidation (5 CBM)';
    } else if (calcVolume === 'lcl_medium') {
      cbm = 15;
      baseSeaFreightUSD = 2400;
      containerTitle = 'LCL Groupage Consolidation (15 CBM)';
    } else if (calcVolume === 'fcl_20') {
      cbm = 28;
      baseSeaFreightUSD = 2800;
      containerTitle = '20ft Standard Ocean Container (FCL)';
    } else if (calcVolume === 'fcl_40hq') {
      cbm = 68;
      baseSeaFreightUSD = 4200;
      containerTitle = '40ft High Cube Container (FCL)';
    } else if (calcVolume === 'air_express') {
      cbm = 2;
      baseAirUSD = 3600;
      containerTitle = 'Commercial Air Cargo Express';
    }

    if (calcDestination === 'douala_cameroon') {
      seaDays = '32 - 38 Days';
      customsDays = '5 - 8 Days (ANOR / Douala Port)';
      baseSeaFreightUSD += 300;
    } else if (calcDestination === 'kano_depot') {
      seaDays = '35 - 42 Days (Including bonded rail/truck transfer)';
      baseSeaFreightUSD += 850;
    } else if (calcDestination === 'port_harcourt') {
      seaDays = '30 - 36 Days (Onne Port)';
      baseSeaFreightUSD += 200;
    }

    return {
      cbm,
      baseSeaFreightUSD,
      baseAirUSD,
      seaDays,
      airDays,
      customsDays,
      containerTitle
    };
  };

  const est = calculateEstimates();

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
        <span className="font-bold text-slate-900 dark:text-white">China-to-Africa Supply Chain</span>
      </div>

      {/* Hero Banner */}
      <section className="reveal-on-scroll relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-6 sm:p-8 md:p-10 border border-slate-200/80 dark:border-white/10 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(#F27D26_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#ff994d] text-xs font-black">
            <Globe2 className="w-3.5 h-3.5 text-[#F27D26]" />
            Guangzhou • Yiwu • Shenzhen • Ningbo • Foshan Corridor
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold font-serif leading-tight">
            Direct China Factory Sourcing, Quality Audits & Port Clearance to Nigeria & Cameroon
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed font-medium">
            We bridge the gap between Tier-1 Chinese manufacturers and African enterprise buyers. From factory credential verification and sample prototyping to full container load (FCL) sea freight and customs release at Lagos Apapa and Douala ports.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onNavigate('rfq')}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F27D26] to-[#e06d1a] hover:from-[#ff8833] hover:to-[#ea7622] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:shadow-[#F27D26]/30 transition-all btn-hover cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
              <span>Submit Container Sourcing RFQ</span>
            </button>

            <button
              onClick={() => onOpenSupport('Hello Eagle Excel, I want to inquire about container sea shipping schedules and freight rates from Guangzhou to Apapa.')}
              className="py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all btn-hover cursor-pointer"
            >
              <Ship className="w-4 h-4 text-[#F27D26]" />
              <span>Inquire Freight Schedule</span>
            </button>
          </div>
        </div>
      </section>

      {/* 1. China Manufacturing Hubs Sourcing Map */}
      <section className="reveal-on-scroll space-y-4">
        <div className="text-center max-w-3xl mx-auto space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black">
            <Factory className="w-3.5 h-3.5" />
            China Factory Sourcing Hubs
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900 dark:text-white">
            Where We Source Your Bulk Orders in China
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Our permanent sourcing agents and quality engineers are stationed across China's major industrial manufacturing belts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Hub 1 */}
          <div className="reveal-on-scroll stagger-1 p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold tracking-wider text-orange-600 dark:text-orange-400">
                Guangdong Province
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                Guangzhou & Shenzhen Corridor
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Primary hub for pure sine wave solar inverters, lithium battery banks, ANC audio electronics, 4K cameras, and consumer tech accessories.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] space-y-1 text-slate-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>On-site Baiyun District warehouse</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Direct factory floor inspections</span>
              </div>
            </div>
          </div>

          {/* Hub 2 */}
          <div className="reveal-on-scroll stagger-2 p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold tracking-wider text-blue-600 dark:text-blue-400">
                Zhejiang Province
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                Yiwu, Ningbo & Shaoxing Hub
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Center for general commodities, brushless power tools, titanium drill sets, Swiss voile brocade, African wax Ankara textiles, and packaging boxes.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] space-y-1 text-slate-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Yiwu International Trade City desks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Ningbo seaport direct container loading</span>
              </div>
            </div>
          </div>

          {/* Hub 3 */}
          <div className="reveal-on-scroll stagger-3 p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold tracking-wider text-purple-600 dark:text-purple-400">
                Foshan & Shandong
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                Heavy Machinery & Building Materials
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Specialized clusters for armored steel security doors, 12-ton hydraulic workshop presses, auto-strappers, and commercial furniture.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] space-y-1 text-slate-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>SONCAP certified testing labs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Crated heavy machinery protection</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Landed Freight & Transit Time Estimator Tool */}
      <section className="reveal-on-scroll bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-white/5 shadow-xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black">
              <Calculator className="w-3.5 h-3.5" />
              Live Estimation Engine
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-serif text-slate-900 dark:text-white">
              Container Freight & Landed Logistics Estimator
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Simulate container volume, transit duration, port customs clearance, and landed delivery timelines
            </p>
          </div>

          <button
            onClick={() => onNavigate('rfq')}
            className="py-2.5 px-5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-bold shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            Lock in Live Quote
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Cargo Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                1. Select Sourcing Category:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'electronics', label: 'Electronics & Solar' },
                  { id: 'building', label: 'Building & Tools' },
                  { id: 'textiles', label: 'Textiles & Voile' },
                  { id: 'machinery', label: 'Heavy Machinery' },
                  { id: 'general', label: 'General Goods' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCalcCargoType(cat.id as any)}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      calcCargoType === cat.id
                        ? 'bg-[#F27D26]/10 border-[#F27D26] text-[#e06d1a] dark:text-[#F27D26]'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                2. Shipping & Container Volume:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'fcl_40hq', label: '40ft High Cube Container (FCL)', sub: '~68 CBM (Maximum savings)' },
                  { id: 'fcl_20', label: '20ft Standard Container (FCL)', sub: '~28 CBM' },
                  { id: 'lcl_medium', label: 'LCL Consolidated Pallets', sub: '15 CBM Groupage' },
                  { id: 'lcl_small', label: 'LCL Small Consignment', sub: '5 CBM Groupage' },
                  { id: 'air_express', label: 'Commercial Air Cargo Express', sub: 'Urgent Dispatch (5-8 days)' }
                ].map(vol => (
                  <button
                    key={vol.id}
                    type="button"
                    onClick={() => setCalcVolume(vol.id as any)}
                    className={`p-3 rounded-2xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      calcVolume === vol.id
                        ? 'bg-[#F27D26]/15 border-[#F27D26] text-slate-950 dark:text-white ring-1 ring-[#F27D26]'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <div>{vol.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal mt-0.5">{vol.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Destination Port */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                3. Destination Port / Depot:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'lagos_apapa', label: '🇳🇬 Lagos (Apapa / Tin Can Port)', sub: 'Direct Ocean Berthing' },
                  { id: 'douala_cameroon', label: '🇨🇲 Douala Port (Cameroon)', sub: 'ANOR Certified Clearance' },
                  { id: 'port_harcourt', label: '🇳🇬 Port Harcourt (Onne Port)', sub: 'South-South / East Corridor' },
                  { id: 'kano_depot', label: '🇳🇬 Kano Inland Dry Port / Depot', sub: 'Northern Regional Hub' }
                ].map(dest => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setCalcDestination(dest.id as any)}
                    className={`p-3 rounded-2xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      calcDestination === dest.id
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <div>{dest.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal mt-0.5">{dest.sub}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Output Results Card (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-3xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-white/10 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-zinc-400">Estimate Breakdown</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Pre-cleared
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Container Format:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{est.containerTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Cargo Volume:</span>
                  <span className="font-bold text-slate-900 dark:text-white">~{est.cbm} CBM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Sea Transit Time:</span>
                  <span className="font-bold text-[#F27D26]">{est.seaDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Customs Clearance:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{est.customsDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Est. Freight per CBM:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatPrice(calcVolume === 'air_express' ? 1800 : Math.round(est.baseSeaFreightUSD / est.cbm))} / CBM
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
                <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Guaranteed Zero Demurrage Surcharge
                </div>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                  Includes Form M / PAAR filing, SONCAP import clearance certificate, and terminal handling.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onRequestQuote(calcCargoType, `${est.containerTitle} to ${calcDestination}`);
                onNavigate('rfq');
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all btn-hover cursor-pointer"
            >
              <span>Apply This Configuration to RFQ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. 4-Stage Strict Quality Control & Factory Auditing Protocol */}
      <section className="space-y-6">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black">
            <SearchCheck className="w-3.5 h-3.5" />
            Strict Quality Assurance
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900 dark:text-white">
            Our 4-Stage Factory Verification Protocol
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Never risk sub-par or counterfeit goods. Every shipment undergoes rigorous testing before leaving China.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#F27D26] font-black text-xs flex items-center justify-center">
              01
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Factory Background & ISO Audit
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              We physically visit factory facilities, inspect business licenses, verify manufacturing lines, and confirm ISO 9001 certifications.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 font-black text-xs flex items-center justify-center">
              02
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Pre-Production Golden Sample
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              We produce and dispatch golden sample units directly to your office or test them under video review with your technical team.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 font-black text-xs flex items-center justify-center">
              03
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              During Production Inspection (DPI)
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              When 30-50% of the order is completed, our inspectors conduct random stress testing, dimension checks, and electrical safety validation.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs flex items-center justify-center">
              04
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Pre-Shipment Container Sealing
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              100% check of carton strapping, pallet shrink-wrapping, and official tamper-proof container security bolt seals with photographic reports.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#F27D26] to-[#e06d1a] text-black space-y-4">
        <div className="max-w-3xl space-y-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight">
            Ready to Streamline Your China Importation Channel?
          </h3>
          <p className="text-xs sm:text-sm font-semibold opacity-90 leading-relaxed">
            Get transparent landed quotes with direct factory pricing, insurance, sea shipping, and customs clearance included.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('rfq')}
            className="py-3 px-6 rounded-2xl bg-black hover:bg-slate-900 text-white font-bold text-xs shadow-xl transition-all btn-hover cursor-pointer"
          >
            Launch Sourcing RFQ
          </button>
          <button
            onClick={() => onNavigate('catalog')}
            className="py-3 px-6 rounded-2xl bg-white/20 hover:bg-white/30 text-black font-bold text-xs transition-all btn-hover cursor-pointer"
          >
            Browse Ready Warehouse Inventory
          </button>
        </div>
      </section>

    </div>
  );
};
