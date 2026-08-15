import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Sparkles, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { getSupabase, isSupabaseEnabled } from '../../lib/supabase';
import { getBrandLogo } from '../../constants/branding';
import { handlePostAuthProfileTrigger } from '../../services/postAuthTrigger';
import { loginWithGoogleOAuth } from '../../services/authService';

export const isOAuthCallbackOrPopup = (): boolean => {
  if (typeof window === 'undefined') return false;

  const pathname = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  const isCallbackPath = pathname.startsWith('/auth/callback') || pathname === '/auth/callback';
  const hasTokensInHash = hash.includes('access_token=') || hash.includes('refresh_token=');
  const hasAuthCodeInSearch = search.includes('code=') && (isCallbackPath || search.includes('state=') || hash.includes('state='));
  const hasErrorInUrl = (search.includes('error=') || hash.includes('error=')) && isCallbackPath;

  // Only intercept when explicitly on callback path or carrying OAuth response parameters
  return isCallbackPath || hasTokensInHash || hasAuthCodeInSearch || hasErrorInUrl;
};

interface OAuthCallbackHandlerProps {
  onComplete?: () => void;
}

export const OAuthCallbackHandler: React.FC<OAuthCallbackHandlerProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('eev_theme');
      return stored === 'dark' || (stored !== 'light' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    }
    return true;
  });

  const notifyParentAndClose = (sessionData?: any) => {
    const user = sessionData?.user;
    const serializableSession = sessionData ? {
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      expires_at: sessionData.expires_at,
      user: sessionData.user,
    } : null;

    const targetHomeUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/#/` 
      : 'https://eagle-excel-ventures.vercel.app/#/';

    // 1. PostMessage to window.opener if available
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'SUPABASE_AUTH_COMPLETE', 
          session: serializableSession,
          user: user,
          redirectToHome: true,
          targetHomeUrl
        }, '*');
        window.opener.postMessage({ 
          type: 'OAUTH_AUTH_SUCCESS', 
          session: serializableSession,
          user: user,
          redirectToHome: true,
          targetHomeUrl
        }, '*');
        window.opener.postMessage({
          type: 'NAVIGATE_VIEW',
          view: 'home'
        }, '*');
      }
    } catch (e) {
      console.warn('[OAuthCallback] Could not postMessage to window.opener:', e);
    }

    // 2. PostMessage to parent (for iframe scenarios)
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'SUPABASE_AUTH_COMPLETE',
          session: serializableSession,
          user: user,
          redirectToHome: true,
          targetHomeUrl
        }, '*');
      }
    } catch (e) {}

    // 3. BroadcastChannel for cross-window / cross-tab / iframe communication
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('eagle_excel_oauth_channel');
        channel.postMessage({
          type: 'SUPABASE_AUTH_COMPLETE',
          timestamp: Date.now(),
          session: serializableSession,
          user: user,
          redirectToHome: true,
          targetHomeUrl
        });
        setTimeout(() => {
          try { channel.close(); } catch {}
        }, 1500);
      }
    } catch (e) {
      console.warn('[OAuthCallback] BroadcastChannel error:', e);
    }

    // 4. LocalStorage storage event (fires automatically in all other tabs/windows on same origin)
    try {
      localStorage.setItem('ee_oauth_completion_signal', JSON.stringify({
        timestamp: Date.now(),
        success: true,
        session: serializableSession,
        user: user,
        userId: user?.id || null,
        redirectToHome: true,
        targetHomeUrl
      }));
      if (user?.id) {
        localStorage.setItem('ee_last_active_user_id', user.id);
      }
      localStorage.setItem('eagle_excel_active_page_view', 'home');
    } catch (e) {
      console.warn('[OAuthCallback] LocalStorage signal error:', e);
    }

    // 5. Clean up window name and session storage popup indicators
    try {
      window.name = '';
      sessionStorage.removeItem('ee_is_oauth_popup');
    } catch (e) {}

    // 6. Try to focus opener and close popup window
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.focus();
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 600);
      }
    } catch (e) {
      // Ignore focus errors
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let authUnsubscribe: (() => void) | null = null;
    let isFinished = false;

    const onAuthSuccess = async (session: any) => {
      if (isFinished || !session?.user) return;
      isFinished = true;

      setAuthenticatedUser(session.user);
      setStatus('success');

      // Trigger post-auth user profile initialization and database upsert
      try {
        await handlePostAuthProfileTrigger(session.user);
      } catch (pErr) {
        console.warn('[OAuthCallback] Profile trigger warning:', pErr);
      }

      // Clean URL history state without reloading
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname.replace(/\/auth\/callback\/?$/, '') || '/');
        }
      } catch {}

      // Notify parent window, cross-tab channels, and storage
      notifyParentAndClose(session);

      // Countdown timer to auto-close popup or redirect
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            handleReturnToWebsite();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const processAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        
        // 1. Check for error in hash or query parameters
        const errorParam = urlParams.get('error') || hashParams.get('error');
        const errorDesc = urlParams.get('error_description') || hashParams.get('error_description') || errorParam;

        if (errorDesc) {
          const decoded = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
          setStatus('error');
          if (decoded.includes('access_denied') || decoded.includes('user_cancelled')) {
            setErrorMessage('Google authentication was cancelled. You can try signing in again whenever you are ready.');
          } else {
            setErrorMessage(decoded);
          }
          return;
        }

        const code = urlParams.get('code');
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');

        if (isSupabaseEnabled()) {
          const supabase = getSupabase();
          if (supabase) {
            // Subscribe to onAuthStateChange to catch SDK-resolved sessions immediately
            const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
              if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
                await onAuthSuccess(session);
              }
            });
            authUnsubscribe = () => authSub.subscription.unsubscribe();

            // A. If PKCE auth code is in query params, exchange it for a session
            if (code) {
              try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (!error && data?.session) {
                  await onAuthSuccess(data.session);
                  return;
                } else if (error) {
                  console.warn('[OAuthCallback] exchangeCodeForSession warning:', error.message);
                }
              } catch (err) {
                console.warn('[OAuthCallback] exchangeCodeForSession exception:', err);
              }
            }

            // B. If implicit tokens in hash / query params
            if (accessToken) {
              try {
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || '',
                });
                if (!error && data?.session) {
                  await onAuthSuccess(data.session);
                  return;
                }
              } catch (err) {
                console.warn('[OAuthCallback] setSession exception:', err);
              }
            }

            // C. Polling verification for up to 15 attempts (4.5s)
            for (let i = 0; i < 15; i++) {
              if (isFinished) return;
              const { data } = await supabase.auth.getSession();
              if (data?.session?.user) {
                await onAuthSuccess(data.session);
                return;
              }
              await new Promise(r => setTimeout(r, 300));
            }
          }
        }

        if (!isFinished) {
          setStatus('error');
          setErrorMessage('Could not establish an active Google authentication session. Please verify your connection or try signing in again.');
        }

      } catch (err: any) {
        console.error('[OAuthCallback] Authentication error:', err);
        if (!isFinished) {
          setStatus('error');
          setErrorMessage(err?.message || 'Failed to complete Google authentication.');
        }
      }
    };

    processAuth();

    return () => {
      if (timer) clearInterval(timer);
      if (authUnsubscribe) authUnsubscribe();
    };
  }, []);

  const handleReturnToWebsite = () => {
    // 1. Clear window.name and popup state
    try {
      window.name = '';
      sessionStorage.removeItem('ee_is_oauth_popup');
      localStorage.setItem('eagle_excel_active_page_view', 'home');
    } catch (e) {}

    const targetHomeUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/#/` 
      : 'https://eagle-excel-ventures.vercel.app/#/';

    // 2. Attempt to notify and focus opener if this is a popup
    try {
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', redirectToHome: true }, '*');
          window.opener.postMessage({ type: 'NAVIGATE_VIEW', view: 'home' }, '*');
          if (window.opener.location) {
            window.opener.location.hash = '#/';
          }
        } catch (e) {}
        window.opener.focus();
        window.close();
        return;
      }
    } catch (e) {}

    try {
      window.close();
    } catch (e) {}

    // 3. Clean URL history state to root homescreen
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, targetHomeUrl);
      }
    } catch {}

    // 4. If callback prop provided, transition directly in-place without page reload
    if (onComplete) {
      onComplete();
      return;
    }

    // 5. Fallback navigation
    try {
      window.location.hash = '#/';
    } catch (e) {
      window.location.href = targetHomeUrl;
    }
  };

  const userDisplayName = authenticatedUser?.user_metadata?.full_name || 
    authenticatedUser?.user_metadata?.name || 
    authenticatedUser?.email?.split('@')[0] || 
    'Wholesale Partner';

  const userAvatar = authenticatedUser?.user_metadata?.avatar_url || 
    authenticatedUser?.user_metadata?.picture;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 ${isDark ? 'dark bg-[#0a0a0a] text-zinc-100' : 'bg-slate-50 text-slate-900'} font-sans select-none antialiased`}>
      <div className="w-full max-w-md bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 shadow-2xl text-center space-y-6 animate-scaleUp">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl brand-logo-badge flex items-center justify-center p-2 shadow-inner bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <img 
              src={getBrandLogo(isDark)} 
              alt="Eagle Excel Ventures" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-left">
            <span className="text-xs font-black uppercase tracking-wider text-[#F27D26] flex items-center gap-1.5">
              Eagle Excel Ventures <Sparkles className="w-3.5 h-3.5" />
            </span>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Wholesale & Enterprise Portal</div>
          </div>
        </div>

        {/* Status: Loading */}
        {status === 'loading' && (
          <div className="space-y-4 py-4">
            <div className="w-14 h-14 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin mx-auto shadow-md" />
            <h2 className="text-lg font-bold font-serif text-slate-900 dark:text-white">
              Completing Google Authentication...
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
              Securing your session with Eagle Excel. Please wait a moment...
            </p>
          </div>
        )}

        {/* Status: Success */}
        {status === 'success' && (
          <div className="space-y-5 py-2 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full mx-auto flex items-center justify-center border border-emerald-500/30 shadow-lg">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                Sign-In Successful!
              </h2>
              <p className="text-xs text-slate-600 dark:text-zinc-300 max-w-xs mx-auto leading-relaxed">
                Welcome back, <span className="font-bold text-[#F27D26]">{userDisplayName}</span>. Your session has been verified.
              </p>
            </div>

            {/* Authenticated User Preview Card */}
            {authenticatedUser && (
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3 text-left">
                {userAvatar ? (
                  <img src={userAvatar} alt={userDisplayName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#F27D26]/40" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#F27D26]/20 text-[#F27D26] flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{userDisplayName}</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{authenticatedUser.email}</div>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-zinc-400">
              Returning you to Eagle Excel homescreen in <span className="font-bold text-[#F27D26]">{countdown}s</span>...
            </div>

            <button
              onClick={handleReturnToWebsite}
              className="w-full btn-primary-morphic text-black font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Return to Homescreen</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Status: Error */}
        {status === 'error' && (
          <div className="space-y-4 py-2 animate-fadeIn">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full mx-auto flex items-center justify-center border border-rose-500/30 shadow-lg">
              <AlertTriangle className="w-9 h-9" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                Authentication Notice
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 max-w-xs mx-auto leading-relaxed">
                {errorMessage || 'Google authentication was cancelled or could not be completed.'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={async () => {
                  setStatus('loading');
                  setErrorMessage(null);
                  try {
                    await loginWithGoogleOAuth();
                  } catch (e: any) {
                    setStatus('error');
                    setErrorMessage(e?.message || 'Unable to re-launch Google sign in.');
                  }
                }}
                className="w-full btn-primary-morphic text-black font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again with Google</span>
              </button>

              <button
                onClick={handleReturnToWebsite}
                className="w-full py-3 px-6 rounded-2xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-900 dark:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close & Return to Homescreen
              </button>
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-400 dark:text-zinc-500">
          Eagle Excel Ventures • Enterprise Sourcing & Direct PO Network
        </div>
      </div>
    </div>
  );
};
