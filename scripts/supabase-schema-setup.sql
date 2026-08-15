-- ==============================================================================
-- EAGLE EXCEL B2B WHOLESALE • COMPLETE SUPABASE DATABASE SETUP SCRIPT
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project: btbcjijnrcnoutqskrtv
-- 3. Click on "SQL Editor" in the left-hand navigation sidebar.
-- 4. Click "+ New Query" (top left of the SQL Editor).
-- 5. Paste the entire content of this script and click the green "Run" button.
-- ==============================================================================

-- 1. Create the 'messages' table (Real-Time Live Support Chat & B2B Inquiries)
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT,
  customer_id TEXT NOT NULL,
  customer_name TEXT DEFAULT 'Wholesale Buyer',
  customer_email TEXT,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'customer',
  message TEXT NOT NULL DEFAULT '',
  attachments JSONB DEFAULT '[]'::jsonb,
  attached_product JSONB,
  attached_order JSONB,
  quote_data JSONB,
  voice_note JSONB,
  reply_to JSONB,
  reactions JSONB DEFAULT '{}'::jsonb,
  is_internal_note BOOLEAN DEFAULT false,
  message_type TEXT DEFAULT 'text',
  read_by_admin BOOLEAN DEFAULT false,
  read_by_customer BOOLEAN DEFAULT false,
  delivery_status TEXT DEFAULT 'delivered',
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the 'products' table (Wholesale Catalog)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT NOT NULL DEFAULT 'electronics',
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  "wholesaleTiers" JSONB DEFAULT '[]'::jsonb,
  stock INTEGER NOT NULL DEFAULT 0,
  "minOrderQty" INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'Piece',
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  specs JSONB DEFAULT '{}'::jsonb,
  "isFeatured" BOOLEAN DEFAULT false,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  "reviewsCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the 'categories' table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  "iconName" TEXT DEFAULT 'Package',
  "itemCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create the 'orders' table (Wholesale Purchase Orders & Pro-Formas)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  "orderNumber" TEXT,
  "userId" TEXT,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "companyName" TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(12, 2) DEFAULT 0.00,
  subtotal NUMERIC(12, 2) DEFAULT 0.00,
  tax NUMERIC(12, 2) DEFAULT 0.00,
  shipping NUMERIC(12, 2) DEFAULT 0.00,
  discount NUMERIC(12, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending',
  "paymentStatus" TEXT DEFAULT 'pending',
  "paymentMethod" TEXT DEFAULT 'bank_transfer',
  "shippingAddress" JSONB DEFAULT '{}'::jsonb,
  "billingAddress" JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  "trackingNumber" TEXT,
  "carrierName" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create the 'profiles' table (Buyer & Admin Accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  "displayName" TEXT,
  "companyName" TEXT,
  "phoneNumber" TEXT,
  "photoURL" TEXT,
  "avatarUrl" TEXT,
  role TEXT DEFAULT 'customer',
  "assignedRole" TEXT,
  "totalSpent" NUMERIC(12, 2) DEFAULT 0.00,
  "ordersCount" INTEGER DEFAULT 0,
  "shippingAddress" JSONB,
  "billingAddress" JSONB,
  "taxId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create the 'audit_logs' table (Operations & Inventory Ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "actorEmail" TEXT,
  "actorRole" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create the 'broadcasts' table (Announcements & Price Bulletins)
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  "targetRole" TEXT DEFAULT 'all',
  "authorId" TEXT,
  "authorName" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ
);

-- ==============================================================================
-- 8. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 9. CREATE RLS POLICIES FOR UNRESTRICTED REAL-TIME OPERATION
-- ==============================================================================

-- Messages Policies
DROP POLICY IF EXISTS "Public Read Messages" ON public.messages;
CREATE POLICY "Public Read Messages" ON public.messages FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Manage Messages" ON public.messages;
CREATE POLICY "Public Manage Messages" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Products Policies
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "Public Read Products" ON public.products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Manage Products" ON public.products;
CREATE POLICY "Public Manage Products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Categories Policies
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Manage Categories" ON public.categories;
CREATE POLICY "Public Manage Categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Orders Policies
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Manage Orders" ON public.orders;
CREATE POLICY "Public Manage Orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Profiles Policies
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Manage Profiles" ON public.profiles;
CREATE POLICY "Public Manage Profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Public Read Audit Logs" ON public.audit_logs;
CREATE POLICY "Public Read Audit Logs" ON public.audit_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Manage Audit Logs" ON public.audit_logs;
CREATE POLICY "Public Manage Audit Logs" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Broadcasts Policies
DROP POLICY IF EXISTS "Public Read Broadcasts" ON public.broadcasts;
CREATE POLICY "Public Read Broadcasts" ON public.broadcasts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Manage Broadcasts" ON public.broadcasts;
CREATE POLICY "Public Manage Broadcasts" ON public.broadcasts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 10. ENABLE SUPABASE REALTIME REPLICATION FOR INSTANT MULTI-DEVICE SYNC
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Set REPLICA IDENTITY FULL so deletes & updates broadcast complete payloads
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.broadcasts REPLICA IDENTITY FULL;

-- 11. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
