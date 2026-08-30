import React, { useEffect, useRef } from 'react';
import { 
  Truck, 
  Ship, 
  RotateCcw, 
  HelpCircle, 
  MessageSquare, 
  PhoneCall, 
  ChevronRight,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { PageView } from '../../types';
import { CONTACT_INFO } from '../../constants/contact';

interface HelpSupportMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: PageView, options?: { docTab?: string }) => void;
  onOpenSupport: () => void;
  unreadSupportCount?: number;
}

export const HelpSupportMenuDropdown: React.FC<HelpSupportMenuDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenSupport,
  unreadSupportCount = 0
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const triggerBtn = document.getElementById('nav-helpsupport-dropdown-btn');
      if (triggerBtn && triggerBtn.contains(e.target as Node)) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const helpItems = [
    {
      id: 'track-order',
      label: 'Track My Order',
      subtitle: 'Live container status, bill of lading & waybill updates',
      icon: Truck,
      badge: 'Live Status',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
      action: () => onNavigate('orders')
    },
    {
      id: 'shipping-info',
      label: 'Shipping Information',
      subtitle: 'China-to-Africa Sea LCL/FCL & Air cargo schedules',
      icon: Ship,
      badge: 'Lagos & Douala',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
      action: () => onNavigate('supply-chain')
    },
    {
      id: 'returns-refunds',
      label: 'Returns & Refunds',
      subtitle: 'B2B factory warranty, pre-shipment inspection & dispute terms',
      icon: RotateCcw,
      badge: 'Policy',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
      action: () => {
        try {
          sessionStorage.setItem('ee_docs_active_tab', 'payment_terms');
        } catch {}
        onNavigate('docs', { docTab: 'payment_terms' });
      }
    },
    {
      id: 'faqs',
      label: 'FAQs & Documentation',
      subtitle: 'Form M, PAAR, SONCAP conformity & customs clearance answers',
      icon: HelpCircle,
      badge: 'Knowledgebase',
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
      action: () => {
        try {
          sessionStorage.setItem('ee_docs_active_tab', 'faq');
        } catch {}
        onNavigate('docs', { docTab: 'faq' });
      }
    }
  ];

  return (
    <div
      ref={dropdownRef}
      id="desktop-helpsupport-menu-dropdown"
      className="absolute left-0 top-full mt-2 w-[480px] bg-white dark:bg-[#141414] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3.5 z-[120] animate-dropdownSlideDown text-slate-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-white/5 mb-2 flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F27D26]">
          Customer Care & Logistics
        </span>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
          24/7 Verified Trade Support
        </span>
      </div>

      <div className="space-y-1">
        {helpItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-white/5 flex items-start gap-3 transition-all text-left cursor-pointer group"
            >
              <div className="w-8.5 h-8.5 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-[#F27D26]/15 flex items-center justify-center shrink-0 transition-colors mt-0.5">
                <Icon className="w-4 h-4 text-slate-700 dark:text-zinc-300 group-hover:text-[#F27D26] transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#F27D26] dark:group-hover:text-[#F27D26] transition-colors">
                    {item.label}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                  {item.subtitle}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F27D26] group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
            </button>
          );
        })}
      </div>

      {/* Live Support Chat Highlight CTA */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
        <button
          onClick={() => {
            onOpenSupport();
            onClose();
          }}
          className="w-full p-3 rounded-xl bg-gradient-to-r from-slate-900 to-black text-white hover:from-black hover:to-slate-900 flex items-center justify-between border border-slate-800 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F27D26] text-black flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">
                  Live Trade Representative Desk
                </span>
                {unreadSupportCount > 0 && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">
                    {unreadSupportCount} new
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">
                Instant quotes, customs guidance & wholesale assistance
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#F27D26] group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </div>
  );
};
