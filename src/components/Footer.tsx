import React from 'react';
import { Building2, ShieldCheck, Truck, Headphones, Mail, Phone, MapPin, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getBrandLogo } from '../constants/branding';
import { PageView } from '../types';
import { OrderNavBadge } from './OrderNavBadge';

interface FooterProps {
  onNavigate: (view: PageView) => void;
  onOpenSupport: () => void;
  onOpenSettings?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSupport, onOpenSettings }) => {
  const { isDark } = useTheme();
  const { isAdmin } = useAuth();

  return (
    <footer className="relative z-0 bg-slate-100 dark:bg-[#0a0a0a] text-slate-600 dark:text-zinc-400 border-t border-slate-200 dark:border-white/5 text-xs mt-16 transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 reveal-on-scroll">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Column 1: Brand & Overview */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl brand-logo-badge flex items-center justify-center p-1.5 shrink-0">
                <img 
                  src={getBrandLogo(isDark)} 
                  alt="Eagle Excel Ventures" 
                  className="w-full h-full object-contain brand-logo-img"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="font-black text-slate-950 dark:text-white text-base tracking-tight font-serif">
                EAGLE EXCEL VENTURES
              </span>
            </div>
            <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-[11px]">
              Eagle Excel Ventures is a premier enterprise wholesale supply and B2B procurement network delivering tiered bulk savings, guaranteed stock reserves, and verified Net 30 commercial terms.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Enterprise B2B Supplier</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider">
              Wholesale Navigation
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#F27D26] transition-colors cursor-pointer">
                  Home Overview
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog')} className="hover:text-[#F27D26] transition-colors cursor-pointer">
                  Wholesale Catalog & Tiers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('supply-chain')} className="hover:text-[#F27D26] transition-colors cursor-pointer">
                  China Supply Chain & Shipping
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('rfq')} className="hover:text-[#F27D26] transition-colors cursor-pointer">
                  Custom RFQ & Landed Sourcing
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-[#F27D26] transition-colors cursor-pointer">
                  About Eagle Excel
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('docs')} className="hover:text-[#F27D26] transition-colors cursor-pointer">
                  Import Compliance & Docs
                </button>
              </li>
              <li>
                <button 
                  id="footer-nav-orders-btn"
                  onClick={() => onNavigate('orders')} 
                  className="hover:text-[#F27D26] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Purchase Orders & Tracking</span>
                  <OrderNavBadge variant="compact" />
                </button>
              </li>
              {isAdmin && (
                <li>
                  <button onClick={() => onNavigate('admin')} className="hover:text-[#F27D26] transition-colors text-amber-600 dark:text-amber-400 font-medium cursor-pointer">
                    Operations & Admin Console
                  </button>
                </li>
              )}
              {onOpenSettings && (
                <li>
                  <button onClick={onOpenSettings} className="hover:text-[#F27D26] transition-colors flex items-center gap-1 cursor-pointer">
                    <Settings className="w-3 h-3 text-[#F27D26]" /> Theme & Display Settings
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: Commercial Terms & Freight */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider">
              B2B Freight & Terms
            </h4>
            <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-zinc-400">
              <li className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-zinc-300">
                <Truck className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Commercial Pallet Freight (LTL / FTL)</span>
              </li>
              <li>• Free Freight on qualified $1,500+ orders</li>
              <li>• Net 30 Commercial Invoicing available</li>
              <li>• Direct Wire Transfer (T/T) & COD supported</li>
            </ul>
          </div>

          {/* Column 4: Contact & Operations Desk */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider">
              Procurement Desk
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#F27D26]" />
                <a href="mailto:priscaegesi1980@gmail.com" className="font-mono hover:text-[#F27D26] transition-colors">
                  priscaegesi1980@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#F27D26]" />
                <a href="tel:+2347063360982" className="hover:text-[#F27D26] transition-colors">
                  🇳🇬 +234 706 336 0982
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#F27D26]" />
                <a href="tel:+237677626356" className="hover:text-[#F27D26] transition-colors">
                  🇨🇲 +237 677 626 356
                </a>
              </div>
              <button
                onClick={onOpenSupport}
                className="mt-2 py-2 px-3.5 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 border border-slate-300 dark:border-white/10 transition-colors btn-hover"
              >
                <Headphones className="w-3.5 h-3.5 text-[#F27D26]" />
                Open Live Support Channel
              </button>
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-500">
          <div>
            © {new Date().getFullYear()} Eagle Excel Ventures. All Rights Reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>ISO 9001 Certified Supplier</span>
            <span>•</span>
            <span>Direct Enterprise Distribution</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

