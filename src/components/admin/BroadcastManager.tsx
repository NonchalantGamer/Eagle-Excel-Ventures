import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  Tag, 
  Sparkles, 
  Percent, 
  Truck, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Search, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  Eye, 
  Layers, 
  Globe, 
  Filter, 
  ArrowRight, 
  X,
  ShieldCheck,
  Zap,
  Info,
  Radio,
  FileText
} from 'lucide-react';
import { 
  BroadcastCampaign, 
  UserProfile, 
  PageView, 
  UserRole 
} from '../../types';
import { 
  getBroadcastCampaigns, 
  sendBroadcastCampaign, 
  toggleBroadcastStatus, 
  deleteBroadcastCampaign, 
  subscribeToBroadcastCampaigns,
  getCachedBroadcastCampaigns
} from '../../services/broadcastService';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface BroadcastManagerProps {
  users: UserProfile[];
  currentAdmin: UserProfile | null;
  onNavigate?: (view: PageView) => void;
  initialSelectedUserId?: string | null;
  onCloseDirectModal?: () => void;
}

interface PresetTemplate {
  id: string;
  name: string;
  icon: string;
  type: BroadcastCampaign['type'];
  title: string;
  message: string;
  promoCode?: string;
  discountPercentage?: number;
  actionLabel?: string;
  actionTargetView?: PageView;
  targetAudience: BroadcastCampaign['targetAudience'];
  priority?: 'normal' | 'urgent';
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'solar-discount',
    name: '15% Solar & Energy Bulk Special',
    icon: '⚡',
    type: 'promotional',
    title: '⚡ 15% Bulk Discount on Solar Inverters & Tier-1 Lithium Batteries',
    message: 'Exclusive container-load promotion for verified wholesale distributors: Enjoy 15% factory direct discount on all 5kVA - 15kVA Solar Inverter systems and 48V Lithium-ion storage packs with priority Lagos/Douala port clearance.',
    promoCode: 'SOLAR15',
    discountPercentage: 15,
    actionLabel: 'Explore Solar Catalog',
    actionTargetView: 'catalog',
    targetAudience: 'all',
    priority: 'normal'
  },
  {
    id: 'fcl-departure',
    name: 'Direct Sea Freight Departure Notice',
    icon: '🚢',
    type: 'supply_chain',
    title: '🚢 Shenzhen Direct Vessel Departure Scheduled for Lagos & Douala',
    message: 'Consignment booking closing soon for vessel MV Africa Express departing Shenzhen Port on the 15th. Groupage LCL and FCL spaces available with fast-track Form M & BESIC single-window processing.',
    actionLabel: 'View Logistics Schedule',
    actionTargetView: 'supply-chain',
    targetAudience: 'all',
    priority: 'normal'
  },
  {
    id: 'q3-catalog',
    name: 'New Q3 Electronics Catalog Arrival',
    icon: '📦',
    type: 'catalog_update',
    title: '📦 New Q3 Factory Catalog Released: Heavy Machinery & Smart Electronics',
    message: 'We have updated our export catalog with 25+ high-demand wholesale product lines directly from ISO-certified Guangdong manufacturing hubs, featuring tiered volume pricing.',
    actionLabel: 'Browse New Arrivals',
    actionTargetView: 'catalog',
    targetAudience: 'all',
    priority: 'normal'
  },
  {
    id: 'flash-clearance',
    name: 'Weekend Flash Clearance (20% Off)',
    icon: '🏷️',
    type: 'promotional',
    title: '🏷️ Flash Wholesale Clearance: 20% Off Consumer Electronics',
    message: 'Limited stock factory clearance on palletized consumer electronics, smart home hardware, and industrial power accessories. Apply code FLASH20 at checkout while inventory lasts.',
    promoCode: 'FLASH20',
    discountPercentage: 20,
    actionLabel: 'Claim 20% Discount',
    actionTargetView: 'catalog',
    targetAudience: 'all',
    priority: 'normal'
  },
  {
    id: 'customs-fasttrack',
    name: 'Single-Window Customs Advisory',
    icon: '🛡️',
    type: 'announcement',
    title: '🛡️ Streamlined Customs Clearance Protocol for Nigerian & Cameroonian Importers',
    message: 'Eagle Excel Ventures has integrated new destination bonded terminal clearance lanes at Apapa/Tin Can (Lagos) and Port of Douala to reduce container dwell time to under 48 hours.',
    actionLabel: 'Review Regulatory Docs',
    actionTargetView: 'docs',
    targetAudience: 'all',
    priority: 'normal'
  },
  {
    id: 'rfq-inspection',
    name: 'Waived Inspection Fee on Bulk RFQs',
    icon: '📋',
    type: 'promotional',
    title: '📋 Free Pre-Shipment Quality Inspection on All Custom Sourcing RFQs',
    message: 'Submit your bulk container sourcing quotation this month and receive complimentary 100% factory pre-shipment quality inspection and container loading supervision ($450 value waived).',
    promoCode: 'INSPECTFREE',
    discountPercentage: 100,
    actionLabel: 'Submit Bulk RFQ',
    actionTargetView: 'rfq',
    targetAudience: 'all',
    priority: 'normal'
  }
];

