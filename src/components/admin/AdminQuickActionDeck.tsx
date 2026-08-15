import React, { useState } from 'react';
import { 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  Users, 
  Megaphone, 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  ShieldCheck,
  Check,
  History
} from 'lucide-react';

interface AdminQuickActionDeckProps {
  pendingOrdersCount: number;
  lowStockCount: number;
  unreadMessagesCount: number;
  totalUsersCount: number;
  onOpenProductModal: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenStaffGuide: () => void;
}

export const AdminQuickActionDeck: React.FC<AdminQuickActionDeckProps> = ({
  pendingOrdersCount,
  lowStockCount,
  unreadMessagesCount,
  totalUsersCount,
  onOpenProductModal,
  onNavigateTab,
  onOpenStaffGuide
}) => {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ee_shift_checklist_completed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);

  const toggleTask = (taskId: string) => {
    const updated = { ...completedTasks, [taskId]: !completedTasks[taskId] };
    setCompletedTasks(updated);
    try {
      localStorage.setItem('ee_shift_checklist_completed', JSON.stringify(updated));
    } catch {}
  };

  const glossaryTerms: Record<string, { term: string; definition: string; practicalExample: string }> = {
    'MOQ': {
      term: 'MOQ (Minimum Order Quantity)',
      definition: 'The minimum number of units or master cartons a corporate wholesale buyer must order in a single transaction.',
      practicalExample: 'e.g., An MOQ of 10 Master Cartons ensures freight packing efficiency and bulk margin protection.'
    },
    'FCL_LCL': {
      term: 'FCL vs LCL Freight',
      definition: 'FCL = Full Container Load (entire 20ft or 40ft ocean container). LCL = Less than Container Load (palletized cargo consolidated with other shippers).',
      practicalExample: 'Ocean shipping routes from China to Lagos (Apapa/Tin Can) or Douala Port support both FCL and LCL.'
    },
    'FOB_CIF': {
      term: 'Incoterms: FOB & CIF',
      definition: 'FOB (Free On Board) = Buyer pays sea freight from origin. CIF (Cost, Insurance & Freight) = Eagle Excel covers ocean freight and marine insurance to African destination port.',
      practicalExample: 'Eagle Excel handles end-to-end CIF landed logistics for enterprise procurement.'
    },
    'Net30': {
      term: 'Net 30 Payment Terms',
      definition: 'Commercial credit arrangement where approved corporate buyers settle invoice balances within 30 calendar days of cargo delivery.',
      practicalExample: 'Assigned to verified repeat buyers after credit assessment.'
    },
    'RBAC': {
      term: 'RBAC (Role-Based Access Control)',
      definition: 'Security architecture distinguishing Administrator accounts (full backend console control) from Customer accounts (storefront purchasing only).',
      practicalExample: 'Promote trusted inventory managers in the Customers & RBAC tab.'
    }
  };

  const tasks = [
    { id: 'orders', label: `Fulfill & Dispatch Pending Orders (${pendingOrdersCount})`, tab: 'orders', alert: pendingOrdersCount > 0 },
    { id: 'inventory', label: `Restock Low Inventory SKUs (${lowStockCount} items)`, tab: 'products', alert: lowStockCount > 0 },
    { id: 'messages', label: `Answer Customer Support Inquiries (${unreadMessagesCount} unread)`, tab: 'messages', alert: unreadMessagesCount > 0 },
    { id: 'users', label: `Review & Verify New Registered Buyers (${totalUsersCount} total)`, tab: 'customers', alert: false }
  ];

  return (
    <div className="space-y-4">
      {/* Quick Launchpad Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F27D26]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Operations Quick Launchpad
            </h3>
          </div>
          <button
            onClick={onOpenStaffGuide}
            className="text-xs font-bold text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Staff Operating Manual (8 SOPs)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Action 1: Add Product */}
          <button
            onClick={onOpenProductModal}
            className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 hover:border-[#F27D26] dark:hover:border-[#F27D26] transition-all text-left group shadow-xs cursor-pointer flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#F27D26] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-[#F27D26] transition-colors">
                Add Product
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">MOQ & Bulk Tiers</div>
            </div>
          </button>

          {/* Action 2: Process Orders */}
          <button
            onClick={() => onNavigateTab('orders')}
            className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left group shadow-xs cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-4 h-4" />
              </div>
              {pendingOrdersCount > 0 && (
                <span className="bg-[#F27D26] text-black text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">
                Dispatch Orders
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{pendingOrdersCount} pending dispatch</div>
            </div>
          </button>

          {/* Action 3: Live Helpdesk */}
          <button
            onClick={() => onNavigateTab('messages')}
            className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left group shadow-xs cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              {unreadMessagesCount > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full animate-pulse">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">
                Support Helpdesk
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{unreadMessagesCount} unread chats</div>
            </div>
          </button>

          {/* Action 4: Customer Accounts */}
          <button
            onClick={() => onNavigateTab('customers')}
            className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 hover:border-purple-500 dark:hover:border-purple-500 transition-all text-left group shadow-xs cursor-pointer flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-purple-500 transition-colors">
                Buyer Accounts
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{totalUsersCount} registered buyers</div>
            </div>
          </button>

          {/* Action 5: Product Audit & Sync Trail */}
          <button
            onClick={() => onNavigateTab('audit')}
            className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 hover:border-teal-500 dark:hover:border-teal-500 transition-all text-left group shadow-xs cursor-pointer flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-teal-600 transition-colors">
                Audit Trail
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Live Sync & Diffs</div>
            </div>
          </button>

          {/* Action 6: Broadcast Promo */}
          <button
            onClick={() => onNavigateTab('broadcasts')}
            className="p-3 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 hover:border-amber-500 dark:hover:border-amber-500 transition-all text-left group shadow-xs cursor-pointer flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                Push Broadcast
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Discounts & Freight</div>
            </div>
          </button>

          {/* Action 7: Staff SOP Manual */}
          <button
            onClick={onOpenStaffGuide}
            className="p-3 rounded-2xl bg-slate-900 text-white border border-slate-800 hover:border-[#F27D26] transition-all text-left group shadow-xs cursor-pointer flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-[#F27D26]/20 text-[#F27D26] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-zinc-100 group-hover:text-[#F27D26] transition-colors">
                Employee Manual
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">8 Step-by-Step SOPs</div>
            </div>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Shift Checklist & Wholesale Terms Glossary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Card 1: Shift Routine Checklist */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                Daily Shift Operations Checklist
              </h4>
            </div>
            <span className="text-[10px] text-slate-400">
              {Object.values(completedTasks).filter(Boolean).length} of {tasks.length} done
            </span>
          </div>

          <div className="space-y-2">
            {tasks.map(task => {
              const isDone = !!completedTasks[task.id];
              return (
                <div
                  key={task.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                    isDone 
                      ? 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-zinc-500 line-through' 
                      : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 hover:border-[#F27D26]'
                  }`}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-zinc-600'
                    }`}>
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="font-semibold">{task.label}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateTab(task.tab);
                    }}
                    className="text-[11px] font-bold text-[#F27D26] hover:underline flex items-center gap-0.5 no-underline ml-2"
                  >
                    <span>Jump</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Wholesale Glossary & Quick Cheat Sheet */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                  Wholesale & Logistics Glossary
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">Click any term for details</span>
            </div>

            {/* Glossary Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.keys(glossaryTerms).map(key => {
                const item = glossaryTerms[key];
                const isSelected = activeGlossaryTerm === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveGlossaryTerm(isSelected ? null : key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#F27D26] text-black shadow-xs' 
                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {key.replace('_', ' / ')}
                  </button>
                );
              })}
            </div>

            {/* Expanded definition or default tip */}
            {activeGlossaryTerm && glossaryTerms[activeGlossaryTerm] ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-800 dark:text-zinc-200 animate-fadeIn">
                <div className="font-bold text-[#F27D26] mb-1">
                  {glossaryTerms[activeGlossaryTerm].term}
                </div>
                <p className="text-slate-600 dark:text-zinc-300 leading-relaxed mb-1.5">
                  {glossaryTerms[activeGlossaryTerm].definition}
                </p>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-black/10 dark:bg-black/40 p-2 rounded-lg font-mono">
                  💡 {glossaryTerms[activeGlossaryTerm].practicalExample}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-zinc-400">
                💡 <strong>Staff Tip:</strong> Click any badge above (<span className="text-[#F27D26] font-bold">MOQ, FCL/LCL, FOB/CIF, Net 30, RBAC</span>) to view its definition, calculation method, and operational application.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>Need full procedures?</span>
            <button
              onClick={onOpenStaffGuide}
              className="text-xs font-bold text-[#F27D26] hover:underline"
            >
              Browse Operating Manual →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
