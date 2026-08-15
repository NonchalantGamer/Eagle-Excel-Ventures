import React from 'react';
import { 
  FileText, 
  Truck, 
  Package, 
  CreditCard, 
  Lock, 
  Trash2, 
  Sparkles, 
  MessageSquare 
} from 'lucide-react';

export interface SlashCommandItem {
  id: string;
  command: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface SlashCommandMenuProps {
  query: string;
  isAdmin?: boolean;
  role?: string;
  onSelect: (command: SlashCommandItem) => void;
  onClose: () => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  query,
  isAdmin = false,
  role,
  onSelect,
  onClose
}) => {
  const effectiveIsAdmin = isAdmin || role === 'admin';
  const allCommands: SlashCommandItem[] = [
    {
      id: 'quote',
      command: '/quote',
      title: 'Pro-Forma Quotation',
      description: effectiveIsAdmin ? 'Draft & dispatch a pro-forma quote with line items' : 'Request formal bulk price quotation',
      icon: <FileText className="w-4 h-4 text-[#F27D26]" />,
      action: () => {}
    },
    {
      id: 'freight',
      command: '/freight',
      title: 'Sea & Pallet Freight Rates',
      description: 'Lagos & Douala port shipping rates and lead times',
      icon: <Truck className="w-4 h-4 text-emerald-400" />,
      action: () => {}
    },
    {
      id: 'product',
      command: '/product',
      title: 'Attach Catalog Product',
      description: 'Select SKU from wholesale catalog to attach to chat',
      icon: <Package className="w-4 h-4 text-purple-400" />,
      action: () => {}
    },
    {
      id: 'net30',
      command: '/net30',
      title: 'Net 30 Commercial Credit',
      description: 'Terms and corporate qualification guidelines',
      icon: <CreditCard className="w-4 h-4 text-amber-400" />,
      action: () => {}
    },
    ...(effectiveIsAdmin
      ? [
          {
            id: 'note',
            command: '/note',
            title: 'Toggle Internal Staff Note',
            description: 'Write a private note invisible to the buyer',
            icon: <Lock className="w-4 h-4 text-amber-500" />,
            action: () => {}
          },
          {
            id: 'canned',
            command: '/canned',
            title: 'B2B Canned Responses',
            description: 'Open quick reply canned response selector',
            icon: <MessageSquare className="w-4 h-4 text-blue-400" />,
            action: () => {}
          }
        ]
      : []),
    {
      id: 'clear',
      command: '/clear',
      title: 'Clear Current Input',
      description: 'Reset input text and attachments',
      icon: <Trash2 className="w-4 h-4 text-red-400" />,
      action: () => {}
    }
  ];

  const search = query.startsWith('/') ? query.substring(1).toLowerCase() : query.toLowerCase();
  const filtered = allCommands.filter(
    (c) =>
      c.command.toLowerCase().includes(search) ||
      c.title.toLowerCase().includes(search) ||
      c.description.toLowerCase().includes(search)
  );

  if (filtered.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 w-72 max-h-64 overflow-y-auto animate-fadeIn z-50 text-xs">
      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-white/5 flex items-center justify-between mb-1">
        <span>Quick Slash Commands</span>
        <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px]">Esc to close</kbd>
      </div>

      <div className="space-y-0.5">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full p-2 rounded-xl text-left flex items-start gap-2.5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:scale-105 transition-transform shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px] text-[#F27D26]">
                  {item.command}
                </span>
                <span className="text-slate-800 dark:text-zinc-200 font-semibold">{item.title}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
