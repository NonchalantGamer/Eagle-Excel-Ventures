import React, { useState, useRef, useEffect } from 'react';
import { 
  Home,
  ArrowLeft, 
  Search, 
  Phone, 
  MoreVertical, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Download, 
  Package, 
  Trash2, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface GoogleMessagesHeaderProps {
  onBack: () => void;
  onToggleSearch?: () => void;
  onOpenSearch?: () => void;
  showSearch?: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onExportTranscript: () => void;
  onClearChat?: () => void;
  onOpenCatalog?: () => void;
  isAdmin?: boolean;
  onOpenAdminDesk?: () => void;
  repName?: string;
}

export const GoogleMessagesHeader: React.FC<GoogleMessagesHeaderProps> = ({
  onBack,
  onToggleSearch,
  onOpenSearch,
  showSearch = false,
  soundOn,
  onToggleSound,
  onExportTranscript,
  onClearChat,
  onOpenCatalog,
  isAdmin,
  onOpenAdminDesk,
  repName = 'Operations Desk'
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSearchClick = () => {
    if (onToggleSearch) onToggleSearch();
    else if (onOpenSearch) onOpenSearch();
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <header className="bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 shrink-0 sticky top-0 z-30 transition-colors pt-[max(0.5rem,env(safe-area-inset-top))]">
      {/* Clean Mobile Navigation Header with Direct Back Navigation */}
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left: Back Button + Brand Identity & Support Status */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            id="mobile-chat-back-btn"
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Back to store"
            title="Back to store"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F27D26] text-black flex items-center justify-center font-bold text-sm shadow-xs">
              <ShieldCheck className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#121214] rounded-full" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate tracking-tight">
                Live Support
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px] font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1 mt-0.5">
              <span className="truncate">{repName}</span>
              <span className="text-slate-300 dark:text-zinc-600">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">Fast response</span>
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons & Three-Dot Overflow Menu */}
        <div className="flex items-center gap-1 shrink-0">
          {(onToggleSearch || onOpenSearch) && (
            <button
              type="button"
              onClick={handleSearchClick}
              className={`p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-colors cursor-pointer ${
                showSearch ? 'bg-[#F27D26]/15 text-[#F27D26]' : ''
              }`}
              title="Search Messages"
              aria-label="Search Messages"
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleSound}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
            title={soundOn ? 'Sound alerts enabled' : 'Mute chat sounds'}
            aria-label="Toggle Sound"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#F27D26]" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400" />
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              id="mobile-chat-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 sm:p-2 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
              title="Chat Options"
              aria-label="More options"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>

            {/* Overflow Menu Dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 bg-white dark:bg-[#1c1c1f] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                
                {/* Back to Home Option */}
                <button
                  type="button"
                  id="menu-back-to-home-btn"
                  onClick={() => {
                    setShowMenu(false);
                    onBack();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-900 dark:text-white hover:bg-[#F27D26]/10 dark:hover:bg-[#F27D26]/15 hover:text-[#F27D26] dark:hover:text-[#F27D26] flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#F27D26]/15 text-[#F27D26] flex items-center justify-center shrink-0">
                    <Home className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block font-bold">Back to Home</span>
                    <span className="block text-[9px] text-slate-400 font-normal">Return to store homepage</span>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                {/* WhatsApp Hotline Option */}
                <a
                  href="https://wa.me/2347063360982?text=Hello%20Eagle%20Excel%20Operations%2C%20I%20am%20chatting%20from%20the%20live%20support%20portal."
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMenu(false)}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>WhatsApp Hotline Direct</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>

                {/* Export Transcript Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onExportTranscript();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Export Chat Transcript</span>
                </button>

                {/* Catalog Option */}
                {onOpenCatalog && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenCatalog();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Package className="w-4 h-4 text-[#F27D26] shrink-0" />
                    <span>Browse Wholesale Catalog</span>
                  </button>
                )}

                {/* Admin Desk Option */}
                {isAdmin && onOpenAdminDesk && (
                  <>
                    <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onOpenAdminDesk();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#F27D26] hover:bg-[#F27D26]/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Admin Operations Desk</span>
                    </button>
                  </>
                )}

                {/* Clear Conversation Option */}
                {onClearChat && (
                  <>
                    <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onClearChat();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Clear Conversation</span>
                    </button>
                  </>
                )}

              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
