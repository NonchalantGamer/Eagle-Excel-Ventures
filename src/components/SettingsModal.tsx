import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sun, 
  Moon, 
  Laptop, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Info,
  Layers,
  Building2,
  Coins,
  Globe2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';
import { getBrandLogo } from '../constants/branding';
import { useModalFocusLock } from '../hooks/useModalFocusLock';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, isDark } = useTheme();
  const { currency, setCurrency } = useCurrency();

  useModalFocusLock(isOpen, onClose);

  if (!isOpen) return null;

  return typeof document !== 'undefined' ? createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn" 
      id="settings-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#141414] text-slate-900 dark:text-zinc-100 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
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
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-950 dark:text-white">
                Platform Preferences & Theme
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Eagle Excel Ventures B2B Portal Settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors btn-hover"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto overscroll-contain flex-1">
          
          {/* Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Appearance Mode
              </label>
              <span className="text-[11px] text-[#F27D26] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Active: {theme === 'system' ? `System (${isDark ? 'Dark' : 'Light'})` : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              By default, Eagle Excel Ventures automatically syncs with your device’s operating system preferences. You can also lock your preferred look below:
            </p>

            <div className="grid grid-cols-3 gap-3 pt-1">
              
              {/* System Option */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col items-center justify-center gap-2 btn-hover ${
                  theme === 'system'
                    ? 'border-[#F27D26] bg-[#F27D26]/10 text-slate-900 dark:text-white ring-2 ring-[#F27D26]/30'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="w-8 h-8 rounded-xl icon-morphism flex items-center justify-center">
                  <Laptop className="w-4 h-4 text-sky-500" />
                </div>
                <span className="text-xs font-bold">System</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 text-center">Auto-detect</span>
                {theme === 'system' && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#F27D26] text-black flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>

              {/* Light Option */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col items-center justify-center gap-2 btn-hover ${
                  theme === 'light'
                    ? 'border-[#F27D26] bg-[#F27D26]/10 text-slate-900 dark:text-white ring-2 ring-[#F27D26]/30'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="w-8 h-8 rounded-xl icon-morphism flex items-center justify-center">
                  <Sun className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-xs font-bold">Light</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 text-center">Crisp clean</span>
                {theme === 'light' && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#F27D26] text-black flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>

              {/* Dark Option */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col items-center justify-center gap-2 btn-hover ${
                  theme === 'dark'
                    ? 'border-[#F27D26] bg-[#F27D26]/10 text-slate-900 dark:text-white ring-2 ring-[#F27D26]/30'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="w-8 h-8 rounded-xl icon-morphism flex items-center justify-center">
                  <Moon className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs font-bold">Dark</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 text-center">OLED deep</span>
                {theme === 'dark' && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#F27D26] text-black flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>

            </div>
          </div>

          {/* Wholesale Currency Selection */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#F27D26]" />
                Display Currency
              </label>
              <span className="text-[11px] text-[#F27D26] font-semibold">
                Active: {CURRENCIES[currency].label}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Select your preferred billing and catalog currency for automated wholesale price and freight conversion:
            </p>

            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                const conf = CURRENCIES[code];
                const isSelected = currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col items-center justify-center gap-1.5 btn-hover cursor-pointer ${
                      isSelected
                        ? 'border-[#F27D26] bg-[#F27D26]/10 text-slate-900 dark:text-white ring-2 ring-[#F27D26]/30'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <span className="text-xl leading-none">{conf.flag}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{code}</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 text-center font-mono font-medium">
                      {conf.symbol}
                    </span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#F27D26] text-black flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* High Contrast & Readability Guarantee */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-1">
              <span className="font-semibold text-slate-900 dark:text-white block">WCAG AA Readability Certified</span>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
                All wholesale tier tables, freight calculations, product specifications, and invoice dialogues adhere to strict high-contrast typography in both Light and Dark palettes.
              </p>
            </div>
          </div>

          {/* Business & Distribution Identity */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Enterprise Account Brand</span>
              <span className="font-bold text-slate-900 dark:text-white">Eagle Excel Ventures</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Distribution Network</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Wholesale Dispatch
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#101010] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl btn-primary-morphic text-xs font-bold btn-hover"
          >
            Save & Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  ) : null;
};
