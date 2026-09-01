import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types';
import { isSupabaseEnabled, getSupabase } from '../lib/supabase';
import { getUserProfile, saveUserProfile, subscribeToUserProfile, getAssignedRole, fetchServerRoleOverrides } from '../services/userService';
import { handlePostAuthProfileTrigger } from '../services/postAuthTrigger';
import {
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  loginWithGoogleOAuth,
  logoutUser,
  updateAuthUserProfile,
  subscribeToAuthState,
  sendPasswordReset,
  SupabaseUser
} from '../services/authService';

export interface AppUser {
  uid: string;
  id: string;
  email?: string;
  displayName?: string | null;
  photoURL?: string | null;
  avatarUrl?: string | null;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

interface AuthContextType {
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  loading: boolean;
  isHydrated: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  signupWithEmail: (email: string, pass: string, name: string, companyName?: string, role?: UserRole) => Promise<UserProfile>;
  loginWithGoogle: (options?: { redirectTo?: string }) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  syncPostAuthProfile: (user?: AppUser | null) => Promise<UserProfile | null>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  setSimulatedRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Special root administrator email matching user metadata
const ROOT_ADMIN_EMAIL = 'joshuaegesienyinnaya@gmail.com';
const USER_PROFILE_CACHE_KEY_PREFIX = 'ee_user_profile_cache_';

function getCachedUserProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`${USER_PROFILE_CACHE_KEY_PREFIX}${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id === uid) return parsed;
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return null;
}

function setCachedUserProfile(profile: UserProfile) {
  try {
    localStorage.setItem(`${USER_PROFILE_CACHE_KEY_PREFIX}${profile.id}`, JSON.stringify(profile));
  } catch (e) {
    // Ignore
  }
}

function toAppUser(user: SupabaseUser | null): AppUser | null {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    uid: user.id,
    id: user.id,
    email: user.email,
    displayName: meta.full_name || meta.name || user.email?.split('@')[0] || 'Wholesale Buyer',
    photoURL: meta.avatar_url || meta.picture || null,
    avatarUrl: meta.avatar_url || meta.picture || null,
    user_metadata: meta,
    app_metadata: user.app_metadata,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const lastUserId = localStorage.getItem('ee_last_active_user_id');
        if (lastUserId) {
          const cached = getCachedUserProfile(lastUserId);
          if (cached) {
            return {
              uid: cached.id,
              id: cached.id,
              email: cached.email,
              displayName: cached.displayName || 'Wholesale Buyer',
              photoURL: cached.photoURL || cached.avatarUrl || null,
              avatarUrl: cached.photoURL || cached.avatarUrl || null
            };
          }
        }
      }
    } catch {}
    return null;
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const lastUserId = localStorage.getItem('ee_last_active_user_id');
        if (lastUserId) {
          return getCachedUserProfile(lastUserId);
        }
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const lastUserId = localStorage.getItem('ee_last_active_user_id');
        if (lastUserId && getCachedUserProfile(lastUserId)) {
          return true;
        }
      }
    } catch {}
    return false;
  });

  // Post-authentication profile trigger: verifies public.profiles record and creates if missing
  const ensureProfileDocument = async (user: AppUser): Promise<UserProfile> => {
    // 1. Fetch freshest authoritative role overrides from server
    await fetchServerRoleOverrides().catch(() => {});

    const isRootAdmin = user.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
    const assigned = getAssignedRole(user.uid, user.email);

    try {
      // Execute post-auth trigger to ensure public.profiles record exists
      const triggerResult = await Promise.race([
        handlePostAuthProfileTrigger(user),
        new Promise<{ profile: UserProfile; created: boolean; source: any }>((_, reject) => 
          setTimeout(() => reject(new Error('PostAuthTrigger timeout')), 3000)
        )
      ]);

      const profile = triggerResult.profile;
      if (isRootAdmin) {
        profile.role = 'admin';
      } else if (assigned) {
        profile.role = assigned;
      }
      setCachedUserProfile(profile);
      setUserProfile(profile);
      return profile;
    } catch (e) {
      console.warn('[AuthContext] Profile trigger fallback:', e);
      const effectiveRole: UserRole = isRootAdmin ? 'admin' : (assigned || 'customer');
      const fallback: UserProfile = userProfile || {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || (isRootAdmin ? 'Joshua Egesi' : 'Wholesale Buyer'),
        companyName: isRootAdmin ? 'Eagle Excel Headquarters' : 'Enterprise Buyer',
        photoURL: user.photoURL || (isRootAdmin ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'),
        avatarUrl: user.photoURL || (isRootAdmin ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'),
        role: effectiveRole,
        createdAt: new Date().toISOString(),
        totalSpent: 0,
        ordersCount: 0
      };
      setCachedUserProfile(fallback);
      setUserProfile(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    // 0. Initial sync of server-authoritative role overrides
    fetchServerRoleOverrides().then(() => {
      setUserProfile((prev) => {
        if (!prev) return prev;
        const assigned = getAssignedRole(prev.id, prev.email);
        if (assigned && assigned !== prev.role) {
          const updated = { ...prev, role: assigned, updatedAt: new Date().toISOString() };
          setCachedUserProfile(updated);
          return updated;
        }
        return prev;
      });
    }).catch(() => {});

    // Handler for real-time role change event across all channels
    const handleRoleChangedEvent = (targetUserId?: string, targetEmail?: string, newRole?: UserRole) => {
      if (!newRole) return;
      if (targetUserId) setCachedUserProfile({ id: targetUserId, role: newRole } as any);
      setUserProfile((prev) => {
        if (!prev) return prev;
        const matchesId = targetUserId && (prev.id === targetUserId || prev.id.toLowerCase() === targetUserId.toLowerCase());
        const matchesEmail = targetEmail && prev.email?.toLowerCase() === targetEmail.toLowerCase();
        if (matchesId || matchesEmail) {
          const updated = { ...prev, role: newRole, updatedAt: new Date().toISOString() };
          setCachedUserProfile(updated);
          return updated;
        }
        return prev;
      });
    };

    // Listen on window CustomEvent
    const handleCustomRoleEvent = (e: Event) => {
      const customDetail = (e as CustomEvent)?.detail;
      if (customDetail) {
        handleRoleChangedEvent(customDetail.userId, customDetail.email, customDetail.role);
      }
    };
    window.addEventListener('eagle_excel_user_role_changed', handleCustomRoleEvent);

    // Listen on BroadcastChannel for same-origin cross-tab role sync
    let roleBroadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        roleBroadcastChannel = new BroadcastChannel('eagle_excel_role_sync_channel');
        roleBroadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'USER_ROLE_CHANGED') {
            handleRoleChangedEvent(event.data.userId, event.data.email, event.data.role);
          }
        };
      }
    } catch (e) {}

    // Listen on Server SSE Stream for Cross-Device / Mobile Real-Time Role Sync
    let sseEventSource: EventSource | null = null;
    try {
      sseEventSource = new EventSource('/api/messages/stream?role=customer');
      sseEventSource.addEventListener('user_role_changed', (evt: MessageEvent) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload && payload.userId && payload.role) {
            handleRoleChangedEvent(payload.userId, payload.email, payload.role);
          }
        } catch (e) {}
      });
    } catch (e) {}

    // Listen on Supabase Realtime broadcast channel
    let supabaseSyncChannel: any = null;
    if (isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        supabaseSyncChannel = supabase.channel('ee_global_sync')
          .on('broadcast', { event: 'USER_ROLE_CHANGED' }, (payload: any) => {
            const d = payload?.payload;
            if (d && (d.userId || d.email) && d.role) {
              handleRoleChangedEvent(d.userId, d.email, d.role);
            }
          })
          .subscribe();
      }
    }

    // Refresh role overrides when returning to the tab or app on mobile devices
    const handleVisibilityOrFocus = async () => {
      await fetchServerRoleOverrides().catch(() => {});
      setUserProfile((prev) => {
        if (!prev) return prev;
        const assigned = getAssignedRole(prev.id, prev.email);
        if (assigned && assigned !== prev.role) {
          const updated = { ...prev, role: assigned, updatedAt: new Date().toISOString() };
          setCachedUserProfile(updated);
          return updated;
        }
        return prev;
      });
    };
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const handleAuthEvent = async (userHint?: any, sessionHint?: any) => {
      const supabase = getSupabase();
      if (supabase) {
        try {
          if (sessionHint?.access_token && sessionHint?.refresh_token) {
            try {
              await supabase.auth.setSession({
                access_token: sessionHint.access_token,
                refresh_token: sessionHint.refresh_token,
              });
            } catch (sErr) {
              console.warn('[AuthContext] setSession notice:', sErr);
            }
          }

          const { data } = await supabase.auth.getSession();
          const targetUser = data.session?.user || userHint || sessionHint?.user;
          if (targetUser) {
            const mapped = toAppUser(targetUser);
            if (mapped) {
              setCurrentUser(mapped);
              await ensureProfileDocument(mapped);
            }
          }
        } catch (err) {
          console.warn('Error handling auth sync event:', err);
        }
      }
    };

    // 1. Listen for OAuth popup completion postMessages
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_COMPLETE' || event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const receivedSession = event.data?.session;
        const receivedUser = event.data?.user || receivedSession?.user;
        await handleAuthEvent(receivedUser, receivedSession);
      }
    };
    window.addEventListener('message', handleAuthMessage);

    // 2. Listen on BroadcastChannel for cross-tab / iframe sync
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('eagle_excel_oauth_channel');
        broadcastChannel.onmessage = async (event) => {
          if (event.data?.type === 'SUPABASE_AUTH_COMPLETE') {
            const receivedSession = event.data?.session;
            const receivedUser = event.data?.user || receivedSession?.user;
            await handleAuthEvent(receivedUser, receivedSession);
          }
        };
      }
    } catch (e) {}

    // 3. Listen for localStorage signals from other tabs / popup windows
    const handleStorageEvent = async (e: StorageEvent) => {
      if (e.key === 'ee_oauth_completion_signal' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.success) {
            const receivedSession = parsed?.session;
            const receivedUser = parsed?.user || receivedSession?.user;
            await handleAuthEvent(receivedUser, receivedSession);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    if (!isSupabaseEnabled()) {
      // Standalone mode: restore cached active user profile
      try {
        const lastUserId = localStorage.getItem('ee_last_active_user_id');
        if (lastUserId) {
          const cached = getCachedUserProfile(lastUserId);
          if (cached) {
            setUserProfile(cached);
            setCurrentUser({
              uid: cached.id,
              id: cached.id,
              email: cached.email,
              displayName: cached.displayName,
              photoURL: cached.photoURL || cached.avatarUrl,
              avatarUrl: cached.photoURL || cached.avatarUrl
            });
          }
        }
      } catch {}
      setIsHydrated(true);
      setLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = subscribeToAuthState(async (sbUser) => {
      try {
        if (sbUser) {
          const mappedUser = toAppUser(sbUser)!;
          setCurrentUser(mappedUser);
          const isRootAdmin = mappedUser.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();

          // 1. Instant optimistic profile from cache or synthetic fallback for 0ms delay
          const cached = getCachedUserProfile(mappedUser.uid);
          const immediateProfile: UserProfile = cached || {
            id: mappedUser.uid,
            email: mappedUser.email || '',
            displayName: cached?.displayName || mappedUser.displayName || (isRootAdmin ? 'Joshua Egesi' : 'Wholesale Buyer'),
            companyName: isRootAdmin ? 'Eagle Excel Headquarters' : 'Enterprise Buyer',
            photoURL: mappedUser.photoURL || (isRootAdmin ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'),
            avatarUrl: mappedUser.photoURL || (isRootAdmin ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'),
            role: isRootAdmin ? 'admin' : (cached?.role === 'admin' ? 'admin' : 'customer'),
            title: isRootAdmin ? 'Executive Managing Director' : 'Senior Procurement Specialist',
            createdAt: cached?.createdAt || new Date().toISOString(),
            totalSpent: cached?.totalSpent || 0,
            ordersCount: cached?.ordersCount || 0
          };

          setUserProfile(immediateProfile);
          setIsHydrated(true);
          setLoading(false);
          try {
            localStorage.setItem('ee_last_active_user_id', immediateProfile.id);
          } catch {}

          // 2. Attach real-time listener for live profile & avatar sync
          if (unsubscribeProfile) unsubscribeProfile();
          unsubscribeProfile = subscribeToUserProfile(mappedUser.uid, (liveProfile) => {
            if (liveProfile) {
              setCachedUserProfile(liveProfile);
              setUserProfile(liveProfile);
            }
          });

          // 3. Asynchronously ensure profile document exists in background
          ensureProfileDocument(mappedUser).then((p) => {
            setCachedUserProfile(p);
            setUserProfile(p);
          }).catch(() => {});

        } else {
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }
          setCurrentUser(null);
          setUserProfile(null);
          setIsHydrated(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth state initialization error:', err);
        setIsHydrated(true);
        setLoading(false);
      }
    });

    return () => {
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('eagle_excel_user_role_changed', handleCustomRoleEvent);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (sseEventSource) {
        try { sseEventSource.close(); } catch (e) {}
      }
      if (supabaseSyncChannel && isSupabaseEnabled()) {
        try { getSupabase()?.removeChannel(supabaseSyncChannel); } catch (e) {}
      }
      if (broadcastChannel) {
        try { broadcastChannel.close(); } catch (e) {}
      }
      if (roleBroadcastChannel) {
        try { roleBroadcastChannel.close(); } catch (e) {}
      }
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string): Promise<UserProfile> => {
    const trimmedEmail = (email || '').trim();
    if (!isSupabaseEnabled()) {
      throw new Error('Supabase authentication is not configured. Please enter your Supabase URL and Anon Key in Database Settings.');
    }

    const authResult = await loginWithEmailAndPassword(trimmedEmail, pass);
    if (!authResult.user) {
      throw new Error('Authentication failed. No user returned.');
    }
    const appUser = toAppUser(authResult.user)!;
    const profile = await ensureProfileDocument(appUser);
    return profile;
  }, []);

  const signupWithEmail = useCallback(async (
    email: string, 
    pass: string, 
    name: string, 
    companyName?: string
  ): Promise<UserProfile> => {
    const trimmedEmail = (email || '').trim();
    if (!isSupabaseEnabled()) {
      throw new Error('Supabase authentication is not configured. Please enter your Supabase URL and Anon Key in Database Settings.');
    }

    const isRootAdmin = trimmedEmail.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
    const finalRole: UserRole = isRootAdmin ? 'admin' : 'customer';
    const finalDisplayName = (name || '').trim() || (isRootAdmin ? 'Joshua Egesi' : 'Wholesale Buyer');

    const authResult = await registerWithEmailAndPassword(trimmedEmail, pass, finalDisplayName);
    const userId = authResult.user?.id || `usr_${Date.now()}`;

    const newProfile: UserProfile = {
      id: userId,
      email: trimmedEmail,
      displayName: finalDisplayName,
      companyName: companyName ? companyName.trim() : (finalRole === 'admin' ? 'Eagle Excel Operations' : 'Wholesale Procurement Co.'),
      role: finalRole,
      photoURL: isRootAdmin ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      avatarUrl: isRootAdmin ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      ordersCount: 0
    };

    await saveUserProfile(newProfile);
    setCachedUserProfile(newProfile);
    setUserProfile(newProfile);
    if (authResult.user) {
      setCurrentUser(toAppUser(authResult.user));
    }
    return newProfile;
  }, []);

  const loginWithGoogle = useCallback(async (options?: { redirectTo?: string }): Promise<void> => {
    if (!isSupabaseEnabled()) {
      throw new Error('Supabase authentication is not configured. Please enter your Supabase URL and Anon Key in Database Settings.');
    }
    await loginWithGoogleOAuth(options);
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<void> => {
    if (!isSupabaseEnabled()) {
      throw new Error('Supabase authentication is not configured. Please enter your Supabase URL and Anon Key in Database Settings.');
    }
    await sendPasswordReset((email || '').trim());
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await logoutUser();
    localStorage.removeItem('ee_last_active_user_id');
    localStorage.removeItem('ee_cached_notifications');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ee_notification_update', { detail: { timestamp: Date.now() } }));
      window.dispatchEvent(new CustomEvent('ee_customer_unread_count', { detail: { count: 0 } }));
    }
    setCurrentUser(null);
    setUserProfile(null);
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (currentUser) {
      await ensureProfileDocument(currentUser);
    }
  }, [currentUser]);

  const updateProfileData = useCallback(async (updates: Partial<UserProfile>): Promise<void> => {
    if (!currentUser) return;
    const existing = userProfile || {
      id: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || 'Wholesale Buyer',
      role: 'customer' as UserRole,
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      ordersCount: 0
    };
    const updated: UserProfile = { 
      ...existing, 
      ...updates, 
      id: currentUser.uid,
      updatedAt: new Date().toISOString() 
    };
    
    // Immediately update local state for instantaneous UI responsiveness
    setUserProfile(updated);
    setCachedUserProfile(updated);

    // Sync Supabase Auth's user metadata
    if (updates.displayName || updates.photoURL) {
      try {
        await updateAuthUserProfile({
          ...(updates.displayName ? { displayName: updates.displayName } : {}),
          ...(updates.photoURL ? { photoURL: updates.photoURL } : {})
        });
      } catch (authErr) {
        console.warn('Could not update Supabase Auth user metadata:', authErr);
      }
    }
    
    // Save to Supabase & local storage
    await saveUserProfile(updated);
  }, [currentUser, userProfile]);

  const effectiveRole: UserRole = userProfile?.role || 'customer';
  const isAdmin = effectiveRole === 'admin';

  const syncPostAuthProfile = useCallback(async (user?: AppUser | null): Promise<UserProfile | null> => {
    const targetUser = user || currentUser;
    if (!targetUser) return null;
    return await ensureProfileDocument(targetUser);
  }, [currentUser]);

  const contextValue = React.useMemo(() => ({
    currentUser,
    userProfile,
    role: effectiveRole,
    isAdmin,
    loading,
    isHydrated,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    sendPasswordResetEmail,
    logout,
    refreshProfile,
    syncPostAuthProfile,
    updateProfileData,
    setSimulatedRole: () => {}
  }), [
    currentUser,
    userProfile,
    effectiveRole,
    isAdmin,
    loading,
    isHydrated,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    sendPasswordResetEmail,
    logout,
    refreshProfile,
    syncPostAuthProfile,
    updateProfileData
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
