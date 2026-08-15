import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Settings2, 
  Scale, 
  Award, 
  Lock, 
  BadgePercent, 
  Send,
  Building,
  Boxes,
  HelpCircle
} from 'lucide-react';

interface EnterpriseProcurementSectionProps {
  onOpenSupport?: (prefilledText?: string) => void;
}

export const EnterpriseProcurementSection: React.FC<EnterpriseProcurementSectionProps> = ({ onOpenSupport }) => {
  const [rfqCategory, setRfqCategory] = useState<string>('Industrial Equipment & Machinery');
  const [rfqVolume, setRfqVolume] = useState<string>('1x 40ft HC Container (Full Load)');
  const [rfqDestination, setRfqDestination] = useState<string>('Nigeria (Lagos / Apapa Port)');
  const [rfqOEMRequired, setRfqOEMRequired] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleRfqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    const summary = `[Direct Factory RFQ Request]\n• Category: ${rfqCategory}\n• Target Volume: ${rfqVolume}\n• Destination Port: ${rfqDestination}\n• OEM Custom Branding Required: ${rfqOEMRequired ? 'YES (Custom Logo/Packaging)' : 'Standard Wholesale Brand'}`;
    
    if (onOpenSupport) {
      setTimeout(() => {
        onOpenSupport(summary);
      }, 400);
    }
  };

  return (
    <section className="w-full space-y-6 pt-6 pb-4 reveal-on-scroll">
      
      {/* Main Grid: Capabilities Overview on Left, Interactive RFQ Tool on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Sourcing Capabilities & Institutional Guarantees */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26] text-xs font-bold shadow-xs">
              <Award className="w-3.5 h-3.5" />
              OEM / ODM Direct Manufacturing & Private Labeling
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-serif text-slate-900 dark:text-zinc-100">
              Custom Factory Procurement & Enterprise Sourcing
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-zinc-400 leading-relaxed">
              Require proprietary product specifications, bespoke brand debossing, or multi-container factory production runs? <strong className="text-slate-900 dark:text-zinc-200">Eagle Excel Ventures</strong> provides turnkey factory representation in China, managing everything from tooling dies to sea freight delivery.
            </p>
          </div>

          {/* 3 Core Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
                <Settings2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                OEM Custom Branding
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Custom packaging, English & French manuals, debossed logos, and certified EAN-13 barcodes.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
                <Scale className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                Guaranteed Landed Price
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Shield your business with locked-in quotes that include factory cost, freight, insurance, and duty.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                Verified B2B Escrow
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Capital is safeguarded under milestone-based releases tied to Bill of Lading and port clearance milestones.
              </p>
            </div>

          </div>

          {/* Trust Guarantees List */}
          <div className="p-5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Enterprise Institutional Safeguards:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>On-site factory video audit before production</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>100% Pre-stuffing container seal inspections</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>SONCAP & ANOR statutory compliance</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Zero demurrage port clearance guarantee</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Direct Factory RFQ Submission Card */}
        <div className="lg:col-span-5 bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/5 shadow-xl space-y-5 transition-colors duration-300">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#F27D26]" />
                Request Custom Bulk RFQ
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Direct factory pricing calculation for container & pallet orders
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20">
              Direct China Rates
            </span>
          </div>

          <form onSubmit={handleRfqSubmit} className="space-y-4 text-xs">
            
            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-zinc-200 block">
                Target Product Sourcing Category
              </label>
              <select
                value={rfqCategory}
                onChange={e => setRfqCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none transition-colors font-medium"
              >
                <option value="Industrial Equipment & Machinery">Industrial Equipment & Heavy Machinery</option>
                <option value="Commercial Electronics & Smart Hardware">Commercial Electronics & Smart Displays</option>
                <option value="Industrial Packaging & Logistics Consumables">Industrial Packaging & Logistics Consumables</option>
                <option value="Occupational Health, Safety & PPE Supplies">Occupational Safety & Certified PPE Supplies</option>
                <option value="Commercial Office Furniture & Tech Infrastructure">Commercial Office Furniture & Tech Infrastructure</option>
                <option value="Custom Hardware & Structural Components">Custom Hardware & Structural Components</option>
              </select>
            </div>

            {/* Target Volume */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-zinc-200 block">
                Estimated Order Volume / Freight Size
              </label>
              <select
                value={rfqVolume}
                onChange={e => setRfqVolume(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none transition-colors font-medium"
              >
                <option value="1x 40ft HC Container (Full Load - Approx 68-76 CBM)">1x 40ft High Cube Container (68 - 76 CBM)</option>
                <option value="Multiple 40ft HC Containers (Fleet Volume 2-10 FCL)">Multiple 40ft HC Containers (2-10 FCL Fleet)</option>
                <option value="1x 20ft Standard Container (Approx 28-33 CBM)">1x 20ft Standard Container (28 - 33 CBM)</option>
                <option value="Consolidated Pallets (5 - 20 Pallets LCL)">Consolidated Pallets (5 - 20 Pallets LCL)</option>
                <option value="Trial Commercial Batch (1 - 4 Pallets)">Trial Commercial Batch (1 - 4 Pallets)</option>
              </select>
            </div>

            {/* Target Destination */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-zinc-200 block">
                Destination Port & Regional Warehouse
              </label>
              <select
                value={rfqDestination}
                onChange={e => setRfqDestination(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none transition-colors font-medium"
              >
                <option value="Nigeria - Lagos (Apapa / Tin Can Port & Depots)">🇳🇬 Nigeria — Lagos (Apapa / Tin Can / Alaba Depot)</option>
                <option value="Nigeria - Onitsha & Asaba Hub">🇳🇬 Nigeria — Onitsha / Asaba Commercial Node</option>
                <option value="Nigeria - Aba Commercial Hub">🇳🇬 Nigeria — Aba / Port Harcourt Onne Node</option>
                <option value="Nigeria - Kano Northern Gateway">🇳🇬 Nigeria — Kano / Northern States Hub</option>
                <option value="Cameroon - Douala (Port Autonomous Depot)">🇨🇲 Cameroon — Douala (Port Autonomous & Akwa Hub)</option>
                <option value="Cameroon - Yaoundé Central Depot">🇨🇲 Cameroon — Yaoundé (Mvan Central Hub)</option>
                <option value="Cameroon - Bafoussam / West Region">🇨🇲 Cameroon — Bafoussam (Western Corridor)</option>
              </select>
            </div>

            {/* OEM Option Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer hover:border-[#F27D26]/40 transition-colors">
              <input
                type="checkbox"
                checked={rfqOEMRequired}
                onChange={e => setRfqOEMRequired(e.target.checked)}
                className="mt-0.5 rounded text-[#F27D26] focus:ring-[#F27D26]"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-zinc-200 block text-xs">
                  Request OEM / Custom Brand Labeling
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                  Includes custom logo debossing, private carton printing, and bilingual packaging.
                </span>
              </div>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#F27D26] to-[#e06d1a] hover:from-[#ff8833] hover:to-[#ea7622] text-black font-extrabold text-xs flex items-center justify-center gap-2 btn-hover transition-all whitespace-nowrap cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Submit Sourcing Inquiry</span>
            </button>

            <p className="text-[10px] text-center text-slate-500 dark:text-zinc-400">
              Institutional account managers provide full landed landed quotes with tariff breakdowns within 4 business hours.
            </p>

          </form>

        </div>

      </div>

    </section>
  );
};
