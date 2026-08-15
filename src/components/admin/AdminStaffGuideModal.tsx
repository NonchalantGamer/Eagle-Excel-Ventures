import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  BookOpen, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  Megaphone, 
  Users, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  HelpCircle,
  Truck,
  DollarSign,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  FileText,
  History
} from 'lucide-react';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';

interface AdminStaffGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTab?: (tab: string) => void;
}

type GuideTopic = 'getting-started' | 'orders' | 'inventory' | 'audit' | 'support' | 'broadcasts' | 'customers' | 'architecture';

export const AdminStaffGuideModal: React.FC<AdminStaffGuideModalProps> = ({
  isOpen,
  onClose,
  onJumpToTab
}) => {
  const [activeTopic, setActiveTopic] = useState<GuideTopic>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  useModalFocusLock(isOpen, onClose);

  if (!isOpen) return null;

  const handleActionClick = (tab: string) => {
    if (onJumpToTab) {
      onJumpToTab(tab);
    }
    onClose();
  };

  const topics = [
    { id: 'getting-started', label: '1. Getting Started & Daily Routine', icon: Sparkles },
    { id: 'orders', label: '2. Purchase Orders & Dispatch SOP', icon: ShoppingCart },
    { id: 'inventory', label: '3. Inventory & Wholesale Pricing', icon: Package },
    { id: 'audit', label: '4. Product Audit Trail & Live Sync', icon: History },
    { id: 'support', label: '5. Live Helpdesk & Quote Generation', icon: MessageSquare },
    { id: 'broadcasts', label: '6. Broadcasts & Supplier Alerts', icon: Megaphone },
    { id: 'customers', label: '7. Customers & Role Management', icon: Users },
    { id: 'architecture', label: '8. Supabase Database & Security', icon: Database },
  ];

  return typeof document !== 'undefined' ? createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn text-slate-900 dark:text-zinc-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#141414] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-4xl w-full h-[700px] max-h-[90vh] overflow-hidden flex flex-col animate-scaleUp">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-50 dark:bg-[#0e0e0e] border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-serif text-slate-950 dark:text-white">
                  Administrator & Employee Operating Manual
                </h2>
                <span className="bg-[#F27D26] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Staff SOP
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Step-by-step procedures for wholesale operations, order fulfillment, pricing, and live customer support.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Column (Topics Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar Navigation */}
          <div className="w-64 border-r border-slate-200 dark:border-white/5 p-3 space-y-1 bg-slate-50/50 dark:bg-[#101010] shrink-0 overflow-y-auto hidden sm:block">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Training Modules
            </div>
            {topics.map((t) => {
              const Icon = t.icon;
              const isActive = activeTopic === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTopic(t.id as GuideTopic)}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-left transition-all ${
                    isActive
                      ? 'bg-[#F27D26] text-black font-bold shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-[#F27D26]'}`} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Topic Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs leading-relaxed bg-white dark:bg-[#141414]">
            
            {/* Mobile Topic Switcher */}
            <div className="sm:hidden mb-4">
              <select
                value={activeTopic}
                onChange={(e) => setActiveTopic(e.target.value as GuideTopic)}
                className="w-full p-2.5 bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* TOPIC 1: GETTING STARTED */}
            {activeTopic === 'getting-started' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-zinc-200 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F27D26]" />
                    Welcome to Eagle Excel Ventures Wholesale Management
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-300">
                    As an operations administrator, your role is to ensure wholesale orders are vetted, stock levels are accurate, logistics dispatches run on schedule, and customer questions receive prompt answers.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">☀️ Daily Morning Routine for Administrators:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#F27D26] text-black font-extrabold text-[10px] flex items-center justify-center">1</span>
                        Check Pending Orders
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                        Review any purchase orders submitted overnight. Verify company details and payment terms (e.g. Net 30 Commercial vs Bank Transfer).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#F27D26] text-black font-extrabold text-[10px] flex items-center justify-center">2</span>
                        Clear Unread Inquiries
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                        Open the Support Helpdesk tab. Respond to high-volume price quote requests and generate official pro-forma estimates.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#F27D26] text-black font-extrabold text-[10px] flex items-center justify-center">3</span>
                        Review Low Inventory SKUs
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                        Check the inventory tab for SKUs flagged below 100 units. Notify warehouse managers or re-order from factory partners.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#F27D26] text-black font-extrabold text-[10px] flex items-center justify-center">4</span>
                        Update Waybills & Tracking
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                        When sea/air freight ships, mark orders as "Shipped" and enter the carrier PRO/Tracking code so buyers receive automated alerts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleActionClick('overview')}
                    className="py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Go to Operations Overview <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TOPIC 2: PURCHASE ORDERS & DISPATCH */}
            {activeTopic === 'orders' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-[#F27D26]" />
                    Purchase Order (PO) Processing Workflow
                  </h3>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs">
                    Eagle Excel orders follow a strict 4-stage lifecycle to ensure compliance and delivery tracking.
                  </p>
                </div>

                {/* Pipeline visual */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3">
                  <div className="font-bold text-slate-900 dark:text-zinc-200">The 4-Stage Fulfillment Pipeline:</div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase text-[10px] shrink-0 mt-0.5">
                        1. Pending
                      </span>
                      <div>
                        <strong className="text-slate-900 dark:text-zinc-100">Order Verification:</strong> The order was placed by the buyer. Check for valid company address and payment terms.
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase text-[10px] shrink-0 mt-0.5">
                        2. Processing
                      </span>
                      <div>
                        <strong className="text-slate-900 dark:text-zinc-100">Warehouse Pick & Pack:</strong> Payment/terms are cleared. The logistics team packages master cartons and prepares pallet staging.
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold uppercase text-[10px] shrink-0 mt-0.5">
                        3. Shipped
                      </span>
                      <div>
                        <strong className="text-slate-900 dark:text-zinc-100">Freight Handover:</strong> Handed to carrier (e.g. Bolloré, DHL Freight, Maersk). <span className="text-[#F27D26] font-bold">Important:</span> You will be prompted to enter the Tracking Number and Carrier Name.
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px] shrink-0 mt-0.5">
                        4. Delivered
                      </span>
                      <div>
                        <strong className="text-slate-900 dark:text-zinc-100">Confirmed Delivery:</strong> Port customs cleared and final destination handover completed.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleActionClick('orders')}
                    className="py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Open Orders & Dispatch <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TOPIC 3: INVENTORY & WHOLESALE PRICING */}
            {activeTopic === 'inventory' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#F27D26]" />
                    Product Catalog & Tiered Pricing Architecture
                  </h3>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs">
                    All products on Eagle Excel are sold at volume wholesale rates with automated discount brackets.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-200">Key Catalog Fields Explained:</h4>
                  <ul className="space-y-2 text-slate-600 dark:text-zinc-300">
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">SKU (Stock Keeping Unit):</strong> Unique code in format <code className="bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[#F27D26]">EE-[CAT]-[NUM]</code> (e.g. <code className="text-[#F27D26]">EE-AUD-902</code>).
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">MOQ (Minimum Order Quantity):</strong> The lowest volume a buyer can order (e.g. 10 cartons or 50 units).
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Packaging Unit:</strong> Physical shipping packaging (e.g. "Master Carton (10 Units)", "Pallet (240 Units)").
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Tiered Wholesale Rates:</strong> Automatic price breaks that scale by quantity (e.g. 10+ units @ $45.00, 50+ units @ $39.00, 200+ units @ $32.50).
                    </li>
                  </ul>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleActionClick('products')}
                    className="py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Open Product Inventory <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TOPIC 4: AUDIT TRAIL & REAL-TIME SYNC INSPECTOR */}
            {activeTopic === 'audit' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-[#F27D26]" />
                    Product Audit Trail & Real-Time Sync Inspector
                  </h3>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs">
                    Comprehensive ledger tracking every SKU creation, price update, stock depletion, catalog seed, and multi-device Supabase Postgres event.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-200">Key Features of the Audit Trail:</h4>
                  <ul className="space-y-2 text-slate-600 dark:text-zinc-300">
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Immutable Change Logging:</strong> Every modification to product title, price tiers, stock quantity, packaging unit, or category is timestamped with user context.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Visual Value Diffs:</strong> Expand any event to see previous vs synced attribute values (e.g. Price: $45 ➔ $40) and raw JSON snapshots.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Live Parity Diagnostic:</strong> Run the "Verify Sync Parity" tool to confirm zero-lag consistency between your browser cache, the Express server API, and Supabase Postgres.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Export Capabilities:</strong> Download full audit trails in CSV format for spreadsheet reporting or structured JSON for enterprise logging.
                    </li>
                  </ul>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleActionClick('audit')}
                    className="py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Open Audit & Sync Trail <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TOPIC 4: LIVE HELPDESK & QUOTES */}
            {activeTopic === 'support' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#F27D26]" />
                    Live Customer Support & Official Quotes
                  </h3>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs">
                    Direct real-time communication channel with registered commercial buyers across Nigeria, Cameroon, and global markets.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-200">Tools Available in Support Desk:</h4>
                  <div className="space-y-2 text-slate-600 dark:text-zinc-300">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-zinc-100">Generate Pro-Forma Quotation:</strong> Click "Generate Quote" in the chat toolbar to issue an itemized estimate with validity period, freight rate, and bulk unit prices directly inside the chat thread.
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-zinc-100">Attach Catalog Product Cards:</strong> Send full interactive SKU cards with instant "Add to Order" buttons.
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-zinc-100">Canned Quick Replies:</strong> Use one-click templates for shipping lead times, banking wire instructions, and Net 30 applications.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleActionClick('messages')}
                    className="py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Open Support Helpdesk <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TOPIC 5: BROADCASTS */}
            {activeTopic === 'broadcasts' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#F27D26]" />
                    Wholesale Broadcast & Promotional Push Campaigns
                  </h3>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs">
                    Dispatch critical updates, port arrivals, tariff revisions, or discount coupon promotions to all registered buyers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-200">Campaign Types & Targeting:</h4>
                  <ul className="space-y-2 text-slate-600 dark:text-zinc-300">
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Promotions & Flash Deals:</strong> Announce volume discounts (e.g. 15% off orders over $2,000 with promo code).
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Stock & Container Arrivals:</strong> Notify buyers that new container shipments have arrived at Lagos Port or Douala Port.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Logistics & Tariff Notices:</strong> Advise on customs clearance updates or holiday shipping cutoff dates.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-zinc-100">Regional Targeting:</strong> Broadcast to All Buyers, Nigeria Only, Cameroon Only, or a specific enterprise client.
                    </li>
                  </ul>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleActionClick('broadcasts')}
                    className="py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Open Broadcast Manager <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TOPIC 6: CUSTOMERS & RBAC */}
            {activeTopic === 'customers' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#F27D26]" />
                    Customer Directory & Role-Based Access Control (RBAC)
                  </h3>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs">
                    Manage buyer permissions and grant administrator credentials.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-200">Role Definitions:</h4>
                  <div className="space-y-2 text-slate-600 dark:text-zinc-300">
                    <div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase text-[10px]">
                        Customer
                      </span>
                      <p className="text-[11px] mt-1">
                        Can browse wholesale catalog, view bulk tier pricing, place purchase orders, request quotes, and chat with operations. Cannot view other buyers' orders or edit catalog prices.
                      </p>
                    </div>

                    <div className="pt-1">
                      <span className="px-2 py-0.5 rounded-full bg-[#F27D26]/10 text-[#F27D26] font-bold uppercase text-[10px]">
                        Administrator
                      </span>
                      <p className="text-[11px] mt-1">
                        Full access to ERP console, catalog creation/editing, order status changes, carrier tracking inputs, broadcast dispatching, and user role management.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleActionClick('customers')}
                    className="py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Open Customer Directory <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TOPIC 7: ARCHITECTURE */}
            {activeTopic === 'architecture' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#F27D26]" />
                    Supabase PostgreSQL Database & Real-Time Sync
                  </h3>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs">
                    Technical overview of cloud data synchronization, tables, and fallback systems.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2 text-slate-600 dark:text-zinc-300">
                  <p>
                    Eagle Excel uses Supabase (PostgreSQL) with automatic real-time WebSocket subscriptions. When an order is placed or a customer sends a message, all active administrator dashboards update instantly without page reloads.
                  </p>
                  <p>
                    If the cloud connection is momentarily interrupted, local cache fallback ensures you can continue viewing products, preparing invoices, and managing tasks seamlessly.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleActionClick('docs')}
                    className="py-2 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Open Architecture & Docs <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>,
    document.body
  ) : null;
};
