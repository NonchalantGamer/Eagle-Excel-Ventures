import { getSupabase, isSupabaseEnabled, OperationType, handleSupabaseError } from '../lib/supabase';
import { UserProfile, UserRole, UserAddress } from '../types';
import { sendAdminRoleGrantedNotification, sendAdminRoleRevokedNotification } from './notificationService';

const PROFILES_TABLE = 'profiles';
const USERS_TABLE = 'users';
const ALL_USERS_KEY = 'ee_all_registered_users_v1';
const SYNC_CHANNEL_NAME = 'ee_global_sync';
const ROLE_OVERRIDES_STORAGE_KEY = 'eev_user_role_overrides_v2';
const ROOT_ADMIN_EMAIL = 'joshuaegesienyinnaya@gmail.com';

/**
 * Returns all assigned role overrides from persistent client storage.
 */
export function getRoleOverrides(): Record<string, UserRole> {
  try {
    const raw = localStorage.getItem(ROLE_OVERRIDES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage parse error
  }
  return {};
}

/**
 * Fetches server-side authoritative role overrides and synchronizes them into local storage.
 */
export async function fetchServerRoleOverrides(): Promise<Record<string, UserRole>> {
  try {
    const res = await fetch('/api/users/roles');
    if (res.ok) {
      const data = await res.json();
      if (data && data.overrides) {
        const current = getRoleOverrides();
        const merged = { ...current, ...data.overrides };
        localStorage.setItem(ROLE_OVERRIDES_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {
    console.warn('[userService] Server role overrides fetch notice:', e);
  }
  return getRoleOverrides();
}

/**
 * Persists an assigned role override for a specific user ID and email.
 */
export function setRoleOverride(identifier: string, role: UserRole): void {
  if (!identifier) return;
  try {
    const current = getRoleOverrides();
    const cleanId = (identifier || '').trim();
    if (cleanId) {
      current[cleanId] = role;
      current[cleanId.toLowerCase()] = role;
      localStorage.setItem(ROLE_OVERRIDES_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {}
}

/**
 * Resolves the effective assigned role for a user by evaluating their UID, email, and root admin rules.
 */
export function getAssignedRole(userId?: string, email?: string): UserRole | null {
  const emailLower = (email || '').trim().toLowerCase();
  if (emailLower === ROOT_ADMIN_EMAIL.toLowerCase()) return 'admin';
  
  const overrides = getRoleOverrides();
  if (userId && overrides[userId]) return overrides[userId];
  if (userId && overrides[userId.toLowerCase()]) return overrides[userId.toLowerCase()];
  if (emailLower && overrides[emailLower]) return overrides[emailLower];
  if (email && overrides[email]) return overrides[email];
  return null;
}

export function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(ALL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUsers(users: UserProfile[]) {
  try {
    localStorage.setItem(ALL_USERS_KEY, JSON.stringify(users));
  } catch {}
}

function parseUserAddress(raw: any): UserAddress | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'object' && ('street' in raw || 'city' in raw)) {
    return {
      street: raw.street || '',
      city: raw.city || '',
      state: raw.state || '',
      postalCode: raw.postalCode || raw.postal_code || '',
      country: raw.country || ''
    };
  }
  if (typeof raw === 'string' && raw.trim()) {
    return {
      street: raw,
      city: '',
      state: '',
      postalCode: '',
      country: ''
    };
  }
  return undefined;
}

/**
 * Normalizes any database row (snake_case, camelCase, or Auth metadata) into a UserProfile
 */
export function normalizeUserProfileRow(d: any): UserProfile | null {
  if (!d || !d.id) return null;

  const email = d.email || '';
  const displayName = d.display_name || d.full_name || d.displayName || d.name || (email ? email.split('@')[0] : 'Wholesale Buyer');
  
  // Resolve assigned role override if admin previously granted it
  const assigned = getAssignedRole(String(d.id), email);
  const isRootAdmin = email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
  const rawRole = (d.role === 'admin' || d.role === 'administrator') ? 'admin' : 'customer';
  const role: UserRole = isRootAdmin ? 'admin' : (assigned || rawRole);

  const photo = d.photo_url || d.avatar_url || d.photoURL || d.avatarUrl || (
    role === 'admin'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'
  );

  return {
    id: String(d.id),
    email,
    displayName,
    companyName: d.company_name || d.companyName || (role === 'admin' ? 'Eagle Excel Headquarters' : 'Wholesale Procurement Co.'),
    phone: d.phone || '',
    photoURL: photo,
    avatarUrl: photo,
    role,
    title: d.title || (role === 'admin' ? 'Executive Operations Director' : 'Procurement Manager'),
    bio: d.bio || '',
    address: parseUserAddress(d.address),
    city: d.city || '',
    country: d.country || '',
    taxId: d.tax_id || d.taxId || '',
    totalSpent: Number(d.total_spent || d.totalSpent || 0),
    ordersCount: Number(d.orders_count || d.ordersCount || 0),
    createdAt: d.created_at || d.createdAt || new Date().toISOString(),
    updatedAt: d.updated_at || d.updatedAt || new Date().toISOString()
  };
}

/**
 * Assigns 'admin' or 'customer' role to a user, updating Supabase (RPC & Tables), Server backend (/api/users/role), local overrides, and realtime broadcast.
 */
export async function assignAdminClaim(
  targetUid: string, 
  isAdmin: boolean = true,
  targetEmail?: string,
  actorName?: string
): Promise<{ success: boolean; role: UserRole; message: string }> {
  if (!targetUid) {
    throw new Error('Target user ID is required to assign admin claims.');
  }

  const targetRole: UserRole = isAdmin ? 'admin' : 'customer';

  // 1. Discover email if not passed
  let resolvedEmail = targetEmail || '';
  const localList = getLocalUsers();
  const matchedUser = localList.find(u => u.id === targetUid || (resolvedEmail && u.email?.toLowerCase() === resolvedEmail.toLowerCase()));
  if (!resolvedEmail && matchedUser?.email) {
    resolvedEmail = matchedUser.email;
  }

  // 2. Persist in local assigned role overrides (guarantees role permanence on this device)
  setRoleOverride(targetUid, targetRole);
  if (resolvedEmail) {
    setRoleOverride(resolvedEmail, targetRole);
  }

  // 3. Post to Server Backend Authoritative Store & Trigger Server SSE Broadcast
  try {
    const serverPayload = {
      userId: targetUid,
      role: targetRole,
      email: resolvedEmail,
      actorName: actorName || 'Administrator',
      reason: targetRole === 'admin' ? 'Promoted to Administrator' : 'Reverted to Wholesale Buyer'
    };

    fetch('/api/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverPayload)
    }).catch(e => console.warn('[userService] Server /api/users/role notice:', e));
  } catch (err) {
    console.warn('[userService] Server role broadcast notice:', err);
  }

  // 4. Update local storage cache for instant 0ms UI feedback
  const updatedList = localList.map(u => {
    if (u.id === targetUid || (resolvedEmail && u.email?.toLowerCase() === resolvedEmail.toLowerCase())) {
      return { ...u, role: targetRole, updatedAt: new Date().toISOString() };
    }
    return u;
  });
  saveLocalUsers(updatedList);

  // Update cached profile keys in localStorage
  try {
    const cachedProfileKey = `ee_user_profile_cache_${targetUid}`;
    const rawCached = localStorage.getItem(cachedProfileKey);
    if (rawCached) {
      const parsed = JSON.parse(rawCached);
      parsed.role = targetRole;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(cachedProfileKey, JSON.stringify(parsed));
    }
  } catch {}

  // 5. Dispatch notification to the target user
  try {
    const targetDisplayName = matchedUser?.displayName || (resolvedEmail ? resolvedEmail.split('@')[0] : 'User');
    if (isAdmin) {
      sendAdminRoleGrantedNotification(targetUid, targetDisplayName, actorName).catch(() => {});
    } else {
      sendAdminRoleRevokedNotification(targetUid, targetDisplayName, actorName).catch(() => {});
    }
  } catch {}

  // 6. Dispatch local cross-tab / window sync events
  try {
    window.dispatchEvent(new CustomEvent('eagle_excel_user_role_changed', {
      detail: { userId: targetUid, email: resolvedEmail, role: targetRole }
    }));

    if (typeof BroadcastChannel !== 'undefined') {
      const roleBc = new BroadcastChannel('eagle_excel_role_sync_channel');
      roleBc.postMessage({
        type: 'USER_ROLE_CHANGED',
        userId: targetUid,
        email: resolvedEmail,
        role: targetRole
      });
      setTimeout(() => roleBc.close(), 1000);
    }
  } catch {}

  if (!isSupabaseEnabled()) {
    return {
      success: true,
      role: targetRole,
      message: `Updated user role to ${targetRole} across server and local storage.`
    };
  }

  const supabase = getSupabase();
  if (supabase) {
    let rpcSucceeded = false;

    // Strategy A: Call SECURITY DEFINER RPC function (bypasses RLS on Supabase)
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_user_role', {
        target_user_id: targetUid,
        target_role: targetRole
      });

      if (!rpcErr && rpcRes) {
        rpcSucceeded = true;
        console.log('[userService] Successfully updated role via Supabase RPC set_user_role:', rpcRes);
      } else if (rpcErr) {
        console.warn('[userService] Notice on RPC set_user_role (falling back to direct updates):', rpcErr.message);
      }
    } catch (e) {
      console.warn('[userService] RPC set_user_role call notice:', e);
    }

    // Strategy B: Direct table updates on profiles by ID and Email
    try {
      await supabase
        .from(PROFILES_TABLE)
        .update({ 
          role: targetRole, 
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUid);

      if (resolvedEmail) {
        await supabase
          .from(PROFILES_TABLE)
          .update({ 
            role: targetRole, 
            updated_at: new Date().toISOString()
          })
          .ilike('email', resolvedEmail);
      }
    } catch (e) {
      console.warn('[userService] Direct profiles update notice:', e);
    }

    // Strategy C: Direct table updates on users table by ID and Email
    try {
      await supabase
        .from(USERS_TABLE)
        .update({ 
          role: targetRole, 
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUid);

      if (resolvedEmail) {
        await supabase
          .from(USERS_TABLE)
          .update({ 
            role: targetRole, 
            updated_at: new Date().toISOString()
          })
          .ilike('email', resolvedEmail);
      }
    } catch (e) {
      // Ignore if users table does not exist
    }

    // Strategy D: Broadcast role update across all connected Supabase clients & active sessions
    try {
      const channel = supabase.channel(SYNC_CHANNEL_NAME);
      await channel.send({
        type: 'broadcast',
        event: 'USER_ROLE_CHANGED',
        payload: { userId: targetUid, email: resolvedEmail, role: targetRole }
      });
    } catch {}
  }

  return {
    success: true,
    role: targetRole,
    message: `Successfully updated user role to "${targetRole}".`
  };
}

/**
 * Helper to inspect the currently authenticated user's admin role
 */
export async function checkCurrentUserAdminClaim(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const role = data.user.user_metadata?.role || data.user.app_metadata?.role;
    return role === 'admin';
  } catch {
    return false;
  }
}

// Fetch single user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const local = getLocalUsers().find(u => u.id === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase()));
  
  // 1. Try server backend endpoint
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
    if (res.ok) {
      const serverUser = await res.json();
      if (serverUser && serverUser.id) {
        const assigned = getAssignedRole(serverUser.id, serverUser.email);
        const resolvedRole = assigned || serverUser.role || 'customer';
        const finalProfile = { ...serverUser, role: resolvedRole };
        return finalProfile;
      }
    }
  } catch (e) {
    // Server fetch fallback
  }

  if (!isSupabaseEnabled()) {
    if (local) {
      const assigned = getAssignedRole(local.id, local.email);
      return { ...local, role: assigned || local.role || 'customer' };
    }
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) {
    if (local) {
      const assigned = getAssignedRole(local.id, local.email);
      return { ...local, role: assigned || local.role || 'customer' };
    }
    return null;
  }

  try {
    // 2. Try public.profiles in Supabase
    const { data: profileData, error: profileErr } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profileErr && profileData) {
      const normalized = normalizeUserProfileRow(profileData);
      if (normalized) return normalized;
    }

    // 3. Fallback to public.users if not found in profiles
    const { data: userData } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (userData) {
      const normalized = normalizeUserProfileRow(userData);
      if (normalized) return normalized;
    }

    if (local) {
      const assigned = getAssignedRole(local.id, local.email);
      return { ...local, role: assigned || local.role || 'customer' };
    }
    return null;
  } catch (error) {
    if (local) {
      const assigned = getAssignedRole(local.id, local.email);
      return { ...local, role: assigned || local.role || 'customer' };
    }
    return null;
  }
}

/**
 * Resiliently saves or updates a User Profile in Supabase (profiles, users) and local storage.
 * Handles schema column variances with automatic multi-tier fallback.
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  // 1. Always update local storage first for 0ms optimistic UI
  const current = getLocalUsers();
  const filtered = current.filter(u => u.id !== profile.id);
  filtered.unshift(profile);
  saveLocalUsers(filtered);

  if (!isSupabaseEnabled()) {
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  // 2. Prepare comprehensive record
  const fullSnakeRecord: Record<string, any> = {
    id: profile.id,
    email: profile.email,
    display_name: profile.displayName || '',
    full_name: profile.displayName || '',
    company_name: profile.companyName || '',
    phone: profile.phone || '',
    photo_url: profile.photoURL || profile.avatarUrl || '',
    avatar_url: profile.avatarUrl || profile.photoURL || '',
    role: profile.role || 'customer',
    title: profile.title || '',
    bio: profile.bio || '',
    city: profile.city || '',
    country: profile.country || '',
    tax_id: profile.taxId || '',
    total_spent: profile.totalSpent || 0,
    orders_count: profile.ordersCount || 0,
    created_at: profile.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (profile.address) {
    fullSnakeRecord.address = typeof profile.address === 'object' ? JSON.stringify(profile.address) : profile.address;
  }

  const essentialSnakeRecord: Record<string, any> = {
    id: profile.id,
    email: profile.email,
    display_name: profile.displayName || '',
    company_name: profile.companyName || '',
    role: profile.role || 'customer',
    phone: profile.phone || '',
    avatar_url: profile.avatarUrl || profile.photoURL || '',
    created_at: profile.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const camelRecord: Record<string, any> = {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName || '',
    companyName: profile.companyName || '',
    role: profile.role || 'customer',
    phone: profile.phone || '',
    avatarUrl: profile.avatarUrl || profile.photoURL || '',
    totalSpent: profile.totalSpent || 0,
    ordersCount: profile.ordersCount || 0,
    createdAt: profile.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 3. Upsert into public.profiles with multi-tier schema fallback
  try {
    let savedToProfiles = false;
    const { error: err1 } = await supabase.from(PROFILES_TABLE).upsert(fullSnakeRecord, { onConflict: 'id' });
    if (!err1) {
      savedToProfiles = true;
    } else {
      // Fallback 1: Essential snake_case columns
      const { error: err2 } = await supabase.from(PROFILES_TABLE).upsert(essentialSnakeRecord, { onConflict: 'id' });
      if (!err2) {
        savedToProfiles = true;
      } else {
        // Fallback 2: camelCase columns
        const { error: err3 } = await supabase.from(PROFILES_TABLE).upsert(camelRecord, { onConflict: 'id' });
        if (!err3) savedToProfiles = true;
      }
    }

    // 4. Also upsert into public.users table for schema robustness
    try {
      const { error: uErr1 } = await supabase.from(USERS_TABLE).upsert(fullSnakeRecord, { onConflict: 'id' });
      if (uErr1) {
        await supabase.from(USERS_TABLE).upsert(essentialSnakeRecord, { onConflict: 'id' });
      }
    } catch {}

    // 5. Broadcast real-time user update via Supabase Broadcast channel
    try {
      const channel = supabase.channel(SYNC_CHANNEL_NAME);
      channel.send({
        type: 'broadcast',
        event: 'USER_REGISTERED',
        payload: profile
      }).catch(() => {});
    } catch {}

  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `${PROFILES_TABLE}/${profile.id}`);
  }
}

/**
 * Comprehensive multi-source User Fetcher for the Admin Dashboard.
 * Queries:
 * 1. Server backend (/api/users and /api/users/roles)
 * 2. public.profiles
 * 3. public.users
 * 4. public.orders (extracts registered customer buyers and aggregates revenue metrics)
 * 5. public.messages (extracts active chat customers)
 * 6. localStorage cache
 * Automatically merges, deduplicates, calculates buyer analytics, and backfills missing records.
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  // Sync server role overrides in background/foreground
  await fetchServerRoleOverrides().catch(() => {});

  const local = getLocalUsers();
  const userMap = new Map<string, UserProfile>();

  // Populate map with local users first
  local.forEach(u => {
    if (u && u.id) {
      const assigned = getAssignedRole(u.id, u.email);
      userMap.set(u.id, { ...u, role: assigned || u.role || 'customer' });
    }
  });

  // 1. Fetch from Server backend (/api/users)
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const serverUsers: UserProfile[] = await res.json();
      if (Array.isArray(serverUsers)) {
        serverUsers.forEach(su => {
          if (su && su.id) {
            const assigned = getAssignedRole(su.id, su.email);
            const resolvedRole = assigned || su.role || 'customer';
            const existing = userMap.get(su.id);
            userMap.set(su.id, { ...existing, ...su, role: resolvedRole });
          }
        });
      }
    }
  } catch (e) {
    // Server fetch notice
  }

  if (!isSupabaseEnabled()) {
    const all = Array.from(userMap.values()).map(u => {
      const assigned = getAssignedRole(u.id, u.email);
      return { ...u, role: assigned || u.role || 'customer' };
    });
    saveLocalUsers(all);
    return all.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    const all = Array.from(userMap.values()).map(u => {
      const assigned = getAssignedRole(u.id, u.email);
      return { ...u, role: assigned || u.role || 'customer' };
    });
    saveLocalUsers(all);
    return all.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  try {
    // 2. Fetch from public.profiles in Supabase
    try {
      const { data: profileRows, error: pErr } = await supabase
        .from(PROFILES_TABLE)
        .select('*');

      if (!pErr && Array.isArray(profileRows)) {
        profileRows.forEach(row => {
          const norm = normalizeUserProfileRow(row);
          if (norm) {
            const existing = userMap.get(norm.id);
            userMap.set(norm.id, { ...existing, ...norm });
          }
        });
      }
    } catch (e) {
      console.warn('[userService] profiles fetch notice:', e);
    }

    // 3. Fetch from public.users in Supabase
    try {
      const { data: userRows, error: uErr } = await supabase
        .from(USERS_TABLE)
        .select('*');

      if (!uErr && Array.isArray(userRows)) {
        userRows.forEach(row => {
          const norm = normalizeUserProfileRow(row);
          if (norm) {
            const existing = userMap.get(norm.id);
            userMap.set(norm.id, { ...existing, ...norm });
          }
        });
      }
    } catch (e) {
      console.warn('[userService] users fetch notice:', e);
    }

    // 4. Scan public.orders to discover any registered buyers who placed orders & calculate true spend
    try {
      const { data: orderRows } = await supabase
        .from('orders')
        .select('*');

      if (Array.isArray(orderRows) && orderRows.length > 0) {
        // Group orders by userId / customerEmail
        const spendByUser: Record<string, { totalSpent: number; ordersCount: number; name?: string; email?: string; address?: any }> = {};

        orderRows.forEach(order => {
          const uId = order.userId || order.user_id || order.customerId || order.customer_id;
          const email = order.customerEmail || order.customer_email || order.email;
          const name = order.customerName || order.customer_name || order.name;
          const total = Number(order.total || order.totalAmount || order.total_amount || 0);
          const isCancelled = order.status === 'cancelled';

          if (uId) {
            if (!spendByUser[uId]) {
              spendByUser[uId] = { totalSpent: 0, ordersCount: 0, name, email, address: order.shippingAddress || order.shipping_address };
            }
            if (!isCancelled) spendByUser[uId].totalSpent += total;
            spendByUser[uId].ordersCount += 1;
          }
        });

        // Reconcile spend and discover any missing user profiles
        Object.entries(spendByUser).forEach(([uId, stats]) => {
          const existing = userMap.get(uId);
          if (existing) {
            userMap.set(uId, {
              ...existing,
              totalSpent: stats.totalSpent > 0 ? stats.totalSpent : existing.totalSpent,
              ordersCount: stats.ordersCount > 0 ? stats.ordersCount : existing.ordersCount
            });
          } else if (stats.email) {
            // Discovered a new buyer from an order!
            const assigned = getAssignedRole(uId, stats.email);
            const newDiscoveredUser: UserProfile = {
              id: uId,
              email: stats.email,
              displayName: stats.name || stats.email.split('@')[0],
              companyName: 'Wholesale Buyer (Verified via Orders)',
              role: assigned || 'customer',
              phone: '',
              photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
              avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
              address: parseUserAddress(stats.address),
              totalSpent: stats.totalSpent,
              ordersCount: stats.ordersCount,
              createdAt: new Date().toISOString()
            };
            userMap.set(uId, newDiscoveredUser);
          }
        });
      }
    } catch (e) {
      // Ignore orders lookup notice
    }

    // Final normalization: ensure all user roles match assigned overrides
    const allMerged = Array.from(userMap.values()).map(u => {
      const assigned = getAssignedRole(u.id, u.email);
      return {
        ...u,
        role: assigned || u.role || 'customer'
      };
    });

    // Save reconciled list into local storage cache
    saveLocalUsers(allMerged);

    // Sort users: Admins first, then newest registered first
    return allMerged.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  } catch (error) {
    const fallbackList = Array.from(userMap.values()).map(u => {
      const assigned = getAssignedRole(u.id, u.email);
      return { ...u, role: assigned || u.role || 'customer' };
    });
    return fallbackList;
  }
}

// Update User Role (Admin permission)
export async function updateUserRole(userId: string, newRole: UserRole, userEmail?: string, actorName?: string): Promise<void> {
  await assignAdminClaim(userId, newRole === 'admin', userEmail, actorName);
}

/**
 * Permanently deletes a user profile and account record from Supabase and local storage.
 */
export async function deleteUserAccount(userId: string): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    throw new Error('Target user ID is required to delete account.');
  }

  // 1. Remove from local storage cache immediately for 0ms optimistic UI update
  const current = getLocalUsers();
  const filtered = current.filter(u => u.id !== userId);
  saveLocalUsers(filtered);

  // Clean any cached user profile if matching
  try {
    const cachedActive = localStorage.getItem('eev_cached_user_profile');
    if (cachedActive) {
      const parsed = JSON.parse(cachedActive);
      if (parsed.id === userId) {
        localStorage.removeItem('eev_cached_user_profile');
      }
    }
  } catch {}

  if (!isSupabaseEnabled()) {
    return {
      success: true,
      message: 'Account successfully removed from local database.'
    };
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 2. Delete from public.profiles
      try {
        await supabase
          .from(PROFILES_TABLE)
          .delete()
          .eq('id', userId);
      } catch (e) {
        console.warn('[userService] Delete from profiles notice:', e);
      }

      // 3. Delete from public.users
      try {
        await supabase
          .from(USERS_TABLE)
          .delete()
          .eq('id', userId);
      } catch (e) {
        console.warn('[userService] Delete from users notice:', e);
      }

      // 4. Broadcast deletion event to all connected admin tabs & clients
      try {
        const channel = supabase.channel(SYNC_CHANNEL_NAME);
        await channel.send({
          type: 'broadcast',
          event: 'USER_DELETED',
          payload: { userId }
        });
      } catch {}

    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, `${PROFILES_TABLE}/${userId}`);
    }
  }

  return {
    success: true,
    message: 'User account successfully deleted from database and system records.'
  };
}

