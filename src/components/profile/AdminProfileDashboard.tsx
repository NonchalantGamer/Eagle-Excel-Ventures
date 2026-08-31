import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  Sliders, 
  Bell, 
  Key, 
  Save, 
  Camera, 
  CheckCircle2, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Users, 
  MessageSquare, 
  ExternalLink,
  Layers,
  Sparkles,
  RotateCcw,
  LogOut,
  AlertTriangle,
  FileText,
  Lock,
  Cpu,
  UserCheck,
  ChevronRight,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import { UserProfile } from '../../types';
import { ProfilePhotoModal } from './ProfilePhotoModal';
import { ProfileDashboardSkeleton } from '../ui/Skeleton';

interface AdminProfileDashboardProps {
  onNavigate: (view: 'catalog' | 'orders' | 'admin' | 'docs' | 'profile') => void;
  onOpenSettings?: () => void;
}

export const AdminProfileDashboard: React.FC<AdminProfileDashboardProps> = ({
  onNavigate,
  onOpenSettings
}) => {
  const { currentUser, userProfile, updateProfileData, logout, role, setSimulatedRole, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  // Active Profile Section
  const [activeTab, setActiveTab] = useState<'identity' | 'operations' | 'security' | 'hub'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ee_admin_profile_tab');
        const valid = ['identity', 'operations', 'security', 'hub'];
        if (stored && valid.includes(stored)) {
          return stored as any;
        }
      }
    } catch {}
    return 'identity';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('ee_admin_profile_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Platform Operational Preferences
  const [currency, setCurrency] = useState('USD ($)');
  const [lowStockThreshold, setLowStockThreshold] = useState(15);
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [auditLogs, setAuditLogs] = useState(true);
  const [timezone, setTimezone] = useState('UTC-5 (Eastern Time)');

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Populate values
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || 'Joshua Egesi');
      setTitle(userProfile.title || 'Executive Managing Director');
      setCompanyName(userProfile.companyName || 'Eagle Excel Headquarters');
      setPhone(userProfile.phone || '+1 (800) 555-EAGLE');
      setPhotoURL(userProfile.photoURL || userProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');

      if (userProfile.adminPreferences) {
        setCurrency(userProfile.adminPreferences.currency || 'USD ($)');
        setLowStockThreshold(userProfile.adminPreferences.lowStockThreshold || 15);
        setAutoInvoice(userProfile.adminPreferences.autoInvoice ?? true);
        setEmailAlerts(userProfile.adminPreferences.emailAlerts ?? true);
        setAuditLogs(userProfile.adminPreferences.auditLogs ?? true);
        setTimezone(userProfile.adminPreferences.timezone || 'UTC-5 (Eastern Time)');
      }
    } else if (currentUser) {
      setDisplayName(currentUser.displayName || 'Joshua Egesi');
      setPhotoURL(currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
    }
  }, [userProfile?.id, userProfile?.updatedAt, currentUser?.uid]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      const updates: Partial<UserProfile> = {
        displayName: (displayName || '').trim(),
        title: (title || '').trim(),
        companyName: (companyName || '').trim(),
        phone: (phone || '').trim(),
        photoURL: (photoURL || '').trim(),
        avatarUrl: (photoURL || '').trim(),
        adminPreferences: {
          currency,
          lowStockThreshold: Number(lowStockThreshold),
          autoInvoice,
          emailAlerts,
          auditLogs,
          timezone
        }
      };

      await updateProfileData(updates);
      setIsSaving(false);
      setIsSavedRecently(true);
      showToast('Admin profile credentials & platform defaults updated!', 'success');
      setTimeout(() => setIsSavedRecently(false), 4000);
    } catch (err: any) {
      console.error('Failed to update admin profile:', err);
      setIsSaving(false);
      showToast(err?.message || 'Failed to save admin settings.', 'error');
    }
  };

  const handleSelectPhoto = async (newPhotoUrl: string) => {
    setPhotoURL(newPhotoUrl);
    setIsPhotoModalOpen(false);
    try {
      await updateProfileData({ photoURL: newPhotoUrl, avatarUrl: newPhotoUrl });
      showToast('Executive avatar updated and synced across all devices!', 'success');
    } catch (err) {
      console.warn('Auto-sync avatar warning:', err);
    }
  };

  const handleSendPasswordReset = () => {
    showToast(`Administrative password reset dispatched to ${currentUser?.email || 'registered admin email'}.`, 'success');
  };

  if (authLoading && !userProfile) {
    return <ProfileDashboardSkeleton />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      
      {/* 1. Admin Identity & Operations Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-gradient-to-r dark:from-[#1c140e] dark:via-[#161311] dark:to-[#0f0e0d] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl border border-amber-500/20 dark:border-[#F27D26]/20">
        
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F27D26]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Avatar & Admin Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 text-center sm:text-left">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden ring-4 ring-[#F27D26] shadow-xl bg-slate-100 dark:bg-white/10 shrink-0">
                {photoURL ? (
                  <img 
                    src={photoURL} 
                    alt={displayName || 'Administrator Profile'} 
                    className="w-full h-full object-cover"
                    onError={() => setPhotoURL('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80')}
                  />
                ) : (
                  <div className="w-full h-full bg-[#F27D26] text-black font-extrabold text-3xl flex items-center justify-center">
                    {displayName?.charAt(0).toUpperCase() || 'A'}
                  </div>
                )}
              </div>
              
              {/* Photo Change Trigger */}
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute -bottom-2 -right-2 p-2 bg-[#F27D26] hover:bg-[#e06d1a] text-black rounded-2xl shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                title="Update Admin Avatar"
                aria-label="Update Admin Avatar"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="bg-[#F27D26] text-black text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" /> Root Platform Administrator
                </span>
                <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Full Super Admin Clearance
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-950 dark:text-white">
                {displayName || 'Joshua Egesi'}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 dark:text-zinc-400">
                <span className="text-[#F27D26] font-bold">
                  {title || 'Executive Managing Director'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-900 dark:text-zinc-200 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> {companyName || 'Eagle Excel Headquarters'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-slate-500 dark:text-zinc-400">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentUser?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Admin Privileges Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 text-center shrink-0">
            <div className="bg-slate-50 dark:bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Access Level</div>
              <div className="text-xs sm:text-sm font-black text-[#F27D26] mt-1 uppercase">
                Tier 0 Superuser
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Security Guard</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Encrypted
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 col-span-2 sm:col-span-1">
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Console Status</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1">
                Live & Operational
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click Operations Jump Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => onNavigate('admin')}
              className="px-3.5 py-1.5 rounded-xl bg-[#F27D26] text-black font-extrabold flex items-center gap-1.5 hover:bg-[#e06d1a] transition-all shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Open Full Admin Management Console
            </button>
            <button
              onClick={() => onNavigate('catalog')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" /> View Live Wholesale Catalog
            </button>
          </div>

          <button
            onClick={() => logout()}
            className="px-3.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* 2. Admin Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-2 sm:gap-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('identity')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'identity'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Administrator Credentials & Identity
        </button>

        <button
          onClick={() => setActiveTab('operations')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'operations'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" /> Platform Operations & Defaults
        </button>

        <button
          onClick={() => setActiveTab('hub')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'hub'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" /> Administrative Quick Hub
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" /> Security & Privileges
        </button>
      </div>

      {/* 3. Form Content */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Tab 1: Administrator Credentials & Identity */}
        {activeTab === 'identity' && (
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#F27D26]" /> Executive Administrator Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Your administrative signature attached to platform audits, order approvals, and official customer support messages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Administrator Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Joshua Egesi"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Official Executive Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Executive Managing Director"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Headquarters / Org */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Organization / Headquarters Branch <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Eagle Excel Global Operations HQ"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Direct Phone / Hotline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Admin Hotline & Emergency Contact <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (800) 555-EAGLE"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Official Email */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Root Administrator Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || 'joshuaegesienyinnaya@gmail.com'}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-zinc-400 font-mono cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-[#F27D26] font-extrabold bg-[#F27D26]/10 px-2 py-0.5 rounded-full border border-[#F27D26]/30">
                    Primary Owner
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Platform Operations & Defaults */}
        {activeTab === 'operations' && (
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#F27D26]" /> Wholesale Platform Operational Defaults
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Configure global defaults for currency rendering, inventory depletion thresholds, and system dispatch triggers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Currency Display */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Primary Catalog Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                >
                  <option value="USD ($)">USD ($) - United States Dollar</option>
                  <option value="EUR (€)">EUR (€) - Eurozone</option>
                  <option value="GBP (£)">GBP (£) - British Pound</option>
                  <option value="CAD ($)">CAD ($) - Canadian Dollar</option>
                  <option value="NGN (₦)">NGN (₦) - Nigerian Naira</option>
                </select>
              </div>

              {/* Low Stock Warning Threshold */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Low-Stock Inventory Warning Threshold (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-1">
                  SKUs falling below this quantity trigger red alerts in Admin Console.
                </span>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Administrative Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                >
                  <option value="UTC-5 (Eastern Time)">UTC-5 (Eastern Time - US/Canada)</option>
                  <option value="UTC+0 (GMT / London)">UTC+0 (GMT / London)</option>
                  <option value="UTC+1 (WAT / Lagos / Paris)">UTC+1 (WAT / Lagos / Paris)</option>
                  <option value="UTC-8 (Pacific Time)">UTC-8 (Pacific Time - US/Canada)</option>
                  <option value="UTC+8 (Singapore / Beijing)">UTC+8 (Singapore / Beijing)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Automatic Invoice Dispatch on Order Placement</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Generate and email downloadable PDF invoices automatically when buyers check out</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoInvoice}
                  onChange={(e) => setAutoInvoice(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Admin Push Alerts on High-Volume Orders</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Receive priority alerts when a single order exceeds container threshold</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Real-time Administrative Audit Logs</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Log all SKU updates, status changes, and stock modifications in database</div>
                </div>
                <input
                  type="checkbox"
                  checked={auditLogs}
                  onChange={(e) => setAuditLogs(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Administrative Quick Hub */}
        {activeTab === 'hub' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#F27D26]" /> Executive Control Center & Quick Hub
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Immediate shortcuts to all administrative sub-systems and live catalog controls.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-[#F27D26]/10 border border-slate-200 dark:border-white/10 hover:border-[#F27D26]/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#F27D26]/20 text-[#F27D26] flex items-center justify-center font-bold">
                      <Package className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#F27D26] transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3">Inventory & SKU Catalog Manager</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Add new products, adjust wholesale bulk tiers, modify specs, and manage images.</p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-[#F27D26]/10 border border-slate-200 dark:border-white/10 hover:border-[#F27D26]/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3">Purchase Orders & Freight Logistics</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Review pending orders, assign tracking numbers, update freight milestones, and issue invoices.</p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-[#F27D26]/10 border border-slate-200 dark:border-white/10 hover:border-[#F27D26]/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3">Customer Support & Live Inquiries</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Reply to wholesale buyer price inquiries and RFQ quote requests in real-time.</p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-[#F27D26]/10 border border-slate-200 dark:border-white/10 hover:border-[#F27D26]/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3">Customer Directory & Role Permissions</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Inspect registered enterprise buyers and promote accounts to admin privileges.</p>
                </button>
              </div>
            </div>

            {/* Role Simulation Widget */}
            <div className="bg-slate-100 dark:bg-[#161616] rounded-3xl p-6 border border-slate-200 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F27D26]" /> Live Role Simulator for UI Testing
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Switch between Administrator and Customer preview mode to test user experiences.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#F27D26] uppercase">
                  Current View: {role}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedRole('admin');
                    showToast('Switched to Administrator Mode', 'info');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    role === 'admin'
                      ? 'bg-[#F27D26] text-black shadow-md'
                      : 'bg-white dark:bg-white/5 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
                  }`}
                >
                  🛡️ Administrator Mode
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimulatedRole('customer');
                    showToast('Switched to Customer Simulation Mode', 'info');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    role === 'customer'
                      ? 'bg-[#F27D26] text-black shadow-md'
                      : 'bg-white dark:bg-white/5 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
                  }`}
                >
                  🏢 Wholesale Customer Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Privileges */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-[#F27D26]" /> Administrative Security & Access Safeguards
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Root credential controls and elevated session management.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Admin Master Password Reset</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Send a password reset email to verify identity and update login credentials for {currentUser?.email}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold transition-colors shrink-0"
              >
                Send Admin Reset Email
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Database Row-Level Security Status</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Supabase RLS & Role Policies Active & Enforcing Permissions
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('docs')}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold transition-colors shrink-0"
              >
                View Rules Documentation
              </button>
            </div>
          </div>
        )}

        {/* Bottom Sticky Actions Toolbar */}
        <div className="sticky bottom-4 z-20 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            {isSavedRecently ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Admin preferences saved successfully
              </span>
            ) : (
              <span>Modifications sync directly with database upon saving.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-colors"
            >
              Back to Admin Console
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Admin Settings...' : 'Save Admin Settings'}
            </button>
          </div>
        </div>
      </form>

      {/* Profile Picture / Avatar Selector Modal with Gallery Upload */}
      <ProfilePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentPhotoURL={photoURL}
        onSelectPhoto={handleSelectPhoto}
        userType="admin"
        title="Choose Admin Profile Picture"
        subtitle="Upload an executive photo from your gallery or choose a preset"
      />

    </div>
  );
};
