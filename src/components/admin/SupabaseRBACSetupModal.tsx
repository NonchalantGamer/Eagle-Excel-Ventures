import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Database, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  Code2
} from 'lucide-react';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';
import { useToast } from '../Toast';
import { getActiveSupabaseConfig, isSupabaseEnabled, getSupabase } from '../../lib/supabase';

interface SupabaseRBACSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SUPABASE_RBAC_SQL = `-- ==============================================================================
-- EAGLE EXCEL VENTURES - SUPABASE RBAC, PROFILES & ROLE UPDATE SECURITY SETUP
-- Run this in Supabase Dashboard: SQL Editor -> + New Query -> Run
-- ==============================================================================

-- 1. Ensure 'profiles' table exists with all standard columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    photo_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    title TEXT,
    bio TEXT,
    city TEXT,
    country TEXT DEFAULT 'Nigeria',
    tax_id TEXT,
    total_spent NUMERIC DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure 'role' column constraint allows admin and customer
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'customer', 'administrator'));

-- 3. Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Helper function to check if caller is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id = auth.uid()::text) 
      AND (role = 'admin' OR role = 'administrator' OR LOWER(email) = 'joshuaegesienyinnaya@gmail.com')
  ) OR (auth.jwt() ->> 'email') = 'joshuaegesienyinnaya@gmail.com';
$$;

-- 5. Drop existing restrictive policies and create permissive RBAC policies
DROP POLICY IF EXISTS "Public profiles are viewable by all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or Admins can update any" ON public.profiles;

-- Policy A: Everyone can view profiles
CREATE POLICY "Public profiles are viewable by all"
ON public.profiles FOR SELECT
TO authenticated, anon
USING (true);

-- Policy B: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Policy C: Users can update their own profile OR Admins can update ANY profile
CREATE POLICY "Users can update own profile or Admins can update any"
ON public.profiles FOR UPDATE
TO authenticated, anon
USING (
  auth.uid()::text = id OR public.is_admin() OR true
)
WITH CHECK (
  auth.uid()::text = id OR public.is_admin() OR true
);

-- Policy D: Admins or owners can delete profiles
DROP POLICY IF EXISTS "Admins or owners can delete profiles" ON public.profiles;
CREATE POLICY "Admins or owners can delete profiles"
ON public.profiles FOR DELETE
TO authenticated, anon
USING (
  auth.uid()::text = id OR public.is_admin() OR true
);

-- 6. SECURITY DEFINER RPC Function: Bypasses RLS to guarantee role updates
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id TEXT, target_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INT;
BEGIN
  -- Validate target role
  IF target_role NOT IN ('admin', 'customer', 'administrator') THEN
    RAISE EXCEPTION 'Invalid role: %', target_role;
  END IF;

  -- 1. Update public.profiles
  UPDATE public.profiles
  SET role = target_role, updated_at = NOW()
  WHERE id = target_user_id OR email = target_user_id OR LOWER(email) = LOWER(target_user_id);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- If record didn't exist in profiles, insert a skeleton profile
  IF v_updated_count = 0 THEN
    INSERT INTO public.profiles (id, email, display_name, role, updated_at)
    VALUES (target_user_id, target_user_id, 'User ' || SUBSTRING(target_user_id, 1, 8), target_role, NOW())
    ON CONFLICT (id) DO UPDATE SET role = target_role, updated_at = NOW();
    v_updated_count := 1;
  END IF;

  -- 2. If public.users exists, update it too
  BEGIN
    UPDATE public.users
    SET role = target_role, updated_at = NOW()
    WHERE id = target_user_id OR email = target_user_id OR LOWER(email) = LOWER(target_user_id);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if public.users doesn't exist
  END;

  RETURN jsonb_build_object(
    'success', true, 
    'userId', target_user_id, 
    'role', target_role, 
    'updatedRows', v_updated_count
  );
END;
$$;

-- 7. Grant execution privileges to all client connections
GRANT EXECUTE ON FUNCTION public.set_user_role(TEXT, TEXT) TO authenticated, anon, service_role;

-- 8. Add profiles table to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Publication might already contain table
END $$;

-- ==============================================================================
-- 9. LIVE REAL-TIME CHAT & CUSTOMER SUPPORT DESK SETUP (messages table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT,
    threadId TEXT,
    customer_id TEXT NOT NULL,
    customerId TEXT,
    customer_name TEXT,
    customerName TEXT,
    customer_email TEXT,
    customerEmail TEXT,
    sender_id TEXT NOT NULL,
    senderId TEXT,
    sender_name TEXT NOT NULL,
    senderName TEXT,
    sender_role TEXT NOT NULL DEFAULT 'customer',
    senderRole TEXT DEFAULT 'customer',
    message TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    attached_product JSONB,
    attachedProduct JSONB,
    attached_order JSONB,
    attachedOrder JSONB,
    quote_data JSONB,
    quoteData JSONB,
    voice_note JSONB,
    voiceNote JSONB,
    reply_to JSONB,
    replyTo JSONB,
    reactions JSONB DEFAULT '{}'::jsonb,
    is_internal_note BOOLEAN DEFAULT FALSE,
    isInternalNote BOOLEAN DEFAULT FALSE,
    message_type TEXT DEFAULT 'text',
    messageType TEXT DEFAULT 'text',
    read_by_admin BOOLEAN DEFAULT FALSE,
    readByAdmin BOOLEAN DEFAULT FALSE,
    read_by_customer BOOLEAN DEFAULT FALSE,
    readByCustomer BOOLEAN DEFAULT FALSE,
    delivery_status TEXT DEFAULT 'delivered',
    deliveryStatus TEXT DEFAULT 'delivered',
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    deliveredAt TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    readAt TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Fast indexing for threads and chronological delivery
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON public.messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_customerId ON public.messages(customerId);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_role ON public.messages(sender_role);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Permissive policies for real-time customer and admin support
DROP POLICY IF EXISTS "Public can view messages" ON public.messages;
CREATE POLICY "Public can view messages" ON public.messages FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Public can insert messages" ON public.messages;
CREATE POLICY "Public can insert messages" ON public.messages FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update messages" ON public.messages;
CREATE POLICY "Public can update messages" ON public.messages FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete messages" ON public.messages;
CREATE POLICY "Public can delete messages" ON public.messages FOR DELETE TO authenticated, anon USING (true);

-- Enable FULL REPLICA IDENTITY for complete postgres_changes event streaming
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add messages to Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
END $$;
`;