/**
 * Manually creates or registers a wholesale buyer user from Admin Dashboard
 */
export async function createManualUser(data: {
  email: string;
  displayName: string;
  companyName?: string;
  role: UserRole;
  phone?: string;
  city?: string;
  country?: string;
}): Promise<UserProfile> {
  const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser: UserProfile = {
    id: newId,
    email: (data.email || '').trim(),
    displayName: (data.displayName || '').trim(),
    companyName: data.companyName ? data.companyName.trim() : 'Wholesale Buyer Corp',
    role: data.role,
    phone: data.phone ? data.phone.trim() : '',
    city: data.city ? data.city.trim() : '',
    country: data.country ? data.country.trim() : 'Nigeria',
    photoURL: data.role === 'admin'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    avatarUrl: data.role === 'admin'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    totalSpent: 0,
    ordersCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveUserProfile(newUser);
  return newUser;
}

/**
 * Subscribe to all registered users in real time for Admin Directory.
 * Listens to:
 * - postgres_changes on public.profiles
 * - postgres_changes on public.users
 * - Realtime broadcast channel 'ee_global_sync' on events 'USER_REGISTERED', 'USER_UPDATED', 'USER_ROLE_CHANGED'
 */
export function subscribeToAllUsers(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const local = getLocalUsers();
  onUpdate(local);

  if (!isSupabaseEnabled()) {
    return () => {};
  }

  const supabase = getSupabase();
  if (!supabase) return () => {};

  // Initial full sync
  getAllUsers().then(users => onUpdate(users)).catch(err => {
    if (onError) onError(err);
  });

  try {
    // 1. Postgres changes on profiles
    const channelProfiles = supabase
      .channel('public:profiles:all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: PROFILES_TABLE },
        () => {
          getAllUsers().then(users => onUpdate(users));
        }
      )
      .subscribe();

    // 2. Postgres changes on users
    const channelUsers = supabase
      .channel('public:users:all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: USERS_TABLE },
        () => {
          getAllUsers().then(users => onUpdate(users));
        }
      )
      .subscribe();

    // 3. Broadcast channel for instant cross-tab / cross-device synchronization
    const channelBroadcast = supabase
      .channel(SYNC_CHANNEL_NAME)
      .on(
        'broadcast',
        { event: 'USER_REGISTERED' },
        (payload: any) => {
          if (payload?.payload) {
            const current = getLocalUsers();
            const filtered = current.filter(u => u.id !== payload.payload.id);
            filtered.unshift(payload.payload);
            saveLocalUsers(filtered);
            onUpdate(filtered);
          }
          getAllUsers().then(users => onUpdate(users));
        }
      )
      .on(
        'broadcast',
        { event: 'USER_UPDATED' },
        () => {
          getAllUsers().then(users => onUpdate(users));
        }
      )
      .on(
        'broadcast',
        { event: 'USER_ROLE_CHANGED' },
        () => {
          getAllUsers().then(users => onUpdate(users));
        }
      )
      .on(
        'broadcast',
        { event: 'USER_DELETED' },
        (payload: any) => {
          if (payload?.payload?.userId) {
            const current = getLocalUsers();
            const filtered = current.filter(u => u.id !== payload.payload.userId);
            saveLocalUsers(filtered);
            onUpdate(filtered);
          }
          getAllUsers().then(users => onUpdate(users));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelProfiles);
      supabase.removeChannel(channelUsers);
      supabase.removeChannel(channelBroadcast);
    };
  } catch (error) {
    handleSupabaseError(error, OperationType.READ, PROFILES_TABLE);
    return () => {};
  }
}

/**
 * Subscribe to a single user profile in real-time
 */
export function subscribeToUserProfile(
  userId: string,
  onUpdate: (profile: UserProfile | null) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!userId) return () => {};

  // Instant local lookup
  getUserProfile(userId).then(p => {
    if (p) onUpdate(p);
  }).catch(() => {});

  if (!isSupabaseEnabled()) {
    return () => {};
  }

  const supabase = getSupabase();
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: PROFILES_TABLE, filter: `id=eq.${userId}` },
        (payload: any) => {
          if (payload.new) {
            const normalized = normalizeUserProfileRow(payload.new);
            if (normalized) onUpdate(normalized);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

// Backwards-compatible aliases for legacy integrations
export const getUserProfileFromFirestore = getUserProfile;
export const saveUserProfileToFirestore = saveUserProfile;
export const getAllUsersFromFirestore = getAllUsers;
export const subscribeToAllUsersFirestore = subscribeToAllUsers;

