import React from 'react';
import { 
  Cpu, 
  Wrench, 
  Sparkles, 
  Factory, 
  Package, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Boxes,
  FileSpreadsheet,
  Building2
} from 'lucide-react';

interface WhatWeImportSectionProps {
  onSelectCategory: (categoryId: string) => void;
  onRequestQuoteWithCategory?: (categoryName: string) => void;
}

export const IMPORT_CATEGORIES_DATA = [
  {
    id: 'electronics',
    title: 'Electronics & Solar Power Systems',
    tagline: 'Solar inverters, hybrid batteries, ANC headsets, 4K conference cameras, and smart home hardware',
    icon: Cpu,
    color: 'from-amber-500/20 to-orange-500/10 text-[#F27D26]',
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
    moq: 'Min 2 - 10 Units / Master Cartons',
    containerFit: '40ft HQ fits ~450 Inverters / 5,000 Headsets',
    sourcingOrigin: 'Shenzhen & Dongguan Electronics Hubs',
    popularItems: ['5.5KVA Pure Sine Solar Inverters', 'ANC Wireless Headsets', '4K Auto-Framing Webcams', '48V LiFePO4 Battery Banks']
  },
  {
    id: 'building',
    title: 'Building Materials & Heavy Hardware',
    tagline: 'Titanium 20V brushless tools, ANSI safety helmets, armored security steel doors, and structural fasteners',
    icon: Wrench,
    color: 'from-blue-500/20 to-cyan-500/10 text-blue-500',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
    moq: 'Min 5 - 24 Units / Pallet Lots',
    containerFit: '40ft HQ fits ~310 Armored Doors / 1,400 Drills',
    sourcingOrigin: 'Yongkang & Foshan Hardware Zones',
    popularItems: ['20V Brushless Combo Kits', 'ANSI Type 1 Safety Helmets', 'Armored 13-Point Security Doors', 'Galvanized Fasteners']
  },
  {
    id: 'textiles',
    title: 'Textiles, Swiss Voile & African Wax Fabrics',
    tagline: '100% combed cotton Swiss voile brocade, authentic double-sided African wax Ankara, and uniform textiles',
    icon: Sparkles,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-500',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80',
    moq: 'Min 5 Bales (50-Yard Master Bolts)',
    containerFit: '40ft HQ fits ~350 Master Bales (~17,500 Yards)',
    sourcingOrigin: 'Shaoxing Keqiao China Textile City',
    popularItems: ['Swiss Voile Brocade Lace', 'Authentic Wax Ankara 6-Yard', 'Jacquard Wedding Fabrics', 'Industrial Twill Uniforms']
  },
  {
    id: 'machinery',
    title: 'Machinery & Industrial Equipment',
    tagline: '12-Ton hydraulic workshop presses, automated box strapping machines, heavy generators, and processing tools',
    icon: Factory,
    color: 'from-purple-500/20 to-indigo-500/10 text-purple-500',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    moq: 'Min 1 - 2 Crated Units',
    containerFit: '20ft fits ~40 Machines / 40ft HQ fits ~95 Units',
    sourcingOrigin: 'Wuxi & Zibo Industrial Parks',
    popularItems: ['12-Ton Hydraulic Shop Presses', 'Auto Carton Strapping Machines', 'Industrial Generators', 'Metal Bending Press Brakes']
  },
  {
    id: 'packaging',
    title: 'General Merchandise & Packaging Materials',
    tagline: 'ECT-32 multi-wall corrugated cartons, executive ergonomic mesh chairs, motorized standing desks, and bulk consumables',
    icon: Package,
    color: 'from-rose-500/20 to-pink-500/10 text-rose-500',
    image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80',
    moq: 'Min 8 - 100 Units / Bundles',
    containerFit: '40ft HQ fits ~45,000 Flat Cartons / 450 Chairs',
    sourcingOrigin: 'Foshan Furniture & Yiwu Commodity City',
    popularItems: ['ECT-32 Corrugated Shipping Boxes', 'Ergonomic Executive Mesh Chairs', 'Dual-Motor Standing Desks', 'Stretch Pallet Films']
  },
  {
    id: 'commercial',
    title: 'Office, Hotel & Commercial Fixtures',
    tagline: 'Commercial LED lighting, acoustic wall panels, hospitality linens, retail shelving, and security turnstiles',
    icon: Building2,
    color: 'from-cyan-500/20 to-blue-500/10 text-cyan-500',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    moq: 'Min 4 - 20 Units / Sets',
    containerFit: '40ft HQ fits ~220 Workstations / 1,200 Fixtures',
    sourcingOrigin: 'Zhongshan Lighting & Guangzhou Marts',
    popularItems: ['High-Bay Commercial LED Fixtures', 'Acoustic Slat Wood Panels', 'Modular Reception Counters', 'Electronic Access Barriers']
  }
];

export const WhatWeImportSection: React.FC<WhatWeImportSectionProps> = ({
  onSelectCategory,
  onRequestQuoteWithCategory
}) => {
  return (
    <section id="what-we-import-section" className="w-full space-y-4">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200 dark:border-white/5 pb-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            Core Wholesale Import Lines
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-slate-900 dark:text-white">
            What We Import From China
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-0.5 max-w-2xl">
            We partner with ISO-certified Chinese factories to import high-demand wholesale inventory for retailers, contractors, and distributors across Nigeria and Cameroon.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className="text-xs font-bold text-[#e06d1a] dark:text-[#F27D26] hover:underline flex items-center gap-1.5 self-start md:self-end cursor-pointer"
        >
          <span>Browse All In-Stock Lines</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Categories Grid (2 rows of 3 on desktop = 6 balanced cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {IMPORT_CATEGORIES_DATA.map(category => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className="bg-white dark:bg-[#161616] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Category Image Header */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  
                  {/* Category Pill */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold">
                      <Icon className="w-3.5 h-3.5 text-[#F27D26]" />
                      {category.sourcingOrigin}
                    </span>
                  </div>

                  {/* Container Fit Badge */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <span className="text-[10px] text-zinc-300 font-medium block truncate drop-shadow-xs">
                      📦 {category.containerFit}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-2.5">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#F27D26] transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {category.tagline}
                    </p>
                  </div>

                  {/* Popular Items Chips */}
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Fast-Selling Wholesale Items:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {category.popularItems.map((item, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 border border-slate-200/50 dark:border-white/5"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-zinc-400">Minimum Order:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{category.moq}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCategory(category.id)}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-[#F27D26]/10 text-slate-900 dark:text-white hover:text-[#e06d1a] dark:hover:text-[#F27D26] dark:bg-white/5 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Shop Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRequestQuoteWithCategory?.(category.title)}
                  className="py-2 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Get RFQ</span>
                </button>
              </div>

            </div>
          );
        })}

      </div>

    </section>
  );
};
