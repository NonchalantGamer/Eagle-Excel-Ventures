import React from 'react';
import { Star, Quote, CheckCircle2, ShieldCheck, TrendingUp, Building2, MapPin } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Chief Emeka O.',
      company: 'Emex Solar & Electronics Ltd',
      market: 'Alaba International Market, Lagos, Nigeria',
      flag: '🇳🇬',
      rating: 5,
      volume: 'Importing 2x 40ft HQ Containers Monthly',
      text: 'Eagle Excel Ventures changed our solar business completely. We used to struggle with erratic clearing times and unexpected demurrage at Apapa Port. Now, our 5.5KVA hybrid inverters arrive pre-cleared right to our Alaba depot with 100% factory warranty.'
    },
    {
      name: 'Madame Sandrine M.',
      company: 'Élégance Textile SARL',
      market: 'Marché Central & Akwa, Douala, Cameroon',
      flag: '🇨🇲',
      rating: 5,
      volume: '350+ Bales of Swiss Voile & Wax Fabric per Quarter',
      text: 'The quality of combed cotton Swiss voile brocade and Ankara wax we receive from Shaoxing via Eagle Excel is unmatched in Douala. Their Cameroon team handles all ANOR clearance seamlessly. We never run out of seasonal stock!'
    },
    {
      name: 'Engr. Tunde A.',
      company: 'Apex Infrastructure & Construction',
      market: 'Abuja & Port Harcourt, Nigeria',
      flag: '🇳🇬',
      rating: 5,
      volume: 'Titanium Power Tools & ANSI Safety Gear',
      text: 'For large commercial developments, counterfeit tools cause costly delays. Eagle Excel sources directly from certified Yongkang manufacturers with customized company engraving and Net 30 billing. Extremely dependable partner.'
    },
    {
      name: 'Alhaji Ibrahim Bello',
      company: 'Kano Heavy Tools & Machine Depot',
      market: 'Bompai Industrial Area, Kano, Nigeria',
      flag: '🇳🇬',
      rating: 5,
      volume: 'Hydraulic Presses & Packaging Machinery',
      text: 'We order heavy 12-ton hydraulic shop presses and automated box strapping machinery in bulk container loads. Goods arrive crated securely with full parts support and English technical manuals. Highly recommended.'
    }
  ];

  return (
    <section className="w-full space-y-4">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black">
          <Star className="w-3.5 h-3.5 fill-[#F27D26]" />
          Verified Commercial Customer Testimonials
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-serif tracking-tight text-slate-900 dark:text-white">
          Trusted by 500+ Businesses Across Nigeria & Cameroon
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          From major electronics markets in Lagos to textile hubs in Douala and heavy industrial zones in Kano, hear how we streamline factory importation.
        </p>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {testimonials.map((t, idx) => (
          <div
            key={idx}
            className="p-6 rounded-3xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              
              {/* Top Row: Stars + Flag */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-zinc-200">
                  {t.flag} {t.volume}
                </span>
              </div>

              {/* Quote text */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed italic">
                "{t.text}"
              </p>
            </div>

            {/* Author details */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  {t.name}
                </div>
                <div className="text-[11px] text-[#e06d1a] dark:text-[#F27D26] font-bold">
                  {t.company}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {t.market}
                </div>
              </div>

              <div className="w-9 h-9 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Big Impact Statistics Bento Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-6 rounded-3xl bg-slate-900 text-white shadow-xl">
        <div className="text-center space-y-0.5">
          <div className="text-2xl sm:text-3xl font-black text-[#F27D26]">500+</div>
          <div className="text-xs font-bold text-white">Active B2B Buyers</div>
          <div className="text-[10px] text-zinc-400">Nigeria & Cameroon</div>
        </div>
        <div className="text-center space-y-0.5">
          <div className="text-2xl sm:text-3xl font-black text-[#F27D26]">1,200+</div>
          <div className="text-xs font-bold text-white">Container Shipments</div>
          <div className="text-[10px] text-zinc-400">40ft HQ & 20ft FCL</div>
        </div>
        <div className="text-center space-y-0.5">
          <div className="text-2xl sm:text-3xl font-black text-[#F27D26]">99.4%</div>
          <div className="text-xs font-bold text-white">On-Time Port Clearance</div>
          <div className="text-[10px] text-zinc-400">Apapa & Douala Port</div>
        </div>
        <div className="text-center space-y-0.5">
          <div className="text-2xl sm:text-3xl font-black text-[#F27D26]">$15M+</div>
          <div className="text-xs font-bold text-white">Wholesale Volume</div>
          <div className="text-[10px] text-zinc-400">Direct factory transactions</div>
        </div>
      </div>

    </section>
  );
};
