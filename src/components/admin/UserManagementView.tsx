import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Plus, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  ShoppingCart, 
  Megaphone, 
  Calendar, 
  X, 
  Check, 
  Database,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Filter,
  UserCheck,
  ArrowUpDown,
  FileText,
  Activity,
  Trash2,
  Eye
} from 'lucide-react';
import { UserProfile, UserRole, Order, Message } from '../../types';
import { StaffGuidanceBanner } from './StaffGuidanceBanner';
import { CustomerActivityDossierModal } from './CustomerActivityDossierModal';
import { SupabaseRBACSetupModal } from './SupabaseRBACSetupModal';
import { createManualUser, getAllUsers, deleteUserAccount } from '../../services/userService';
import { isSupabaseEnabled, getActiveSupabaseConfig } from '../../lib/supabase';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../Toast';

interface UserManagementViewProps {
  users: UserProfile[];
  orders?: Order[];
  messages?: Message[];
  currentUser?: any;
  onRefreshUsers: () => Promise<void>;
  onToggleUserRole: (user: UserProfile) => void;
  onDirectBroadcast: (userId: string) => void;
  onOpenStaffManual: () => void;
  onViewOrder?: (order: Order) => void;
  onOpenChat?: (customerId: string) => void;
  onDeleteUser?: (userId: string, userName: string) => Promise<void>;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  orders = [],
  messages = [],
  currentUser,
  onRefreshUsers,
  onToggleUserRole,
  onDirectBroadcast,
  onOpenStaffManual,
  onViewOrder = (_order: Order) => {},
  onOpenChat = (_customerId: string) => {},
  onDeleteUser
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'spent' | 'orders' | 'name'>('newest');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  
  // Selected user for comprehensive Activity Dossier
  const [selectedUserDossier, setSelectedUserDossier] = useState<UserProfile | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Table row direct deletion dialog state
  const [userToDeleteFromTable, setUserToDeleteFromTable] = useState<UserProfile | null>(null);
  const [isDeletingFromTable, setIsDeletingFromTable] = useState(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('customer');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('Nigeria');

  const supabaseConfig = getActiveSupabaseConfig();
  const isConnected = isSupabaseEnabled();

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onRefreshUsers();
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast(`Successfully synced ${users.length} user accounts from Supabase database & orders.`);
    } catch (e: any) {
      showToast(e?.message || 'Sync completed with local cache.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newEmail || '').trim() || !(newName || '').trim()) {
      showToast('Please enter both full name and email address.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const created = await createManualUser({
        email: (newEmail || '').trim(),
        displayName: (newName || '').trim(),
        companyName: (newCompany || '').trim() || undefined,
        role: newRole,
        phone: (newPhone || '').trim() || undefined,
        city: (newCity || '').trim() || undefined,
        country: (newCountry || '').trim() || undefined,
      });

      showToast(`Account registered for ${created.displayName}! Saved to Supabase and cache.`);
      setIsAddUserModalOpen(false);
      // Reset form
      setNewEmail('');
      setNewName('');
      setNewCompany('');
      setNewRole('customer');
      setNewPhone('');
      setNewCity('');
      await onRefreshUsers();
    } catch (err: any) {
      showToast(err?.message || 'Failed to register account.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUserAction = async (userId: string, userName: string) => {
    if (currentUser?.uid === userId || currentUser?.id === userId) {
      showToast('You cannot delete your own active administrator account.');
      return;
    }

    try {
      if (onDeleteUser) {
        await onDeleteUser(userId, userName);
      } else {
        await deleteUserAccount(userId);
        showToast(`Account for ${userName} has been permanently deleted.`);
        await onRefreshUsers();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete account.');
      throw err;
    }
  };

  const confirmTableDelete = async () => {
    if (!userToDeleteFromTable) return;
    setIsDeletingFromTable(true);
    try {
      await handleDeleteUserAction(userToDeleteFromTable.id, userToDeleteFromTable.displayName || userToDeleteFromTable.email);
      setUserToDeleteFromTable(null);
    } finally {
      setIsDeletingFromTable(false);
    }
  };

  // Filter and Sort Users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.companyName || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q);

    const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'spent') {
      return (b.totalSpent || 0) - (a.totalSpent || 0);
    }
    if (sortBy === 'orders') {
      return (b.ordersCount || 0) - (a.ordersCount || 0);
    }
    if (sortBy === 'name') {
      return (a.displayName || '').localeCompare(b.displayName || '');
    }
    return 0;
  });

  const totalSpentAcrossBuyers = users.reduce((sum, u) => sum + (u.totalSpent || 0), 0);
  const wholesaleBuyersCount = users.filter(u => u.role === 'customer').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-4">
      {/* SOP Guidance Banner */}
      <StaffGuidanceBanner
        title="Customer Accounts & Role-Based Access Control (RBAC) SOP"
        description="Click on any customer to inspect their full purchase history, live chat transcripts, support inquiries, and corporate profile. Manage staff privileges or delete inactive records directly."
        onOpenManual={onOpenStaffManual}
        storageKey="customers_view"
        tips={[
          "Customer Activity Dossier: Click on any row to open the unified customer timeline, inspecting every purchase order and live support chat in one place.",
          "Instant Supabase Sync: Click 'Sync with Supabase' anytime a buyer reports registering to instantly pull their latest authentication profile and order history.",
          "Role-Based Access: 'Admin' provides full backend console authority (inventory, pricing, dispatches). 'Customer' restricts view strictly to wholesale storefront.",
          "Direct Company Broadcasts: Launch customized container arrival or price alert push notifications directly to specific buyer accounts."
        ]}
      />

      {/* Database Connection & Sync Status Deck */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-zinc-100">Supabase User Database & Auth Synchronization</h4>
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {isConnected ? 'Live Connected' : 'Local Standalone'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Listening to <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded font-mono text-[11px]">public.profiles</code>, <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded font-mono text-[11px]">public.users</code> & Realtime broadcast channel. Last synced: <span className="text-zinc-200 font-semibold">{lastSyncTime}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setIsRbacModalOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold text-xs transition-all flex items-center gap-1.5 border border-purple-500/30 cursor-pointer shadow-xs"
            title="View step-by-step SQL script and configure Supabase RBAC set_user_role function"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Supabase RBAC & SQL Guide</span>
          </button>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
            title="Scan Supabase profiles, users, orders, and messages to refresh all accounts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#F27D26]' : ''}`} />
            <span>{isSyncing ? 'Scanning Database...' : 'Sync with Supabase'}</span>
          </button>

          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-linear-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black font-extrabold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Buyer / Staff</span>
          </button>
        </div>
      </div>

      {/* Top Statistical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Total Registered</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-zinc-100 mt-1">{users.length}</div>
          <span className="text-[11px] text-slate-400">Across all roles</span>
        </div>

        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Wholesale Buyers</span>
            <Building2 className="w-4 h-4 text-[#F27D26]" />
          </div>
          <div className="text-xl font-bold text-[#F27D26] mt-1">{wholesaleBuyersCount}</div>
          <span className="text-[11px] text-slate-400">Verified corporate buyers</span>
        </div>

        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Console Admins</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-500 mt-1">{adminCount}</div>
          <span className="text-[11px] text-slate-400">Staff with backend access</span>
        </div>

        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Total Buyer Spend</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
            ${totalSpentAcrossBuyers.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-400">Aggregated order volume</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, email, company, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#F27D26]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Role Filters */}
          <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setRoleFilter('all')}
              className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                roleFilter === 'all' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('customer')}
              className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                roleFilter === 'customer' ? 'bg-white dark:bg-zinc-800 text-[#F27D26] shadow-xs font-bold' : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              Buyers ({wholesaleBuyersCount})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                roleFilter === 'admin' ? 'bg-white dark:bg-zinc-800 text-emerald-500 shadow-xs font-bold' : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              Admins ({adminCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-xl text-xs text-slate-600 dark:text-zinc-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-white dark:bg-zinc-900">Newest Registered</option>
              <option value="spent" className="bg-white dark:bg-zinc-900">Highest Spend</option>
              <option value="orders" className="bg-white dark:bg-zinc-900">Most Orders</option>
              <option value="name" className="bg-white dark:bg-zinc-900">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-white/5">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Wholesale Buyer Directory & RBAC Matrix</h3>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              Click any customer to open their complete activity dossier, order history, and account settings
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDirectBroadcast('ALL')}
              className="py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#F27D26] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast to All</span>
            </button>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">No user accounts found</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
              {searchQuery ? `No accounts matched "${searchQuery}". Try clearing search filter.` : 'Click "Sync with Supabase" to scan your Supabase database or add a new buyer manually.'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold"
                >
                  Clear Search
                </button>
              )}
              <button
                onClick={handleManualSync}
                className="py-1.5 px-3 rounded-lg bg-[#F27D26] text-black font-bold text-xs cursor-pointer"
              >
                Scan Supabase
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-white/5">
                <tr>
                  <th className="p-3.5">Account & User</th>
                  <th className="p-3.5">Company & Contact</th>
                  <th className="p-3.5">Account Role</th>
                  <th className="p-3.5">Trade Volume</th>
                  <th className="p-3.5">Registered</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredUsers.map(u => {
                  const isCurrentAdmin = Boolean(currentUser && (currentUser.uid === u.id || currentUser.id === u.id));
                  return (
                    <tr 
                      key={u.id} 
                      onClick={() => setSelectedUserDossier(u)}
                      className="hover:bg-amber-500/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={u.avatarUrl || u.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'}
                              alt={u.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/10 group-hover:border-[#F27D26]/50 transition-colors"
                              referrerPolicy="no-referrer"
                            />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#161616] ${
                              u.role === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 group-hover:text-[#F27D26] transition-colors">
                              <span>{u.displayName}</span>
                              {u.role === 'admin' && (
                                <span title="Console Administrator">
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 dark:text-zinc-200">{u.companyName || 'Wholesale Buyer'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{u.city ? `${u.city}, ${u.country || 'Nigeria'}` : (u.country || 'West Africa Region')}</span>
                          {u.phone && (
                            <>
                              <span className="text-slate-300 dark:text-zinc-600">•</span>
                              <span>{u.phone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin' 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                        }`}>
                          {u.role === 'admin' ? '🛡️ Administrator' : '🏢 Buyer Account'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-zinc-100">
                          ${(u.totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                          {u.ordersCount || 0} purchase order{(u.ordersCount || 0) === 1 ? '' : 's'}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-500 dark:text-zinc-400">
                        {new Date(u.createdAt || Date.now()).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>

                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUserDossier(u)}
                            className="py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-[#F27D26]/10 hover:text-[#F27D26] border border-slate-200 dark:border-white/10 font-bold text-xs transition-colors text-slate-700 dark:text-zinc-200 flex items-center gap-1 cursor-pointer"
                            title="Inspect complete activity timeline, PO history, and communications"
                          >
                            <Activity className="w-3 h-3 text-[#F27D26]" />
                            <span>Activity</span>
                          </button>

                          {u.role === 'customer' && (
                            <button
                              onClick={() => onDirectBroadcast(u.id)}
                              className="py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#F27D26] font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Send direct broadcast alert to this customer"
                            >
                              <Megaphone className="w-3 h-3" />
                              <span className="hidden sm:inline">Alert</span>
                            </button>
                          )}

                          <button
                            onClick={() => onToggleUserRole(u)}
                            disabled={isCurrentAdmin}
                            className="py-1 px-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 font-semibold text-xs transition-colors text-slate-700 dark:text-zinc-200 cursor-pointer disabled:opacity-40"
                            title={isCurrentAdmin ? 'Cannot alter own active admin account' : `Switch permissions to ${u.role === 'admin' ? 'Customer' : 'Admin'}`}
                          >
                            {u.role === 'admin' ? 'To Buyer' : 'To Admin'}
                          </button>

                          {/* Quick Delete Row Action */}
                          <button
                            onClick={() => setUserToDeleteFromTable(u)}
                            disabled={isCurrentAdmin}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isCurrentAdmin 
                                ? 'border-transparent text-slate-300 dark:text-zinc-700 cursor-not-allowed'
                                : 'border-transparent hover:border-rose-500/30 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10'
                            }`}
                            title={isCurrentAdmin ? 'You cannot delete your own account' : 'Delete user account permanently'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD BUYER / STAFF ACCOUNT */}
      {isAddUserModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          data-portal-modal="true"
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddUserModalOpen(false); }}
        >
          <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-lg w-full overflow-hidden flex flex-col animate-scaleUp">
            <div className="p-5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Register Corporate Wholesale Account</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Directly provision user account to Supabase and cache</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Full Representative Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Aliko Dangote or Amara Okafor"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="buyer@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Company / Enterprise</label>
                  <input
                    type="text"
                    placeholder="e.g., Lagos Electronics Ltd"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Account Role</label>
                  <select
                    value={newRole}
                    onChange={(e: any) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#F27D26]"
                  >
                    <option value="customer">🏢 Wholesale Buyer</option>
                    <option value="admin">🛡️ Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+234 800 000 0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">City / Region</label>
                  <input
                    type="text"
                    placeholder="Lagos, Douala, etc."
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
                ℹ️ <strong>System Note:</strong> Creating this user profile records their account in <code className="font-mono">public.profiles</code> and broadcasts it to all open admin dashboards in real time.
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="py-2 px-5 rounded-xl bg-linear-to-r from-amber-500 to-[#F27D26] hover:opacity-95 text-black font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isCreatingUser ? 'Registering Account...' : 'Save to Supabase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: RICH CUSTOMER ACTIVITY DOSSIER & PROFILE MODAL */}
      {selectedUserDossier && (
        <CustomerActivityDossierModal
          user={selectedUserDossier}
          orders={orders}
          messages={messages}
          currentUserId={currentUser?.uid || currentUser?.id}
          onClose={() => setSelectedUserDossier(null)}
          onToggleRole={async (user) => {
            onToggleUserRole(user);
            // Optimistically update the selected user modal state
            setSelectedUserDossier(prev => prev ? { ...prev, role: prev.role === 'admin' ? 'customer' : 'admin' } : null);
          }}
          onDirectBroadcast={(userId) => {
            onDirectBroadcast(userId);
            setSelectedUserDossier(null);
          }}
          onOpenChat={(customerId) => {
            onOpenChat(customerId);
            setSelectedUserDossier(null);
          }}
          onViewOrder={(order) => {
            onViewOrder(order);
            setSelectedUserDossier(null);
          }}
          onDeleteUser={handleDeleteUserAction}
        />
      )}

      {/* CONFIRM DELETE DIALOG FROM TABLE ROW */}
      {userToDeleteFromTable && (
        <ConfirmDialog
          isOpen={Boolean(userToDeleteFromTable)}
          onClose={() => setUserToDeleteFromTable(null)}
          onConfirm={confirmTableDelete}
          title="Delete Customer Account"
          message={
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to permanently delete the account for{' '}
                <strong className="text-slate-900 dark:text-white font-bold">
                  {userToDeleteFromTable.displayName || userToDeleteFromTable.email}
                </strong>?
              </p>
              <p className="text-slate-500 dark:text-zinc-400">
                This will delete their user profile from <code className="font-mono text-amber-500">public.profiles</code> and Supabase authentication. Historical order transaction records are maintained for audit integrity.
              </p>
            </div>
          }
          confirmText="Yes, Delete Account"
          cancelText="Cancel"
          variant="danger"
          isLoading={isDeletingFromTable}
          icon="trash"
          id="table-delete-user-confirm-dialog"
        />
      )}
      {/* SUPABASE RBAC & SQL PERMISSIONS SETUP MODAL */}
      <SupabaseRBACSetupModal
        isOpen={isRbacModalOpen}
        onClose={() => setIsRbacModalOpen(false)}
      />
    </div>
  );
};
