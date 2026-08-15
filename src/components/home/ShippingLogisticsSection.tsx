import React from 'react';
import { 
  Ship, 
  Plane, 
  Truck, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet,
  Building2,
  Anchor
} from 'lucide-react';

interface ShippingLogisticsSectionProps {
  onRequestQuote?: () => void;
}

export const ShippingLogisticsSection: React.FC<ShippingLogisticsSectionProps> = ({
  onRequestQuote
}) => {
  return (
    <section id="shipping-and-logistics-section" className="w-full space-y-4">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black">
          <Ship className="w-3.5 h-3.5" />
          Shipping Timelines & Customs Clearance Guarantees
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-serif tracking-tight text-slate-900 dark:text-white">
          Direct Freight Corridors to Nigeria & Cameroon
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          Transparent transit times, verified bills of lading, and zero demurrage customs handling for full container loads (FCL) and consolidated groupage cargo (LCL).
        </p>
      </div>

      {/* 3 Shipping Modes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Sea Freight */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 mb-1">
              Lowest Cost per CBM
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Container Sea Freight (FCL / LCL)
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Full 20ft & 40ft High Cube containers or consolidated pallets from Ningbo, Shenzhen, Shanghai & Guangzhou ports.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Transit Duration:</span>
              <strong className="text-slate-900 dark:text-white font-black">25 - 35 Days</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Destination Ports:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">Lagos Apapa & Douala Port</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Customs Clearance:</span>
              <span className="text-[#F27D26] font-bold">100% Pre-cleared</span>
            </div>
          </div>
        </div>

        {/* Air Cargo Express */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#F27D26]/10 text-[#F27D26] mb-1">
              Fastest Commercial Transit
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Air Express Bulk Cargo
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Direct air cargo flights from Guangzhou Baiyun & Hong Kong for high-value electronics, critical machinery spares & urgent stock.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Transit Duration:</span>
              <strong className="text-slate-900 dark:text-white font-black">5 - 8 Days</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Airports:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">Lagos (LOS) & Douala (DLA)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Cargo Security:</span>
              <span className="text-[#F27D26] font-bold">Tamper-Proof Insured</span>
            </div>
          </div>
        </div>

        {/* Local Warehouse & Nationwide Dispatch */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 mb-1">
              Ready In-Stock Goods
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Warehouse Pickup & Nationwide Trucking
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Same-day warehouse collection in Lagos & Douala, or dedicated freight delivery to all 36 Nigerian states and 10 Cameroon regions.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Pickup Speed:</span>
              <strong className="text-slate-900 dark:text-white font-black">Same Day / 24-48 Hours</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Coverage:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">100% Nigeria & Cameroon</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Waybill Tracking:</span>
              <span className="text-[#F27D26] font-bold">Live GPS & SMS</span>
            </div>
          </div>
        </div>

      </div>

      {/* Customs & SONCAP/ANOR Guarantees */}
      <div className="p-6 rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Statutory Standards & Clearing Guarantees:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F27D26] shrink-0" />
            <span>SONCAP Certified Products</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F27D26] shrink-0" />
            <span>ANOR Statutory Clearance</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F27D26] shrink-0" />
            <span>Zero Demurrage Risk Shield</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F27D26] shrink-0" />
            <span>Bill of Lading Escrow Protection</span>
          </div>
        </div>
      </div>

    </section>
  );
};
