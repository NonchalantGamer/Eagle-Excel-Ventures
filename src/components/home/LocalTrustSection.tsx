import React from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Globe2, 
  FileText
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

interface LocalTrustSectionProps {
  onOpenWhatsApp?: (country: 'nigeria' | 'cameroon') => void;
  onRequestQuote?: () => void;
}

export const LocalTrustSection: React.FC<LocalTrustSectionProps> = ({
  onOpenWhatsApp,
  onRequestQuote
}) => {
  return (
    <section id="trust-and-locations-section" className="w-full space-y-4">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black">
          <Building2 className="w-3.5 h-3.5" />
          Physical Office & Regional Warehouse Locations
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-slate-900 dark:text-white">
          Visit Our Warehouses or Contact Regional Desks
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          We operate physical distribution depots and commercial inspection desks in Nigeria, Cameroon, and China for verified, transparent wholesale trade.
        </p>
      </div>

      {/* 3 Regional Cards: Nigeria, Cameroon, China */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Nigeria Operations */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇳🇬</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300">
                Nigeria Head Office
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Nigeria Distribution & Depots
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Eagle Excel Ventures Limited (RC-1849204)
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <span>
                  <strong>Lagos Hub:</strong> Plot 14 Commercial Avenue, Lagos Trade Fair Complex & Apapa Port Corridor, Lagos State.
                </span>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <span>
                  <strong>Regional Depots:</strong> Kano (Bompai), Onitsha (Main Market Rd), Aba (Asa Rd Node).
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#F27D26] shrink-0" />
                <a href="tel:+2347063360982" className="hover:text-[#F27D26] font-bold">
                  +234 706 336 0982
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F27D26] shrink-0" />
                <a href="mailto:priscaegesi1980@gmail.com" className="hover:text-[#F27D26]">
                  priscaegesi1980@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => onOpenWhatsApp?.('nigeria')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              <span>Chat with Nigeria Desk</span>
            </button>
          </div>
        </div>

        {/* Card 2: Cameroon Operations */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇨🇲</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300">
                Cameroon Regional Hub
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Cameroon Regional Logistics Hub
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Eagle Excel SARL (RC/DLA/2019/B/1429)
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <span>
                  <strong>Douala Hub:</strong> Boulevard de la Liberté, Akwa Depot & Port Autonome de Douala Corridor.
                </span>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <span>
                  <strong>Yaoundé Depot:</strong> Mvan Commercial Node, Yaoundé Central Logistics Terminal.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#F27D26] shrink-0" />
                <a href="tel:+237677626356" className="hover:text-[#F27D26] font-bold">
                  +237 677 626 356
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F27D26] shrink-0" />
                <a href="mailto:priscaegesi1980@gmail.com" className="hover:text-[#F27D26]">
                  priscaegesi1980@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => onOpenWhatsApp?.('cameroon')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              <span>Chat with Cameroon Desk</span>
            </button>
          </div>
        </div>

        {/* Card 3: China Sourcing & Quality Liaison */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-xs hover:border-[#F27D26]/40 transition-all space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🇨🇳</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300">
                China Sourcing Offices
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                China Factory Inspection Desks
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Guangzhou • Yiwu • Shenzhen • Ningbo
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <span>
                  <strong>Guangzhou Desk:</strong> Unit 804, Tower B, International Sourcing Center, Yuexiu District.
                </span>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <span>
                  <strong>Yiwu Inspection Office:</strong> District 4, Yiwu International Trade City, Zhejiang.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#F27D26] shrink-0" />
                <span className="font-bold">+86 20 8899 3322 (Direct China Line)</span>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F27D26] shrink-0" />
                <a href="mailto:priscaegesi1980@gmail.com" className="hover:text-[#F27D26]">
                  priscaegesi1980@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onRequestQuote}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Submit Direct Factory RFQ</span>
            </button>
          </div>
        </div>

      </div>

    </section>
  );
};
