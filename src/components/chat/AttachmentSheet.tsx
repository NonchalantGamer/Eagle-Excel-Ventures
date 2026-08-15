import React from 'react';
import { 
  Image as ImageIcon, 
  Package, 
  FileCheck, 
  X,
  Paperclip
} from 'lucide-react';

interface AttachmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachImage: () => void;
  onOpenCatalog: () => void;
  onSelectOrder?: () => void;
}

export const AttachmentSheet: React.FC<AttachmentSheetProps> = ({
  isOpen,
  onClose,
  onAttachImage,
  onOpenCatalog,
  onSelectOrder,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'gallery',
      title: 'Attach Photo / Document',
      desc: 'Upload waybill, screenshot, or specification sheet',
      icon: ImageIcon,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      action: () => {
        onClose();
        onAttachImage();
      },
    },
    {
      id: 'catalog',
      title: 'Attach Product from Catalog',
      desc: 'Inquire about a specific SKU, machine, or solar item',
      icon: Package,
      color: 'bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/20',
      action: () => {
        onClose();
        onOpenCatalog();
      },
    },
    ...(onSelectOrder ? [{
      id: 'order',
      title: 'Reference Purchase Order',
      desc: 'Attach an existing PO number to this conversation',
      icon: FileCheck,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      action: () => {
        onClose();
        onSelectOrder();
      },
    }] : []),
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#181819] rounded-t-3xl p-5 pb-8 shadow-2xl border-t border-slate-200 dark:border-white/10 space-y-4 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto" />

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-[#F27D26]" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Attach to Conversation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className="w-full p-3.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-2xs group flex items-center gap-3.5"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-[#F27D26] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