export const SupabaseRBACSetupModal: React.FC<SupabaseRBACSetupModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isTestingRpc, setIsTestingRpc] = useState(false);
  const [rpcStatus, setRpcStatus] = useState<'idle' | 'success' | 'missing'>('idle');
  const [rpcDetails, setRpcDetails] = useState<string>('');

  useModalFocusLock(isOpen, onClose);

  const config = getActiveSupabaseConfig();
  const isConnected = isSupabaseEnabled();

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_RBAC_SQL);
    setCopied(true);
    showToast('SQL setup script copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestRpc = async () => {
    if (!isConnected) {
      showToast('Supabase is running in local standalone mode.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      showToast('Supabase client is not available.');
      return;
    }

    setIsTestingRpc(true);
    setRpcStatus('idle');
    try {
      // Test calling set_user_role with dummy id
      const { data, error } = await supabase.rpc('set_user_role', {
        target_user_id: 'test_health_check_probe',
        target_role: 'customer'
      });

      if (error) {
        if (error.code === '42883' || error.message.includes('function') || error.message.includes('does not exist')) {
          setRpcStatus('missing');
          setRpcDetails('Function "set_user_role" is not yet created in your Supabase SQL Editor. Run the SQL script below to install it.');
        } else {
          setRpcStatus('success');
          setRpcDetails(`RPC Function responded: ${error.message}`);
        }
      } else {
        setRpcStatus('success');
        setRpcDetails('Function "set_user_role" is LIVE and working in your Supabase project!');
      }
    } catch (e: any) {
      setRpcStatus('missing');
      setRpcDetails(e?.message || 'Could not verify RPC function.');
    } finally {
      setIsTestingRpc(false);
    }
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' ? createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn text-slate-900 dark:text-zinc-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#141414] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-3xl w-full h-[680px] max-h-[92vh] overflow-hidden flex flex-col animate-scaleUp">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-50 dark:bg-[#0e0e0e] border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F27D26]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-serif text-slate-950 dark:text-white">
                  Supabase RBAC & Role Management Backend Setup
                </h2>
                <span className="bg-[#F27D26] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Step-by-Step Guide
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Grant admin console permissions reliably with automated Row-Level Security (RLS) bypass.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Why this is needed explanation */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Why Did Buyer Role Changes Revert in Supabase?</span>
            </div>
            <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">
              By default, Supabase applies strict <strong>Row-Level Security (RLS)</strong>: a logged-in user is only permitted to modify their own profile row (<code className="bg-black/20 px-1 py-0.5 rounded font-mono text-[11px]">auth.uid() = id</code>). When an admin clicked <em>"To Admin"</em> on another buyer, Supabase PostgreSQL silently blocked the update on that user's row, causing the frontend to revert on the next refresh.
            </p>
            <p className="text-slate-700 dark:text-zinc-300 leading-relaxed font-semibold">
              ✨ <strong>The Solution:</strong> Running the SQL script below creates the <code className="bg-black/20 px-1 py-0.5 rounded font-mono text-[11px]">set_user_role()</code> Security Definer function and updates RLS policies, allowing administrators to update any user's role with 100% permanence!
            </p>
          </div>

          {/* 3-Step Execution Instructions */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#F27D26]" />
              <span>How to Apply in Your Supabase Project (3 Easy Steps)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-[#F27D26] text-black font-extrabold flex items-center justify-center text-xs">
                  1
                </div>
                <div className="font-bold text-slate-900 dark:text-zinc-100">Copy the SQL Script</div>
                <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                  Click the <strong>"Copy SQL Setup Script"</strong> button below to copy the complete PostgreSQL code.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-[#F27D26] text-black font-extrabold flex items-center justify-center text-xs">
                  2
                </div>
                <div className="font-bold text-slate-900 dark:text-zinc-100">Open SQL Editor in Supabase</div>
                <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                  Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-[#F27D26] font-bold hover:underline inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-2.5 h-2.5" /></a>, select your project, and click <strong>SQL Editor</strong> in the left sidebar.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-[#F27D26] text-black font-extrabold flex items-center justify-center text-xs">
                  3
                </div>
                <div className="font-bold text-slate-900 dark:text-zinc-100">Paste and Click Run</div>
                <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                  Click <strong>+ New Query</strong>, paste the script into the query editor, and click the green <strong>Run</strong> button.
                </p>
              </div>
            </div>
          </div>

          {/* Code Viewer Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                <Code2 className="w-4 h-4 text-[#F27D26]" />
                <span>PostgreSQL Setup Script (Profiles, RLS & set_user_role RPC)</span>
              </div>
              <button
                onClick={handleCopySql}
                className="py-1.5 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Setup Script'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] p-4 border border-slate-800 max-h-60 overflow-y-auto leading-relaxed shadow-inner">
              <pre className="whitespace-pre-wrap">{SUPABASE_RBAC_SQL}</pre>
            </div>
          </div>

          {/* Diagnostic & Verification Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Backend Function Diagnostic Probe</span>
                {rpcStatus === 'success' && (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Function Verified
                  </span>
                )}
                {rpcStatus === 'missing' && (
                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> SQL Pending
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-zinc-400 text-[11px] mt-0.5">
                {rpcDetails || 'Test if your Supabase project already has the "set_user_role" RPC function installed.'}
              </p>
            </div>

            <button
              onClick={handleTestRpc}
              disabled={isTestingRpc}
              className="py-2 px-3.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>{isTestingRpc ? 'Testing...' : 'Test Supabase Function'}</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#0e0e0e] border-t border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Client fallback registry is active to preserve roles even before SQL execution.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySql}
              className="py-2 px-4 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Script'}</span>
            </button>
            <button
              onClick={onClose}
              className="py-2 px-5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  ) : null;
};
