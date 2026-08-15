import { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import { getSupabase, isSupabaseEnabled, SupabaseUser as AuthUserType } from '../lib/supabase';

export type { SupabaseUser };

export interface AuthUserProfileUpdates {
  displayName?: string;
  photoURL?: string;
}

export interface SupabaseAuthResult {
  user: SupabaseUser | null;
  session: Session | null;
}

/**
 * Authentication Service for Eagle Excel
 * Encapsulates Supabase Authentication flows (Email/Password, Google OAuth, User State)
 */

/**
 * Sign in using email and password
 */
export async function loginWithEmailAndPassword(
  email: string, 
  pass: string
): Promise<SupabaseAuthResult> {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase authentication is not configured. Running in local standalone mode.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * Create a new user account with email and password
 */
export async function registerWithEmailAndPassword(
  email: string, 
  pass: string, 
  displayName?: string
): Promise<SupabaseAuthResult> {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase authentication is not configured. Running in local standalone mode.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const trimmedEmail = email.trim();
  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password: pass,
    options: {
      data: {
        full_name: displayName?.trim() || '',
        name: displayName?.trim() || '',
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * Sign in using Google OAuth (Popup-safe for iframe & standalone preview)
 */
export async function loginWithGoogleOAuth(options?: { redirectTo?: string }): Promise<{ url?: string; popup?: Window | null }> {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase authentication is not configured. Please check your Supabase credentials in settings.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
  // Default to /auth/callback or current origin for smooth popup handling
  const redirectUrl = options?.redirectTo || (currentOrigin ? `${currentOrigin}/auth/callback` : undefined);

  // Clear any prior OAuth signal and set in-progress marker
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('ee_oauth_completion_signal');
      localStorage.setItem('ee_oauth_in_progress', 'true');
    } catch (e) {}
  }

  // Use skipBrowserRedirect so Google OAuth doesn't get blocked by X-Frame-Options in iframe
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('No authorization URL returned from Supabase OAuth provider.');
  }

  let popupWindow: Window | null = null;
  if (typeof window !== 'undefined') {
    const width = 540;
    const height = 680;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    popupWindow = window.open(
      data.url,
      'EagleExcelGoogleAuth',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined') {
      // If browser blocked popup, open in top-level new tab as fallback
      popupWindow = window.open(data.url, '_blank');
    }
  }

  return {
    url: data.url,
    popup: popupWindow,
  };
}

/**
 * Sign out the currently authenticated user
 */
export async function logoutUser(): Promise<void> {
  if (isSupabaseEnabled()) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
  }
}

/**
 * Update the current Supabase user's authentication profile metadata (displayName / photoURL)
 */
export async function updateAuthUserProfile(updates: AuthUserProfileUpdates): Promise<void> {
  if (!isSupabaseEnabled()) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const userMetadata: Record<string, any> = {};
  if (updates.displayName !== undefined) {
    userMetadata.full_name = updates.displayName;
    userMetadata.name = updates.displayName;
  }
  if (updates.photoURL !== undefined) {
    userMetadata.avatar_url = updates.photoURL;
    userMetadata.picture = updates.photoURL;
  }

  const { error } = await supabase.auth.updateUser({
    data: userMetadata,
  });

  if (error) {
    console.warn('Supabase updateUser profile warning:', error);
  }
}

/**
 * Subscribe to authentication state changes (handles session restoration and persistence)
 */
export function subscribeToAuthState(
  callback: (user: SupabaseUser | null) => void
): () => void {
  if (!isSupabaseEnabled()) {
    callback(null);
    return () => {};
  }

  const supabase = getSupabase();
  if (!supabase) {
    callback(null);
    return () => {};
  }

  // Get initial session
  supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user || null);
  }).catch(() => {
    callback(null);
  });

  // Listen to state changes
  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return () => {
    authListener?.subscription?.unsubscribe();
  };
}

/**
 * Get current session user asynchronously or synchronously from cache
 */
export async function getCurrentAuthUserAsync(): Promise<SupabaseUser | null> {
  if (!isSupabaseEnabled()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getUser();
    return data.user || null;
  } catch {
    return null;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectUrl,
  });

  if (error) {
    throw error;
  }
}

/**
 * Parse and return human-friendly auth error messages
 */
export function parseAuthErrorMessage(error: any): { code: string; message: string; isDomainError: boolean } {
  const code = error?.code || error?.status || '';
  const rawMessage = error?.message || '';
  const isDomainError = rawMessage.includes('redirect_uri') || rawMessage.includes('domain') || rawMessage.includes('not authorized');

  let message = rawMessage;
  if (rawMessage.includes('Invalid login credentials')) {
    message = 'Invalid email address or password. Please check your credentials and try again.';
  } else if (rawMessage.includes('Email not confirmed')) {
    message = 'Please check your inbox and verify your email address before signing in.';
  } else if (rawMessage.includes('User already registered')) {
    message = 'An account with this email already exists. Please sign in instead.';
  } else if (rawMessage.includes('Password should be at least')) {
    message = 'Password must be at least 6 characters long.';
  } else if (rawMessage.toLowerCase().includes('provider is not enabled') || rawMessage.toLowerCase().includes('unsupported provider') || rawMessage.includes('validation_failed')) {
    message = 'Google Sign-In is not yet enabled in your Supabase project. To enable: In your Supabase Dashboard, go to Authentication → Providers → Google, toggle "Enable Google provider", paste your Google Client ID & Secret, and add your app domain to Redirect URLs.';
  } else if (rawMessage.includes('redirect_uri_mismatch') || isDomainError) {
    message = 'OAuth Redirect URL mismatch. In Supabase Dashboard, go to Authentication → URL Configuration, and add this App URL to "Redirect URLs".';
  }

  return { code: String(code), message, isDomainError };
}
