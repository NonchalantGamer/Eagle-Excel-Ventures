import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, BookOpen, Sparkles, X } from 'lucide-react';

interface StaffGuidanceBannerProps {
  title: string;
  badge?: string;
  description: string;
  tips: string[];
  onOpenManual?: () => void;
  storageKey?: string;
}

export const StaffGuidanceBanner: React.FC<StaffGuidanceBannerProps> = ({
  title,
  badge = 'Staff SOP Guide',
  description,
  tips,
  onOpenManual,
  storageKey
}) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(`dismiss_guide_${storageKey}`) === 'true';
    } catch {
      return false;
    }
  });

  const [isExpanded, setIsExpanded] = useState(false);

  if (isDismissed) {
    return (
      <div className="flex justify-end -mt-2 mb-2">
        <button
          onClick={() => {
            setIsDismissed(false);
            if (storageKey) {
              try {
                localStorage.removeItem(`dismiss_guide_${storageKey}`);
              } catch {}
            }
          }}
          className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-[#F27D26] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" /> Show {title} Staff Guide
        </button>
      </div>
    );
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (storageKey) {
      try {
        localStorage.setItem(`dismiss_guide_${storageKey}`, 'true');
      } catch {}
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#151515] border border-slate-200/80 dark:border-white/5 rounded-2xl p-4 transition-all shadow-xs text-xs text-slate-700 dark:text-zinc-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center shrink-0 mt-0.5 font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs">{title}</h4>
              <span className="bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                {badge}
              </span>
            </div>
            <p className="text-slate-600 dark:text-zinc-400 text-xs mt-0.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="py-1 px-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Hide SOP Details' : 'View SOP Tips'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {onOpenManual && (
            <button
              onClick={onOpenManual}
              className="py-1 px-2 rounded-lg bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Open full Employee Operating Manual"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Manual</span>
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer ml-1"
            title="Dismiss guide banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Tips */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/5 space-y-1.5 animate-fadeIn">
          <div className="font-bold text-slate-900 dark:text-zinc-200 text-[11px]">
            Standard Operating Procedure (SOP) Quick Reference:
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[#F27D26] font-bold shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
