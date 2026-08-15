import React, { useState, useEffect } from 'react';
import { Phone, X, ExternalLink, ShieldCheck, MessageSquare, Sparkles } from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

interface FloatingWhatsAppButtonProps {
  onOpenSupport?: () => void;
}

export const FloatingWhatsAppButton: React.FC<FloatingWhatsAppButtonProps> = ({ onOpenSupport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const handleUnreadUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      if (customEvent.detail && typeof customEvent.detail.count === 'number') {
        setUnreadCount(customEvent.detail.count);
      }
    };

    window.addEventListener('ee_customer_unread_count', handleUnreadUpdate);
    return () => {
      window.removeEventListener('ee_customer_unread_count', handleUnreadUpdate);
    };
  }, []);

  const openWhatsApp = (country: 'nigeria' | 'cameroon', customText?: string) => {
    const phone = country === 'nigeria' ? '2347063360982' : '237677626356';
    const defaultText = "Hello Eagle Excel Ventures, I am interested in bulk wholesale purchase / container import quote from China.";
    const text = encodeURIComponent(customText || defaultText);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
      {/* Expanded Quick Options Menu */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 bg-white dark:bg-[#161616] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-fadeIn text-slate-900 dark:text-zinc-100">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#075E54] to-[#128C7E] p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <WhatsAppIcon className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs">Eagle Excel Support Desk</h4>
                  <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                    Online & Ready to Assist
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white cursor-pointer"
                aria-label="Close options"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Options */}
          <div className="p-4 space-y-2.5 text-xs">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Connect directly with our operations desk or regional WhatsApp representatives:
            </p>

            {/* In-App Live Support Chat Option */}
            {onOpenSupport && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSupport();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#F27D26]/10 hover:bg-[#F27D26]/20 border border-[#F27D26]/30 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#F27D26] text-white flex items-center justify-center shrink-0 shadow-sm relative">
                    <MessageSquare className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-[#161616]">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-[#F27D26] flex items-center gap-1.5">
                      <span>Live Wholesale Desk</span>
                      {unreadCount > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-red-500 text-white rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Real-time admin chat, quotes & shipping
                    </div>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-[#F27D26] shrink-0" />
              </button>
            )}

            {/* Nigeria Desk */}
            <button
              onClick={() => openWhatsApp('nigeria')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-[#25D366]/10 border border-slate-200 dark:border-white/5 hover:border-[#25D366]/40 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#25D366]">
                    Nigeria Wholesale & Import Desk
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                    Lagos Trade Fair & Apapa Port (+234 706 336 0982)
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 shrink-0" />
            </button>

            {/* Cameroon Desk */}
            <button
              onClick={() => openWhatsApp('cameroon')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-[#25D366]/10 border border-slate-200 dark:border-white/5 hover:border-[#25D366]/40 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#25D366]">
                    Cameroon Regional Hub Desk
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                    Douala Akwa & Yaoundé Hub (+237 677 626 356)
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 shrink-0" />
            </button>

            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 justify-center">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Verified Business Account • Instant Responses</span>
            </div>
          </div>

        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        id="floating-whatsapp-btn"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-3 p-0 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs shadow-2xl hover:scale-105 transition-all duration-200 cursor-pointer flex items-center justify-center sm:gap-2.5"
        aria-label="Chat with Eagle Excel Support"
        title="Chat with Eagle Excel Support"
      >
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 text-white text-[10px] font-black items-center justify-center border-2 border-white dark:border-[#161616]">
              {unreadCount}
            </span>
          </span>
        )}
        <div className="w-6 h-6 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <WhatsAppIcon className="w-4 h-4 text-white" />
        </div>
        <span className="hidden sm:inline tracking-wide font-black text-xs">
          {unreadCount > 0 ? `${unreadCount} New Message${unreadCount > 1 ? 's' : ''}` : 'Support & Quotes'}
        </span>
      </button>
    </div>
  );
};
