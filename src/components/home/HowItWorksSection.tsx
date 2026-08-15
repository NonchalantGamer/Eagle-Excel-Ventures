import React from 'react';
import { 
  FileSpreadsheet, 
  SearchCheck, 
  Ship, 
  Truck, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Building2
} from 'lucide-react';

interface HowItWorksSectionProps {
  onRequestQuote: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onRequestQuote }) => {
  const steps = [
    {
      number: '01',
      title: 'Order Stock or Submit Sourcing RFQ',
      description: 'Select ready-to-dispatch inventory from our local warehouses or submit your custom container/pallet product specifications for direct China factory procurement.',
      icon: FileSpreadsheet,
      badge: 'Step 1: Selection'
    },
    {
      number: '02',
      title: 'China Sourcing & Quality Inspection',
      description: 'Our ground teams in Guangzhou, Yiwu, Shenzhen, and Ningbo verify factory certifications, audit production samples, and run 100% pre-shipment quality checks.',
      icon: SearchCheck,
      badge: 'Step 2: Quality Control'
    },
    {
      number: '03',
      title: 'Container Shipping & Port Clearance',
      description: 'Goods are containerized and shipped via fast sea freight (FCL/LCL) or air cargo. We manage 100% customs clearance through Lagos Apapa, Tin Can & Douala Port with SONCAP / ANOR compliance.',
      icon: Ship,
      badge: 'Step 3: Port Clearance'
    },
    {
      number: '04',
      title: 'Nationwide Delivery or Depot Pickup',
      description: 'Pick up immediately at our secure Lagos (Trade Fair / Apapa) or Douala (Akwa) warehouses, or enjoy insured door-to-door freight to your store or construction site.',
      icon: Truck,
      badge: 'Step 4: Fulfillment'
    }
  ];

  return (
    <section id="how-it-works-section" className="w-full space-y-4">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black">
          <Clock className="w-3.5 h-3.5" />
          End-to-End Import Process
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-serif tracking-tight text-slate-900 dark:text-white">
          How Bulk Sourcing & Importation Works
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          From verified Chinese manufacturing floors directly to your retail shelves or warehouse in Nigeria and Cameroon in 4 transparent steps.
        </p>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div 
              key={idx}
              className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs space-y-3 relative flex flex-col justify-between group hover:border-[#F27D26]/50 transition-all"
            >
              <div className="space-y-2.5">
                
                {/* Step Number & Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-300 dark:text-white/10 group-hover:text-[#F27D26] transition-colors">
                    {step.number}
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300">
                    {step.badge}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
                  <Icon className="w-5 h-5" />
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#F27D26] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>

              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Guaranteed Zero Risk</span>
              </div>
            </div>
          );
        })}

      </div>

      {/* Process CTA Callout Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-white/10">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm sm:text-base font-black text-white">
            Have a Specific Product or Bill of Quantities to Source?
          </h3>
          <p className="text-xs text-zinc-300">
            Submit your packing list, target factory price, or sample specs to our China trade desk.
          </p>
        </div>

        <button
          type="button"
          onClick={onRequestQuote}
          className="py-2.5 px-5 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs sm:text-sm flex items-center gap-2 shrink-0 shadow-md transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
          <span>Request Custom Import RFQ</span>
        </button>
      </div>

    </section>
  );
};
