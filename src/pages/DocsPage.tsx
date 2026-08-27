import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  Download, 
  CheckCircle2, 
  Ship, 
  Truck, 
  FileSpreadsheet, 
  ExternalLink,
  ChevronDown,
  Building2,
  Lock,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { PageView } from '../types';

interface DocsPageProps {
  onNavigate: (view: PageView) => void;
  onRequestQuote: (category?: string, productName?: string) => void;
  initialTab?: 'nigeria' | 'cameroon' | 'payment_terms' | 'faq';
}

export const DocsPage: React.FC<DocsPageProps> = ({
  onNavigate,
  onRequestQuote,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'nigeria' | 'cameroon' | 'payment_terms' | 'faq'>(() => {
    if (initialTab) return initialTab;
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ee_docs_active_tab');
        const valid = ['nigeria', 'cameroon', 'payment_terms', 'faq'];
        if (stored && valid.includes(stored)) {
          return stored as any;
        }
      }
    } catch {}
    return 'nigeria';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    try {
      sessionStorage.setItem('ee_docs_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

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
        <span className="font-bold text-slate-900 dark:text-white">Import & Customs Documentation Guide</span>
      </div>

      {/* Header Banner */}
      <section className="reveal-on-scroll relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-black text-white p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26] text-xs font-black">
            <BookOpen className="w-3.5 h-3.5" />
            Compliance, Regulations & Import Standard Operating Procedures
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-serif">
            China-to-Africa Importation & Clearance Guide
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Everything you need to know regarding Form M, PAAR, SONCAP conformity certificates in Nigeria, and ANOR / Sydonia customs clearance in Cameroon.
          </p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="reveal-on-scroll flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'nigeria', label: '🇳🇬 Nigeria Customs & SONCAP' },
          { id: 'cameroon', label: '🇨🇲 Cameroon ANOR & Douala Port' },
          { id: 'payment_terms', label: '💳 Payment Terms & Commercial Invoicing' },
          { id: 'faq', label: '❓ Importation FAQ' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#F27D26] text-black shadow-md'
                : 'bg-white dark:bg-[#161616] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content 1: Nigeria Customs & SONCAP */}
      {activeTab === 'nigeria' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="reveal-on-scroll bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Nigeria Import Clearance Workflow (Form M & PAAR)
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Eagle Excel Ventures coordinates every document stage from our Guangzhou office and Apapa / Tin Can clearance teams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="reveal-on-scroll stagger-1 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#F27D26] flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Product Certificate (PC) & SONCAP</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Issued by accredited inspection agencies (SGS, Intertek, CCIC) in China verifying compliance with Standards Organisation of Nigeria (SON) standards.
                </p>
              </div>

              <div className="reveal-on-scroll stagger-2 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">e-Form M Registration</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Mandatory statutory document registered through authorized dealer banks with Nigeria Customs Service prior to vessel departure.
                </p>
              </div>

              <div className="reveal-on-scroll stagger-3 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">PAAR Generation & Duty Assessment</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Pre-Arrival Assessment Report (PAAR) processed to facilitate immediate offloading and terminal exit within 4-7 days of berthing.
                </p>
              </div>
            </div>

            <div className="reveal-on-scroll p-4 rounded-2xl bg-[#F27D26]/10 border border-[#F27D26]/20 text-xs text-slate-800 dark:text-zinc-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#F27D26] shrink-0 mt-0.5" />
              <div>
                <strong>Eagle Excel Doorstep Clearance Guarantee:</strong> When ordering through our turnkey DDP (Delivered Duty Paid) program, our team handles 100% of Form M, SONCAP, and PAAR processing. You simply receive your sealed container or pallet lots at your warehouse.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Cameroon ANOR & Douala Port */}
      {activeTab === 'cameroon' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Cameroon Import Regulations & Douala Port (ANOR / PECAE)
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Regulatory framework for imports entering Douala Port and CEMAC zone distribution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">PECAE Certificate (ANOR)</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Programme d'Evaluation de la Conformité Avant Embarquement (PECAE) mandatory for industrial goods, electronics, and construction supplies entering Cameroon.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sydonia World Electronic Declaration</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Direct customs clearance via our licensed transit commission agents in Douala Port (PAD) with integrated road transfer to Yaoundé and Bafoussam.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Payment Terms */}
      {activeTab === 'payment_terms' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Commercial Payment Terms & Currency Settlement
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Flexible B2B financing options for corporate buyers, wholesalers, and retail distributors.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <div className="font-bold text-xs text-[#F27D26] uppercase">Option 1</div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Bank Wire (T/T)</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  30% production deposit upon golden sample approval, 70% balance against Bill of Lading copy.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <div className="font-bold text-xs text-blue-500 uppercase">Option 2</div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Letter of Credit (L/C)</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Irrevocable confirmed L/C at sight for large container contracts exceeding $50,000 USD.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <div className="font-bold text-xs text-purple-500 uppercase">Option 3</div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Net 30 Commercial Invoice</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Available for verified corporate account holders with 6+ months of trade history.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                <div className="font-bold text-xs text-emerald-500 uppercase">Option 4</div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Local Currency Invoicing</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Pay directly in NGN (Nigerian Naira) or XAF (Central African Franc) via local corporate accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: FAQ */}
      {activeTab === 'faq' && (
        <div className="space-y-4 animate-fadeIn">
          {[
            {
              q: "Can I inspect the goods before the container departs China?",
              a: "Yes! Our Guangzhou engineering inspectors provide complete high-definition photo and video audit reports covering packaging, product specs, and stress testing before container sealing."
            },
            {
              q: "What is the typical shipping transit time from Guangzhou to Lagos or Douala?",
              a: "Standard sea freight transit is 28 to 35 calendar days from vessel departure at Guangzhou/Shenzhen to Apapa Port, and 32 to 38 days to Douala Port. Air express cargo takes 5 to 8 business days."
            },
            {
              q: "Can you source products with my company's custom brand name (OEM)?",
              a: "Absolutely. We arrange custom silkscreen branding, laser engraving, embossed packaging boxes, and custom barcode labels directly on the factory assembly line."
            },
            {
              q: "Can I purchase ready inventory from your Lagos or Douala warehouse?",
              a: "Yes! You can browse our Wholesale Catalog for immediately available stock with same-day dispatch from our Lagos Trade Fair depot or Douala Akwa warehouse."
            }
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#F27D26]" />
                {item.q}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 pl-6 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action CTA */}
      <section className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-bold">Have specific compliance questions for your consignment?</h3>
          <p className="text-xs text-zinc-400">Our customs clearance specialists are available to review your product classification (HS Code).</p>
        </div>
        <button
          onClick={() => onNavigate('rfq')}
          className="py-3 px-6 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs shrink-0 transition-all btn-hover cursor-pointer"
        >
          Submit RFQ for Free Assessment
        </button>
      </section>

    </div>
  );
};
