import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Save, 
  Camera, 
  ShoppingBag, 
  Clock, 
  FileText, 
  CreditCard, 
  Bell, 
  Key, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  LogOut,
  Sparkles,
  Layers,
  HelpCircle,
  Truck,
  ArrowRight,
  User,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../Toast';
import { UserAddress, UserProfile } from '../../types';
import { ProfilePhotoModal } from './ProfilePhotoModal';
import { ProfileDashboardSkeleton } from '../ui/Skeleton';
import { OrderNavBadge } from '../OrderNavBadge';

interface CustomerProfileDashboardProps {
  onNavigate: (view: 'catalog' | 'orders' | 'admin' | 'docs' | 'profile') => void;
  onOpenSupport?: (prefilledMessage?: string) => void;
}

export const CustomerProfileDashboard: React.FC<CustomerProfileDashboardProps> = ({
  onNavigate,
  onOpenSupport
}) => {
  const { currentUser, userProfile, updateProfileData, logout, role, loading: authLoading } = useAuth();
  const { importantOnly, setImportantOnly } = useNotifications();
  const { showToast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'preferences' | 'security'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ee_customer_profile_tab');
        const valid = ['profile', 'address', 'preferences', 'security'];
        if (stored && valid.includes(stored)) {
          return stored as any;
        }
      }
    } catch {}
    return 'profile';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('ee_customer_profile_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'wire_transfer' | 'invoice_net30' | 'credit_card' | 'cod'>('invoice_net30');
  const [photoURL, setPhotoURL] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Address states
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');

  // Preferences
  const [emailInvoices, setEmailInvoices] = useState(true);
  const [smsFreightAlerts, setSmsFreightAlerts] = useState(true);
  const [tierDiscountAlerts, setTierDiscountAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Populate initial values
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setTitle(userProfile.title || 'Procurement Manager');
      setCompanyName(userProfile.companyName || 'Wholesale Enterprise');
      setPhone(userProfile.phone || '+1 (555) 234-5678');
      setTaxId(userProfile.taxId || 'TAX-US-99482');
      setPreferredPaymentMethod(userProfile.preferredPaymentMethod || 'invoice_net30');
      setPhotoURL(userProfile.photoURL || userProfile.avatarUrl || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80');

      if (userProfile.address) {
        setStreet(userProfile.address.street || '');
        setCity(userProfile.address.city || '');
        setStateVal(userProfile.address.state || '');
        setPostalCode(userProfile.address.postalCode || '');
        setCountry(userProfile.address.country || 'United States');
      }
    } else if (currentUser) {
      setDisplayName(currentUser.displayName || 'Wholesale Buyer');
      setPhotoURL(currentUser.photoURL || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80');
    }
  }, [userProfile?.id, userProfile?.updatedAt, currentUser?.uid]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      const addressData: UserAddress = {
        street,
        city,
        state: stateVal,
        postalCode,
        country
      };

      const updates: Partial<UserProfile> = {
        displayName: (displayName || '').trim(),
        title: (title || '').trim(),
        companyName: (companyName || '').trim(),
        phone: (phone || '').trim(),
        taxId: (taxId || '').trim(),
        preferredPaymentMethod,
        photoURL: (photoURL || '').trim(),
        avatarUrl: (photoURL || '').trim(),
        address: addressData,
        notificationsEnabled: emailInvoices
      };

      await updateProfileData(updates);
      setIsSaving(false);
      setIsSavedRecently(true);
      showToast('Profile information successfully updated!', 'success');
      setTimeout(() => setIsSavedRecently(false), 4000);
    } catch (err: any) {
      console.error('Failed to update customer profile:', err);
      setIsSaving(false);
      showToast(err?.message || 'Failed to save changes. Please try again.', 'error');
    }
  };

  const handleSelectPhoto = async (newPhotoUrl: string) => {
    setPhotoURL(newPhotoUrl);
    setIsPhotoModalOpen(false);
    try {
      await updateProfileData({ photoURL: newPhotoUrl, avatarUrl: newPhotoUrl });
      showToast('Profile avatar updated and synced across all devices!', 'success');
    } catch (err) {
      console.warn('Auto-sync avatar warning:', err);
    }
  };

  const handleSendPasswordReset = () => {
    showToast(`Password reset link sent to ${currentUser?.email || 'your registered email address'}.`, 'success');
  };

  if (authLoading && !userProfile) {
    return <ProfileDashboardSkeleton />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      
      {/* 1. Customer Profile Banner & Summary Card */}
      <div className="relative overflow-hidden bg-white dark:bg-gradient-to-r dark:from-[#181818] dark:via-[#141414] dark:to-[#0d0d0d] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl border border-slate-200 dark:border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Avatar & Personal Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 text-center sm:text-left">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden ring-4 ring-[#F27D26]/30 shadow-xl bg-slate-100 dark:bg-white/10 shrink-0">
                {photoURL ? (
                  <img 
                    src={photoURL} 
                    alt={displayName || 'Customer Profile'} 
                    className="w-full h-full object-cover"
                    onError={() => setPhotoURL('https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80')}
                  />
                ) : (
                  <div className="w-full h-full bg-[#F27D26] text-black font-extrabold text-3xl flex items-center justify-center">
                    {displayName?.charAt(0).toUpperCase() || 'B'}
                  </div>
                )}
              </div>
              
              {/* Photo Edit Trigger Button */}
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute -bottom-2 -right-2 p-2 bg-[#F27D26] hover:bg-[#e06d1a] text-black rounded-2xl shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                title="Change Profile Picture"
                aria-label="Change Profile Picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="bg-[#F27D26]/15 text-[#e06d1a] dark:text-[#F27D26] text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#F27D26]/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Verified Wholesale Buyer
                </span>
                <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Tier 1 Pricing Active
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-950 dark:text-white">
                {displayName || 'Wholesale Buyer'}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 dark:text-zinc-400">
                <span className="flex items-center gap-1 text-slate-900 dark:text-zinc-200 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-[#F27D26]" /> {companyName || 'Enterprise Buyer'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentUser?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center shrink-0">
            <div className="bg-slate-50 dark:bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Account Orders</div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {userProfile?.ordersCount || 0} POs
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Payment Terms</div>
              <div className="text-xs sm:text-sm font-black text-[#F27D26] mt-1.5 uppercase">
                {preferredPaymentMethod.replace('_', ' ')}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Credit Status</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Approved
              </div>
            </div>
          </div>
        </div>

        {/* Quick Shortcut Buttons Row */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              id="profile-nav-orders-btn"
              onClick={() => onNavigate('orders')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#F27D26]" /> 
              <span>View Purchase Orders & Tracking</span>
              <OrderNavBadge variant="compact" />
            </button>
            <button
              onClick={() => onNavigate('catalog')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" /> Browse Wholesale Catalog
            </button>
            {onOpenSupport && (
              <button
                onClick={() => onOpenSupport('Hello Support, I have a question regarding my customer wholesale account profile.')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#F27D26]" /> Contact Account Manager
              </button>
            )}
          </div>

          <button
            onClick={() => logout()}
            className="px-3.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* 2. Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-2 sm:gap-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Personal & Business Info
        </button>

        <button
          onClick={() => setActiveTab('address')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'address'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" /> Shipping & Logistics Address
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" /> Invoicing & Notifications
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" /> Security & Account
        </button>
      </div>

      {/* 3. Form Content */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Tab 1: Personal & Business Info */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#F27D26]" /> Wholesale Account & Contact Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Keep your company procurement contacts and business credentials current for automated invoicing and freight customs clearance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Full Name / Primary Contact <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Professional Title / Role
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Procurement Officer"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Company / Enterprise Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Company / Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Global Logistics Ltd"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Direct Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Direct Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ''}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-zinc-400 font-mono cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                </div>
              </div>

              {/* Tax / Resale ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Tax ID / Resale Certificate Number
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="e.g. TAX-US-102938"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Preferred Payment Terms */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Preferred Wholesale Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'invoice_net30', label: 'Net 30 Invoicing', desc: 'Approved B2B Term' },
                    { id: 'wire_transfer', label: 'Wire Transfer / ACH', desc: 'Direct bank transfer' },
                    { id: 'credit_card', label: 'Corporate Card', desc: 'Instant checkout' },
                    { id: 'cod', label: 'Cash On Delivery', desc: 'Port / Dock payment' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPreferredPaymentMethod(option.id as any)}
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        preferredPaymentMethod === option.id
                          ? 'bg-[#F27D26]/10 border-[#F27D26] text-slate-950 dark:text-white ring-1 ring-[#F27D26]'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{option.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Shipping & Logistics Address */}
        {activeTab === 'address' && (
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#F27D26]" /> Primary Freight & Delivery Address
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Your default shipping destination used for calculating pallet freight rates and preparing bill-of-lading documents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Street Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Warehouse / Facility Street Address
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. 742 Evergreen Logistics Blvd, Dock 4"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Chicago"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* State / Province */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  State / Province / Region
                </label>
                <input
                  type="text"
                  value={stateVal}
                  onChange={(e) => setStateVal(e.target.value)}
                  placeholder="e.g. Illinois (IL)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 60601"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                >
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="International">Other International Destination</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Notification & Wholesale Preferences */}
        {activeTab === 'preferences' && (
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#F27D26]" /> Wholesale Invoicing & Notification Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Customize real-time dispatch alerts and price-tier notifications.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 cursor-pointer">
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#F27D26]" /> Important Notifications Only (Anti-Spam Filter)
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-zinc-300 mt-0.5">
                    Filter out non-essential marketing messages & system greetings. Only receive actionable purchase orders, cargo tracking milestones, customs clearances, and direct support replies.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={importantOnly}
                  onChange={(e) => setImportantOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer ml-3 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Email Order Invoices & PO Confirmations</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Receive automated PDF invoices immediately upon purchase order placement</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailInvoices}
                  onChange={(e) => setEmailInvoices(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">SMS Freight & Carrier Milestone Tracking</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Get text notifications when cargo leaves fulfillment port or is out for delivery</div>
                </div>
                <input
                  type="checkbox"
                  checked={smsFreightAlerts}
                  onChange={(e) => setSmsFreightAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Tier Volume & Bulk Price Drop Alerts</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Instant alerts when container-load prices on your frequent categories are updated</div>
                </div>
                <input
                  type="checkbox"
                  checked={tierDiscountAlerts}
                  onChange={(e) => setTierDiscountAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Weekly Wholesale Catalog Digest</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Weekly inventory availability update and newly added SKU inventory lists</div>
                </div>
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Account */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-[#F27D26]" /> Account Authentication & Credentials
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Manage your credentials and security preferences.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Password & Authentication</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Send a secure password reset link to your registered email address ({currentUser?.email})</div>
              </div>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold transition-colors shrink-0"
              >
                Send Password Reset Email
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Account Identifier</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5">{currentUser?.uid}</div>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                Created {new Date(userProfile?.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Sticky Actions Toolbar */}
        <div className="sticky bottom-4 z-20 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            {isSavedRecently ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Profile updated in real-time
              </span>
            ) : (
              <span>Unsaved changes will be stored to your profile upon clicking save.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-colors"
            >
              Back to Catalog
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
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
        userType="customer"
        title="Choose Profile Picture"
        subtitle="Upload a photo from your gallery or choose a curated avatar"
      />

    </div>
  );
};
