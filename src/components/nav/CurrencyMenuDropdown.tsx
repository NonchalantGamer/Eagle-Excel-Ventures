import React, { useEffect, useRef } from 'react';
import { useCurrency, CURRENCIES, CurrencyCode } from '../../context/CurrencyContext';
import { Check, Coins, Globe2 } from 'lucide-react';

interface CurrencyMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CurrencyMenuDropdown: React.FC<CurrencyMenuDropdownProps> = ({
  isOpen,
  onClose
}) => {
  const { currency, setCurrency } = useCurrency();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currencyDescriptions: Record<CurrencyCode, string> = {
    USD: 'US Dollar • Global Standard for FCL/LCL Freight',
    NGN: 'Nigerian Naira • Direct Lagos Port Clearances',
    XAF: 'Central African Franc • Douala & Regional Hub'
  };

  return (
    <div
      ref={dropdownRef}
      id="desktop-currency-dropdown-popover"
      className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#141414] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3 z-50 animate-fadeIn backdrop-blur-md text-slate-900 dark:text-zinc-100"
    >
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-100 dark:border-white/5 mb-2">
        <Globe2 className="w-3.5 h-3.5 text-[#F27D26]" />
        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
          Select Wholesale Settlement Currency
        </span>
      </div>

      <div className="space-y-1">
        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
          const config = CURRENCIES[code];
          const isSelected = currency === code;

          return (
            <button
              key={code}
              type="button"
              onClick={() => {
                setCurrency(code);
                onClose();
              }}
              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                isSelected
                  ? 'bg-[#F27D26]/10 dark:bg-[#F27D26]/15 border border-[#F27D26]/30 text-slate-950 dark:text-white'
                  : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg leading-none">{config.flag}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black">{code}</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 font-mono">
                      ({config.symbol})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                    {currencyDescriptions[code]}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-[#F27D26] text-black flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 px-2 text-[10px] text-slate-500 dark:text-zinc-400">
        Exchange rates update continuously based on interbank wholesale indexes.
      </div>
    </div>
  );
};
