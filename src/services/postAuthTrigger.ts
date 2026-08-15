import { getSupabase, isSupabaseEnabled } from '../lib/supabase';
import { UserProfile, UserRole, UserAddress } from '../types';
import { SupabaseUser } from './authService';
import { saveUserProfile, normalizeUserProfileRow, getAssignedRole } from './userService';

const PROFILES_TABLE = 'profiles';
const USERS_TABLE = 'users';
const ROOT_ADMIN_EMAIL = 'joshuaegesienyinnaya@gmail.com';

export interface PostAuthTriggerResult {
  profile: UserProfile;
  created: boolean;
  source: 'profiles' | 'users' | 'fallback';
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
 * Extracts normalized profile metadata from Supabase / Google OAuth user
 */
export function extractGoogleUserMetadata(user: SupabaseUser | { id: string; email?: string | null; user_metadata?: Record<string, any>; displayName?: string | null; photoURL?: string | null }): {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  companyName: string;
  title: string;
  phone: string;
} {
  const meta = user.user_metadata || {};
  const email = (user.email || '').trim();
  const isRootAdmin = email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();

  // Extract display name from Google OAuth claims (full_name, name, given_name + family_name)
  let displayName = meta.full_name || meta.name || '';
  if (!displayName && meta.given_name) {
    displayName = `${meta.given_name} ${meta.family_name || ''}`.trim();
  }
  if (!displayName && (user as any).displayName) {
    displayName = (user as any).displayName;
  }
  if (!displayName) {
    displayName = isRootAdmin ? 'Joshua Egesi' : (email.split('@')[0] || 'Wholesale Buyer');
  }

  // Extract avatar URL from Google OAuth claims (avatar_url, picture)
  const avatarUrl = meta.avatar_url || meta.picture || (user as any).photoURL || (
    isRootAdmin 
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' 
      : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'
  );

  // Check assigned role override if admin previously granted it
  const assignedRole = getAssignedRole(user.id, email);
  const role: UserRole = isRootAdmin ? 'admin' : (assignedRole || (meta.role === 'admin' ? 'admin' : 'customer'));
  const companyName = meta.company_name || meta.companyName || (role === 'admin' ? 'Eagle Excel Headquarters' : 'Enterprise Wholesale Buyer');
  const title = role === 'admin' ? 'Executive Managing Director' : (meta.title || 'Senior Procurement Specialist');
  const phone = meta.phone || '';

  return {
    id: user.id,
    email,
    displayName,
    avatarUrl,
    role,
    companyName,
    title,
    phone
  };
}

/**
 * Post-Authentication Trigger:
 * Executes after a successful Google login, email registration, or authentication event.
 * Checks if a record exists in public.profiles table, creates one if missing, and syncs across local storage and realtime broadcast.
 */
export async function handlePostAuthProfileTrigger(
  user: SupabaseUser | { id: string; email?: string | null; user_metadata?: Record<string, any>; displayName?: string | null; photoURL?: string | null }
): Promise<PostAuthTriggerResult> {
  const meta = extractGoogleUserMetadata(user);

  // Local optimistic representation
  const localProfile: UserProfile = {
    id: meta.id,
    email: meta.email,
    displayName: meta.displayName,
    companyName: meta.companyName,
    phone: meta.phone,
    photoURL: meta.avatarUrl,
    avatarUrl: meta.avatarUrl,
    role: meta.role,
    title: meta.title,
    bio: '',
    address: undefined,
    city: '',
    country: '',
    totalSpent: 0,
    ordersCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!isSupabaseEnabled()) {
    await saveUserProfile(localProfile);
    return { profile: localProfile, created: false, source: 'fallback' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    await saveUserProfile(localProfile);
    return { profile: localProfile, created: false, source: 'fallback' };
  }

  try {
    // Step 1: Check if record exists in public.profiles
    let foundProfile: any = null;
    let tableUsed: 'profiles' | 'users' = 'profiles';

    const { data: profileData, error: profileSelectErr } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('id', meta.id)
      .maybeSingle();

    if (!profileSelectErr && profileData) {
      foundProfile = profileData;
      tableUsed = 'profiles';
    } else {
      // Check secondary users table in case public.users is used
      const { data: userData } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('id', meta.id)
        .maybeSingle();

      if (userData) {
        foundProfile = userData;
        tableUsed = 'users';
      }
    }

    // Step 2: If profile record is missing, create a new one via saveUserProfile
    if (!foundProfile) {
      console.log(`[PostAuthTrigger] No profile found for user ${meta.id} (${meta.email}). Persisting via saveUserProfile...`);
      await saveUserProfile(localProfile);
      return { profile: localProfile, created: true, source: 'profiles' };
    }

    // Step 3: Profile exists - check if updates are necessary
    const normalized = normalizeUserProfileRow(foundProfile) || localProfile;
    let needsUpdate = false;
    let updatedProfile = { ...normalized };

    // Uphold assigned admin status (e.g. buyer promoted to admin)
    const assignedRole = getAssignedRole(meta.id, meta.email);
    if ((meta.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase() || assignedRole === 'admin') && normalized.role !== 'admin') {
      updatedProfile.role = 'admin';
      needsUpdate = true;
    } else if (assignedRole && assignedRole !== normalized.role) {
      updatedProfile.role = assignedRole;
      needsUpdate = true;
    }

    if (!normalized.avatarUrl && meta.avatarUrl) {
      updatedProfile.avatarUrl = meta.avatarUrl;
      updatedProfile.photoURL = meta.avatarUrl;
      needsUpdate = true;
    }

    if (!normalized.displayName && meta.displayName) {
      updatedProfile.displayName = meta.displayName;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await saveUserProfile(updatedProfile);
    }

    return { profile: updatedProfile, created: false, source: tableUsed };

  } catch (error) {
    console.error('[PostAuthTrigger] Error during post-auth profile check:', error);
    await saveUserProfile(localProfile);
    return { profile: localProfile, created: false, source: 'fallback' };
  }
}
