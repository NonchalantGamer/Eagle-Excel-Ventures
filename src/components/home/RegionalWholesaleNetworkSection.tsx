import React from 'react';
import { 
  Building2, 
  Truck, 
  Coins, 
  ShieldCheck, 
  ArrowRight,
  PackageCheck,
  CheckCircle2
} from 'lucide-react';

interface RegionalWholesaleNetworkSectionProps {
  onOpenSupport?: () => void;
}

export const RegionalWholesaleNetworkSection: React.FC<RegionalWholesaleNetworkSectionProps> = ({ 
  onOpenSupport 
}) => {
  const valuePillars = [
    {
      icon: Coins,
      title: 'Multi-Currency Local Settlement',
      tag: 'Zero FX Friction',
      description: 'Settle invoices in Nigerian Naira (₦ NGN), Central African CFA Franc (FCFA XAF), or USD Wire ($) with official commercial tax receipts.'
    },
    {
      icon: Truck,
      title: 'Rapid Fleet & Pallet Delivery',
      tag: '24 - 48hr Dispatch',
      description: 'Company-managed haulage trucks and delivery vans ensure secure delivery across all Nigerian states and Cameroon regions.'
    },
    {
      icon: ShieldCheck,
      title: 'Bonded Local Buffer Reserves',
      tag: '150,000+ Units Ready',
      description: 'Never wait on ocean transit. High-velocity electronics, hardware, and packaging lines are in-stock for immediate pickup.'
    }
  ];

  return (
    <section id="regional-wholesale-network" className="w-full space-y-4">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-white/5 pb-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-bold">
            <Building2 className="w-3.5 h-3.5" />
            Localized B2B Fulfillment & Warehousing
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-serif text-slate-900 dark:text-white tracking-tight">
            Wholesale Logistics & Multi-Currency Fulfillment
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Supplying retail conglomerates, industrial contractors, and merchant distributors with guaranteed local inventory and high-capacity dispatch.
          </p>
        </div>

        {onOpenSupport && (
          <button
            type="button"
            onClick={onOpenSupport}
            className="text-xs font-bold text-[#e06d1a] dark:text-[#F27D26] hover:underline flex items-center gap-1.5 self-start sm:self-end cursor-pointer"
          >
            <span>Inquire on Local Stock</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3 Value Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {valuePillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div 
              key={idx}
              className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-2xl flex items-center justify-center border text-[#F27D26] bg-[#F27D26]/10 border-[#F27D26]/30">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300">
                    {pillar.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                <span>Verified Commercial Service</span>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
};
