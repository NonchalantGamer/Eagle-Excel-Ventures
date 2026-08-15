import React from 'react';
import { ArrowLeft, MessageSquare, ShieldCheck, RefreshCw } from 'lucide-react';

interface ChatPlaceholderProps {
  onBack?: () => void;
  isDesktop?: boolean;
}

export const ChatPlaceholder: React.FC<ChatPlaceholderProps> = ({ onBack, isDesktop = false }) => {
  return (
    <div 
      className="flex flex-col h-full w-full bg-slate-50 dark:bg-[#0c0c0e] text-slate-900 dark:text-zinc-100 overflow-hidden animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      id="chat-loading-placeholder"
    >
      {/* Mobile-specific Header Placeholder */}
      <div className="lg:hidden bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-3 py-2.5 sm:px-4 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-200 text-xs font-semibold border border-slate-200/60 dark:border-white/5 shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span className="font-bold">Back</span>
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <div className="w-7 h-7 rounded-lg bg-[#F27D26]/20 text-[#F27D26] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 animate-pulse text-[#F27D26]" />
          </div>
          <div className="min-w-0 text-left">
            <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded-sm animate-pulse mb-1" />
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Connecting...</span>
            </div>
          </div>
        </div>

        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
      </div>

      {/* Message Stream Skeleton (Mobile & Embedded) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Date Header Skeleton */}
        <div className="flex justify-center my-2">
          <div className="h-4 w-24 rounded-full bg-slate-200/80 dark:bg-white/10 animate-pulse" />
        </div>

        {/* Incoming Rep Message Skeleton */}
        <div className="flex flex-col items-start space-y-1 max-w-[80%]">
          <div className="flex items-center gap-2 px-1">
            <div className="h-2.5 w-16 bg-slate-200 dark:bg-white/10 rounded-sm animate-pulse" />
            <div className="h-2 w-8 bg-slate-200 dark:bg-white/5 rounded-sm animate-pulse" />
          </div>
          <div className="p-3.5 rounded-2xl rounded-tl-xs bg-white dark:bg-[#181819] border border-slate-200/80 dark:border-white/10 space-y-2 w-64 sm:w-80 shadow-2xs">
            <div className="h-3 w-full bg-slate-200/80 dark:bg-white/10 rounded-sm animate-pulse" />
            <div className="h-3 w-4/5 bg-slate-200/80 dark:bg-white/10 rounded-sm animate-pulse" />
            <div className="h-3 w-2/3 bg-slate-200/80 dark:bg-white/10 rounded-sm animate-pulse" />
          </div>
        </div>

        {/* Outgoing Customer Message Skeleton */}
        <div className="flex flex-col items-end space-y-1 ml-auto max-w-[80%]">
          <div className="flex items-center gap-2 px-1">
            <div className="h-2.5 w-10 bg-slate-200 dark:bg-white/10 rounded-sm animate-pulse" />
            <div className="h-2 w-8 bg-slate-200 dark:bg-white/5 rounded-sm animate-pulse" />
          </div>
          <div className="p-3.5 rounded-2xl rounded-tr-xs bg-[#F27D26]/20 border border-[#F27D26]/30 space-y-2 w-56 sm:w-72 shadow-2xs">
            <div className="h-3 w-full bg-[#F27D26]/30 rounded-sm animate-pulse" />
            <div className="h-3 w-3/4 bg-[#F27D26]/30 rounded-sm animate-pulse" />
          </div>
        </div>

        {/* Incoming Spec/Card Skeleton */}
        <div className="flex flex-col items-start space-y-1 max-w-[80%]">
          <div className="flex items-center gap-2 px-1">
            <div className="h-2.5 w-20 bg-slate-200 dark:bg-white/10 rounded-sm animate-pulse" />
          </div>
          <div className="p-3 rounded-2xl rounded-tl-xs bg-white dark:bg-[#181819] border border-slate-200/80 dark:border-white/10 space-y-2.5 w-60 sm:w-72 shadow-2xs">
            <div className="h-16 w-full rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            <div className="h-3 w-3/4 bg-slate-200/80 dark:bg-white/10 rounded-sm animate-pulse" />
          </div>
        </div>

        {/* Connecting indicator badge */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <div className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#141415] border border-slate-200 dark:border-white/10 shadow-xs flex items-center gap-2">
            <RefreshCw className="w-3 h-3 text-[#F27D26] animate-spin" />
            <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
              Synchronizing secure live support line...
            </span>
          </div>
        </div>
      </div>

      {/* Composer Skeleton */}
      <div className="p-3 bg-white/95 dark:bg-[#121214]/95 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 shrink-0">
        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse shrink-0" />
        <div className="flex-1 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 animate-pulse px-3 flex items-center">
          <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded-sm" />
        </div>
        <div className="w-9 h-9 rounded-full bg-[#F27D26]/20 animate-pulse shrink-0" />
      </div>
    </div>
  );
};
