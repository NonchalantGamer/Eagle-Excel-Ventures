import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles, 
  Eye, 
  EyeOff,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useTheme } from '../context/ThemeContext';
import { getBrandLogo } from '../constants/branding';
import { UserRole } from '../types';
import { isSupabaseEnabled } from '../lib/supabase';
import { parseAuthErrorMessage } from '../services/authService';
import { useModalFocusLock } from '../hooks/useModalFocusLock';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
  defaultRole?: UserRole;
  onLoginSuccess?: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useModalFocusLock(isOpen, () => {
    if (!isLoading && !isGoogleLoading) onClose();
  });

  const { 
    currentUser, 
    userProfile, 
    isHydrated, 
    loginWithEmail, 
    signupWithEmail, 
    loginWithGoogle,
    sendPasswordResetEmail
  } = useAuth();
  const { showToast } = useToast();
  const { isDark } = useTheme();

  // Sync initialMode prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  // Auto-close modal when user is successfully authenticated
  useEffect(() => {
    if (isOpen && currentUser) {
      setIsGoogleLoading(false);
      setIsLoading(false);
      onLoginSuccess?.(userProfile?.role || 'customer');
      onClose();
    }
  }, [isOpen, currentUser, userProfile?.role, onClose, onLoginSuccess]);

  // Lock body scroll when auth modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const profile = await loginWithEmail(email.trim(), password);
        showToast(`Welcome back, ${profile.displayName}!`);
        onClose();
        onLoginSuccess?.(profile.role);
      } else if (mode === 'signup') {
        const profile = await signupWithEmail(
          email.trim(), 
          password, 
          name.trim(), 
          companyName.trim()
        );
        showToast(`Account successfully registered for ${profile.displayName}!`);
        onClose();
        onLoginSuccess?.(profile.role);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setErrorMsg('Please enter your registered email address.');
          setIsLoading(false);
          return;
        }
        await sendPasswordResetEmail(email.trim());
        setSuccessMsg(`Password reset link sent to ${email.trim()}. Please check your email inbox.`);
        showToast('Password reset email dispatched!');
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      const parsed = parseAuthErrorMessage(err);
      setErrorMsg(parsed.message || 'Authentication request failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleLoading(true);

    try {
      if (!isSupabaseEnabled()) {
        throw new Error('Supabase authentication service is currently unavailable. Please try email login or contact support.');
      }
      await loginWithGoogle();
      setSuccessMsg('Google sign-in popup opened. Please complete authentication in the popup window.');
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const parsed = parseAuthErrorMessage(err);
      setErrorMsg(parsed.message || 'Google Sign-In could not be initiated. Please check your credentials or network connection.');
      setIsGoogleLoading(false);
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading && !isGoogleLoading) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-lg w-full overflow-hidden transition-all text-slate-900 dark:text-zinc-100 max-h-[92vh] flex flex-col animate-scaleUp">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-[#0d0d0d] p-6 relative border-b border-slate-200 dark:border-white/5 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close modal"
            disabled={isLoading || isGoogleLoading}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors btn-hover cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl brand-logo-badge flex items-center justify-center p-1.5 shrink-0">
              <img 
                src={getBrandLogo(isDark)} 
                alt="Eagle Excel Ventures" 
                className="w-full h-full object-contain brand-logo-img"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#F27D26] flex items-center gap-1.5">
                Eagle Excel Ventures <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">Direct Wholesale & Enterprise Procurement Network</div>
            </div>
          </div>

          <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
            {mode === 'login' && 'Sign In to Wholesale Portal'}
            {mode === 'signup' && 'Register New Wholesale Buyer'}
            {mode === 'forgot' && 'Reset Your Account Password'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
            {mode === 'login' && 'Access enterprise tiered pricing, factory freight containers, and direct PO dispatch.'}
            {mode === 'signup' && 'Create your enterprise purchasing account with verified wholesale rates.'}
            {mode === 'forgot' && 'Enter your registered email address and we will send you a password reset link.'}
          </p>

          {/* Tab Switcher (Visible in login and signup modes) */}
          {mode !== 'forgot' && (
            <div className="flex bg-slate-200 dark:bg-[#181818] p-1 rounded-xl mt-4 text-xs font-bold border border-slate-300 dark:border-white/5">
              <button
                type="button"
                id="tab-signin-btn"
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-lg transition-all btn-hover cursor-pointer ${
                  mode === 'login' ? 'bg-[#F27D26] text-black font-extrabold shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-signup-btn"
                onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-lg transition-all btn-hover cursor-pointer ${
                  mode === 'signup' ? 'bg-[#F27D26] text-black font-extrabold shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto overscroll-contain flex-1">
          
          {/* Error Notice */}
          {errorMsg && (
            <div className="p-4 rounded-2xl border text-xs space-y-2 bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="space-y-1 flex-1">
                  <p className="font-bold text-[13px]">Authentication Notice</p>
                  <p className="leading-relaxed opacity-90">{errorMsg}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Notice */}
          {successMsg && (
            <div className="p-4 rounded-2xl border text-xs space-y-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div className="space-y-1 flex-1">
                  <p className="font-bold text-[13px]">Action Complete</p>
                  <p className="leading-relaxed opacity-90">{successMsg}</p>
                </div>
              </div>
            </div>
          )}

          {/* Google Sign-In Button (shown for login/signup) */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-zinc-100 text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 btn-hover"
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting to Google OAuth...' : 'Continue with Google'}</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 dark:border-white/10 w-full"></div>
                <span className="bg-white dark:bg-[#121212] px-3 text-[11px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold absolute">
                  or with email & password
                </span>
              </div>
            </>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Full Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Joshua Egesi"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Business / Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="e.g. Eagle Excel Ventures or Wholesale Trading Ltd"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Business Email Address <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="buyer@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-[11px] text-[#F27D26] hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              id="auth-submit-btn"
              disabled={isLoading || isGoogleLoading}
              className="w-full btn-primary-morphic text-black font-extrabold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-60 btn-hover cursor-pointer shadow-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In to Portal'}
                  {mode === 'signup' && 'Complete Registration'}
                  {mode === 'forgot' && 'Send Password Reset Link'}
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Back to Sign In Link if in forgot password mode */}
          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-slate-600 dark:text-zinc-400 hover:text-[#F27D26] font-medium flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  ) : null;
};

export default AuthModal;