export const BroadcastManager: React.FC<BroadcastManagerProps> = ({
  users,
  currentAdmin,
  onNavigate,
  initialSelectedUserId,
  onCloseDirectModal
}) => {
  const { showToast } = useToast();
  const { sendBroadcastToCustomers } = useNotifications();

  const wholesaleCustomers = users.filter(u => u.role === 'customer');
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>(getCachedBroadcastCampaigns);
  const [isComposerOpen, setIsComposerOpen] = useState(!!initialSelectedUserId);
  const [isSending, setIsSending] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter & Search
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignToDelete, setCampaignToDelete] = useState<BroadcastCampaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<BroadcastCampaign['type']>('promotional');
  const [targetAudience, setTargetAudience] = useState<BroadcastCampaign['targetAudience']>(
    initialSelectedUserId ? 'selected' : 'all'
  );
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(
    initialSelectedUserId ? [initialSelectedUserId] : []
  );
  const [customerSearch, setCustomerSearch] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<string>('');
  const [actionLabel, setActionLabel] = useState('Explore Wholesale Catalog');
  const [actionTargetView, setActionTargetView] = useState<PageView>('catalog');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  // Subscribe to real-time broadcasts
  useEffect(() => {
    const unsubscribe = subscribeToBroadcastCampaigns((list) => {
      setCampaigns(list);
    });
    return () => unsubscribe();
  }, []);

  // Update selection if prop changes
  useEffect(() => {
    if (initialSelectedUserId) {
      setIsComposerOpen(true);
      setTargetAudience('selected');
      setSelectedCustomerIds([initialSelectedUserId]);
      const targetUser = users.find(u => u.id === initialSelectedUserId);
      if (targetUser) {
        setTitle(`📢 Direct Notice for ${targetUser.displayName || targetUser.companyName || 'Valued Buyer'}`);
      }
    }
  }, [initialSelectedUserId, users]);

  const handleApplyTemplate = (template: PresetTemplate) => {
    setTitle(template.title);
    setMessage(template.message);
    setType(template.type);
    setPromoCode(template.promoCode || '');
    setDiscountPercentage(template.discountPercentage ? String(template.discountPercentage) : '');
    setActionLabel(template.actionLabel || 'Explore Catalog');
    setActionTargetView(template.actionTargetView || 'catalog');
    setTargetAudience(template.targetAudience);
    setPriority(template.priority || 'normal');
    showToast(`Template applied: ${template.name}`);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(title || '').trim()) {
      showToast('Please enter a broadcast title/headline', 'error');
      return;
    }
    if (!(message || '').trim()) {
      showToast('Please enter announcement message body', 'error');
      return;
    }
    if (targetAudience === 'selected' && selectedCustomerIds.length === 0) {
      showToast('Please select at least one customer recipient', 'error');
      return;
    }

    setIsSending(true);
    try {
      const recipientCount = targetAudience === 'all' 
        ? wholesaleCustomers.length 
        : targetAudience === 'nigeria'
          ? wholesaleCustomers.filter(u => u.address?.country?.toLowerCase().includes('nigeria') || !u.address?.country).length
          : targetAudience === 'cameroon'
            ? wholesaleCustomers.filter(u => u.address?.country?.toLowerCase().includes('cameroon')).length
            : selectedCustomerIds.length;

      const cleanPromo = (promoCode || '').trim();
      const cleanAction = (actionLabel || '').trim();

      const created = await sendBroadcastToCustomers({
        title: (title || '').trim(),
        message: (message || '').trim(),
        type,
        targetAudience,
        targetUserIds: targetAudience === 'selected' ? selectedCustomerIds : undefined,
        promoCode: cleanPromo ? cleanPromo.toUpperCase() : undefined,
        discountPercentage: discountPercentage ? parseFloat(discountPercentage) : undefined,
        actionLabel: cleanAction || undefined,
        actionTargetView,
        senderId: currentAdmin?.id || 'admin',
        senderName: currentAdmin?.displayName || 'Joshua Egesi (Managing Director)',
        senderRole: 'admin',
        recipientCount: Math.max(1, recipientCount),
        priority
      });

      showToast(`Broadcast sent successfully to ${created.recipientCount} wholesale buyers!`);
      
      // Reset form
      setTitle('');
      setMessage('');
      setPromoCode('');
      setDiscountPercentage('');
      setIsComposerOpen(false);
      if (onCloseDirectModal) onCloseDirectModal();
    } catch (err: any) {
      console.error('Failed to send broadcast:', err);
      showToast(`Error sending broadcast: ${err.message || 'Database write error'}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleActive = async (campaign: BroadcastCampaign) => {
    try {
      await toggleBroadcastStatus(campaign.id, !campaign.active);
      showToast(`Promotion status changed to ${!campaign.active ? 'Active' : 'Paused'}`);
    } catch (err: any) {
      showToast(`Failed to update promotion status: ${err.message}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);
    try {
      await deleteBroadcastCampaign(campaignToDelete.id);
      showToast('Broadcast campaign record deleted');
      setCampaignToDelete(null);
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Promo code copied: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDuplicateCampaign = (campaign: BroadcastCampaign) => {
    setTitle(campaign.title);
    setMessage(campaign.message);
    setType(campaign.type);
    setTargetAudience(campaign.targetAudience);
    setSelectedCustomerIds(campaign.targetUserIds || []);
    setPromoCode(campaign.promoCode || '');
    setDiscountPercentage(campaign.discountPercentage ? String(campaign.discountPercentage) : '');
    setActionLabel(campaign.actionLabel || 'Explore Catalog');
    setActionTargetView(campaign.actionTargetView || 'catalog');
    setPriority(campaign.priority || 'normal');
    setIsComposerOpen(true);
    showToast('Loaded campaign into broadcast composer');
  };

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    const cleanSearch = (searchQuery || '').trim();
    if (cleanSearch) {
      const q = cleanSearch.toLowerCase();
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchMsg = (c.message || '').toLowerCase().includes(q);
      const matchCode = c.promoCode?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchCode;
    }
    return true;
  });

  const activePromosCount = campaigns.filter(c => c.active && (c.type === 'promotional' || c.promoCode)).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-100">{campaigns.length}</div>
            <div className="text-xs font-bold text-slate-500 dark:text-zinc-400">Total Broadcasts Sent</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-100">{activePromosCount}</div>
            <div className="text-xs font-bold text-slate-500 dark:text-zinc-400">Active Live Promotions</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-100">{wholesaleCustomers.length}</div>
            <div className="text-xs font-bold text-slate-500 dark:text-zinc-400">Wholesale Buyer Audience</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              {campaigns[0] ? new Date(campaigns[0].sentAt).toLocaleDateString() : 'No broadcasts yet'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
              {campaigns[0] ? campaigns[0].title : 'Send first announcement'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Broadcast Control Panel */}
      <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden">
        {/* Header with Actions */}
        <div className="p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#F27D26]" />
              <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-base">
                Customer Broadcast & Promotional Updates
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Dispatch instant real-time alerts, seasonal bulk discounts, and shipping updates to all registered buyers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsComposerOpen(!isComposerOpen)}
              className="py-2.5 px-4 rounded-xl bg-linear-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black font-extrabold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer btn-hover"
            >
              {isComposerOpen ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>{isComposerOpen ? 'Close Composer' : 'Compose New Broadcast'}</span>
            </button>
          </div>
        </div>

        {/* Quick Preset Templates Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" /> 1-Click Wholesale Campaign Templates
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-500">Click any preset to pre-fill composer</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PRESET_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => {
                  handleApplyTemplate(tmpl);
                  setIsComposerOpen(true);
                }}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1c1f] hover:border-[#F27D26]/50 hover:bg-slate-50 dark:hover:bg-white/10 text-left transition-all group cursor-pointer shadow-2xs"
              >
                <div className="text-base mb-1 group-hover:scale-110 transition-transform">{tmpl.icon}</div>
                <div className="text-[11px] font-bold text-slate-900 dark:text-zinc-200 line-clamp-1 group-hover:text-[#F27D26] transition-colors">
                  {tmpl.name}
                </div>
                {tmpl.promoCode && (
                  <span className="inline-block mt-1 text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-amber-500/10 text-[#F27D26]">
                    {tmpl.promoCode}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* COMPOSER FORM SECTION */}
        {isComposerOpen && (
          <div className="p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#121214] animate-in fade-in slide-in-from-top-3 duration-200">
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                    Live Broadcast Message Composer
                  </h4>
                </div>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Target: <strong className="text-slate-800 dark:text-zinc-200 font-bold">{targetAudience === 'all' ? `All Wholesale Buyers (${wholesaleCustomers.length})` : targetAudience === 'nigeria' ? 'Nigeria Importers' : targetAudience === 'cameroon' ? 'Cameroon Importers' : `${selectedCustomerIds.length} Selected Buyer(s)`}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                      Broadcast Headline / Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. ⚡ Special 15% Bulk Discount on Solar Inverters & Batteries"
                      required
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-zinc-100 text-xs font-bold focus:ring-2 focus:ring-[#F27D26] outline-hidden shadow-2xs"
                    />
                  </div>

                  {/* Category & Audience Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Broadcast Category
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-zinc-100 text-xs font-semibold focus:ring-2 focus:ring-[#F27D26] outline-hidden shadow-2xs cursor-pointer"
                      >
                        <option value="promotional">🏷️ Promotional Deal & Discount</option>
                        <option value="announcement">📢 General Announcement</option>
                        <option value="catalog_update">📦 New Catalog Drop / Arrivals</option>
                        <option value="supply_chain">🚢 Maritime Shipping / Freight Notice</option>
                        <option value="urgent">🚨 Urgent Operational Notice</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Target Audience
                      </label>
                      <select
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-zinc-100 text-xs font-semibold focus:ring-2 focus:ring-[#F27D26] outline-hidden shadow-2xs cursor-pointer"
                      >
                        <option value="all">🌐 All Registered Wholesale Customers ({wholesaleCustomers.length})</option>
                        <option value="nigeria">🇳🇬 Nigeria Importers & Warehouses</option>
                        <option value="cameroon">🇨🇲 Cameroon Importers & Warehouses</option>
                        <option value="selected">🎯 Select Specific Registered Customers</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer Multi-Select if 'selected' */}
                  {targetAudience === 'selected' && (
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          Selected Buyers ({selectedCustomerIds.length} of {wholesaleCustomers.length})
                        </span>
                        <div className="flex gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerIds(wholesaleCustomers.map(u => u.id))}
                            className="text-[#F27D26] font-bold hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-400">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerIds([])}
                            className="text-slate-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Filter customers by name or email..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-zinc-200 outline-hidden"
                        />
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100 dark:divide-white/5">
                        {wholesaleCustomers
                          .filter(u => 
                            !(customerSearch || '').trim() || 
                            u.displayName?.toLowerCase().includes((customerSearch || '').toLowerCase()) || 
                            u.email?.toLowerCase().includes((customerSearch || '').toLowerCase()) ||
                            u.companyName?.toLowerCase().includes((customerSearch || '').toLowerCase())
                          )
                          .map(cust => (
                            <label
                              key={cust.id}
                              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCustomerIds.includes(cust.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCustomerIds(prev => [...prev, cust.id]);
                                  } else {
                                    setSelectedCustomerIds(prev => prev.filter(id => id !== cust.id));
                                  }
                                }}
                                className="rounded text-[#F27D26] focus:ring-[#F27D26]"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 dark:text-zinc-100 truncate">{cust.displayName || cust.email}</div>
                                <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{cust.companyName || 'Wholesale Buyer'} • {cust.email}</div>
                              </div>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Promo Code & Discount Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-[#F27D26]" /> Promo Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SOLAR15, FLASH20"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-zinc-100 text-xs font-mono font-bold focus:ring-2 focus:ring-[#F27D26] outline-hidden uppercase shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-emerald-500" /> Discount % (Optional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(e.target.value)}
                        placeholder="e.g. 15 for 15% OFF"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-zinc-100 text-xs font-bold focus:ring-2 focus:ring-[#F27D26] outline-hidden shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Message Body */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                      Announcement / Promotional Message Body <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Write your wholesale update, container shipping details, or promotional terms here..."
                      required
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-zinc-100 text-xs font-medium focus:ring-2 focus:ring-[#F27D26] outline-hidden leading-relaxed shadow-2xs"
                    />
                    <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                      <span>Live markdown & emojis supported (⚡, 🚢, 📦, 🏷️)</span>
                      <span>{message.length} characters</span>
                    </div>
                  </div>

                  {/* Action Link Target & Label */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Destination View
                      </label>
                      <select
                        value={actionTargetView}
                        onChange={(e) => setActionTargetView(e.target.value as PageView)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-zinc-100 text-xs font-semibold focus:ring-2 focus:ring-[#F27D26] outline-hidden shadow-2xs cursor-pointer"
                      >
                        <option value="catalog">🛍️ Wholesale Product Catalog</option>
                        <option value="rfq">📋 Custom Sourcing RFQ Form</option>
                        <option value="supply-chain">🚢 Container Shipping & Freight Hub</option>
                        <option value="orders">📦 Customer Orders & Dispatch</option>
                        <option value="docs">🛡️ Export Regulations & Tariffs</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Button Action Label
                      </label>
                      <input
                        type="text"
                        value={actionLabel}
                        onChange={(e) => setActionLabel(e.target.value)}
                        placeholder="e.g. Explore Catalog, Claim Offer"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-zinc-100 text-xs font-bold focus:ring-2 focus:ring-[#F27D26] outline-hidden shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Buyer Device Preview Card */}
                <div className="lg:col-span-5 flex flex-col">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#F27D26]" /> Live Customer View Preview
                  </label>

                  <div className="flex-1 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-xs flex flex-col justify-between space-y-4">
                    {/* Simulated Notification Dropdown Item */}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                        How it looks in Notification Bell & Banner:
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-white/10 space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg bg-amber-500/10 text-[#F27D26] shrink-0 mt-0.5">
                            {type === 'promotional' ? <Tag className="w-4 h-4" /> : type === 'supply_chain' ? <Truck className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {title || 'Headline will appear here...'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Just now</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed line-clamp-3">
                              {message || 'Your broadcast announcement text will be delivered instantly to wholesale customer dashboards.'}
                            </p>
                          </div>
                        </div>

                        {/* Promo / Action Badges in Preview */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                          <div className="flex items-center gap-1.5">
                            {promoCode && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-[#F27D26] font-mono text-[10px] font-bold border border-amber-500/20">
                                Code: {promoCode}
                              </span>
                            )}
                            {discountPercentage && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                {discountPercentage}% OFF
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] font-bold text-[#F27D26] flex items-center gap-1 hover:underline">
                            {actionLabel || 'View Details'} <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sender Credential Footer */}
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-slate-600 dark:text-zinc-400 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-zinc-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#F27D26]" /> Official Dispatch Authorization
                      </div>
                      <div>
                        Sent by: <strong className="text-slate-800 dark:text-zinc-100">{currentAdmin?.displayName || 'Joshua Egesi'}</strong> (Managing Director)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  disabled={isSending}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSending}
                  className="py-2.5 px-6 rounded-xl bg-linear-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black font-black text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 btn-hover"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Broadcasting to Customers...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Broadcast Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CAMPAIGN HISTORY & MANAGEMENT TABLE */}
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setFilterType('all')}
                className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-extrabold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                All Campaigns ({campaigns.length})
              </button>
              <button
                onClick={() => setFilterType('promotional')}
                className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'promotional'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-extrabold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Promotional Deals
              </button>
              <button
                onClick={() => setFilterType('supply_chain')}
                className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'supply_chain'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-extrabold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Logistics & Freight
              </button>
              <button
                onClick={() => setFilterType('catalog_update')}
                className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'catalog_update'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-extrabold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Catalog Arrivals
              </button>
              <button
                onClick={() => setFilterType('announcement')}
                className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'announcement'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-extrabold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Announcements
              </button>
            </div>

            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sent campaigns..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-zinc-200 outline-hidden"
              />
            </div>
          </div>

          {/* Campaigns List */}
          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-[#F27D26] flex items-center justify-center mx-auto mb-3">
                <Megaphone className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">No Broadcast Campaigns Found</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                {searchQuery ? 'No campaigns matched your search filter.' : 'You haven\'t dispatched any broadcast campaigns yet. Click "Compose New Broadcast" or pick a template above to send your first wholesale announcement!'}
              </p>
              {!isComposerOpen && (
                <button
                  onClick={() => setIsComposerOpen(true)}
                  className="mt-4 py-2 px-4 rounded-xl bg-[#F27D26] text-black font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer btn-hover"
                >
                  <Send className="w-3.5 h-3.5" /> Compose First Broadcast
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#161616] hover:border-slate-300 dark:hover:border-white/15 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          campaign.type === 'promotional'
                            ? 'bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/30'
                            : campaign.type === 'supply_chain'
                              ? 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30'
                              : campaign.type === 'catalog_update'
                                ? 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30'
                                : campaign.type === 'urgent'
                                  ? 'bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/30'
                                  : 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-zinc-200'
                        }`}>
                          {campaign.type === 'promotional' ? '🏷️ Promotion' : campaign.type === 'supply_chain' ? '🚢 Logistics' : campaign.type === 'catalog_update' ? '📦 Catalog' : campaign.type === 'urgent' ? '🚨 Urgent' : '📢 Announcement'}
                        </span>

                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                          {campaign.title}
                        </h4>

                        {campaign.promoCode && (
                          <button
                            type="button"
                            onClick={() => handleCopyCode(campaign.promoCode!)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-[#F27D26] font-mono text-[10px] font-bold border border-amber-500/30 cursor-pointer"
                            title="Click to copy promo code"
                          >
                            {copiedCode === campaign.promoCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{campaign.promoCode}</span>
                            {campaign.discountPercentage && <span>({campaign.discountPercentage}% OFF)</span>}
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed max-w-4xl">
                        {campaign.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {/* Active Status Switch */}
                      <button
                        onClick={() => handleToggleActive(campaign)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          campaign.active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-200 dark:bg-white/5 text-slate-500'
                        }`}
                        title="Toggle whether promotion is active"
                      >
                        {campaign.active ? '● Active' : '○ Paused'}
                      </button>

                      {/* Re-send / Duplicate */}
                      <button
                        onClick={() => handleDuplicateCampaign(campaign)}
                        title="Duplicate into Composer"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setCampaignToDelete(campaign)}
                        title="Delete campaign"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400 dark:text-zinc-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(campaign.sentAt).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-400" />
                        Target: <strong className="text-slate-700 dark:text-zinc-300 font-semibold">{campaign.targetAudience === 'all' ? `All Wholesale Buyers (${campaign.recipientCount})` : campaign.targetAudience === 'nigeria' ? 'Nigeria Market' : campaign.targetAudience === 'cameroon' ? 'Cameroon Market' : `${campaign.recipientCount} Selected Buyers`}</strong>
                      </span>
                      {campaign.actionTargetView && onNavigate && (
                        <>
                          <span>•</span>
                          <button
                            onClick={() => onNavigate(campaign.actionTargetView!)}
                            className="text-[#F27D26] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                          >
                            <span>Target: {campaign.actionLabel || campaign.actionTargetView}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    <span>Sender: {campaign.senderName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!campaignToDelete}
        title="Delete Broadcast Campaign Record?"
        message={`Are you sure you want to delete "${campaignToDelete?.title}"? This will remove the campaign record from database history.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Campaign'}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setCampaignToDelete(null)}
      />
    </div>
  );
};
