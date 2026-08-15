import React from 'react';
import { 
  Globe2, 
  Factory, 
  ShieldCheck, 
  Cpu, 
  Wrench, 
  Sparkles, 
  Ship, 
  CheckCircle2, 
  ArrowRight,
  Boxes,
  Award
} from 'lucide-react';

interface ChinaImportSupplyChainSectionProps {
  onOpenSupport?: () => void;
  onNavigateToRFQ?: () => void;
}

export const ChinaImportSupplyChainSection: React.FC<ChinaImportSupplyChainSectionProps> = ({ 
  onOpenSupport,
  onNavigateToRFQ 
}) => {
  const sourcingHubs = [
    {
      city: 'Shenzhen & Dongguan',
      region: 'Guangdong Tech Hub',
      category: 'Electronics & Solar Power',
      icon: Cpu,
      highlights: '5.5KVA Solar Inverters, 48V LiFePO4 Battery Banks, 4K Webcams & ANC Headsets',
      benefit: 'Direct OEM / Factory Price'
    },
    {
      city: 'Yongkang & Foshan',
      region: 'Zhejiang & Guangdong',
      category: 'Building Hardware & Tools',
      icon: Wrench,
      highlights: '20V Brushless Power Tools, ANSI Safety Helmets, Armored Security Doors',
      benefit: 'Heavy-Duty Pallet Lots'
    },
    {
      city: 'Shaoxing (Keqiao)',
      region: 'China Textile City',
      category: 'Textiles & Swiss Voile',
      icon: Sparkles,
      highlights: 'Swiss Voile Brocade Lace, 6-Yard African Wax Ankara, Industrial Uniform Fabrics',
      benefit: '50-Yard Master Bales'
    },
    {
      city: 'Wuxi & Ningbo',
      region: 'Jiangsu & Zhejiang',
      category: 'Industrial Machinery',
      icon: Factory,
      highlights: '12-Ton Hydraulic Shop Presses, Auto Carton Strapping, Heavy Duty Generators',
      benefit: 'Crated & Tested Units'
    }
  ];

  return (
    <section id="china-supply-chain-corridors" className="w-full space-y-4">
      
      {/* Main Container */}
      <div className="bg-gradient-to-br from-slate-900 via-[#141414] to-[#0a0a0a] text-white rounded-3xl p-5 sm:p-7 border border-white/10 shadow-lg relative overflow-hidden">
        
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F27D26]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#ff994d] text-xs font-bold">
                <Globe2 className="w-3.5 h-3.5 text-[#F27D26]" />
                Direct China-to-Africa Sourcing Corridors
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-serif text-white tracking-tight">
                Verified Chinese Manufacturing Epicenters
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                We maintain direct, vetted factory relationships across China's primary industrial cities, eliminating third-party agent markups and ensuring guaranteed pre-shipment quality standards for importers in Nigeria and Cameroon.
              </p>
            </div>

            {/* Quick Guarantees Badge */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start lg:self-auto shrink-0">
              <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-sm sm:text-base font-black text-[#F27D26]">850+</div>
                <div className="text-[10px] text-zinc-400 font-semibold uppercase">Vetted Plants</div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-sm sm:text-base font-black text-[#F27D26]">100%</div>
                <div className="text-[10px] text-zinc-400 font-semibold uppercase">SONCAP / ANOR</div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-sm sm:text-base font-black text-[#F27D26]">35%</div>
                <div className="text-[10px] text-zinc-400 font-semibold uppercase">Direct Savings</div>
              </div>
            </div>
          </div>

          {/* 4 China Sourcing Corridors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sourcingHubs.map((hub, idx) => {
              const Icon = hub.icon;
              return (
                <div 
                  key={idx}
                  className="p-4 rounded-2xl bg-white/5 backdrop-blur-xs border border-white/10 hover:border-[#F27D26]/40 hover:bg-white/10 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center border text-[#F27D26] bg-[#F27D26]/10 border-[#F27D26]/30">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-zinc-300">
                        {hub.benefit}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-black text-white">{hub.city}</div>
                      <div className="text-[11px] font-medium text-[#F27D26]">{hub.category}</div>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-snug">
                      {hub.highlights}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-zinc-300 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-[#F27D26] shrink-0" />
                    <span>Direct Factory Vetted</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Fast Action Strip */}
          <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300 text-[11px] sm:text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full container loads (FCL), pallet lots (LCL), and white-label manufacturing with customized packaging.</span>
            </div>

            {onOpenSupport && (
              <button
                type="button"
                onClick={onOpenSupport}
                className="w-full sm:w-auto py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-all shrink-0 cursor-pointer"
              >
                <span>Inquire on Sourcing Rates</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F27D26]" />
              </button>
            )}
          </div>

        </div>

      </div>

    </section>
  );
};
