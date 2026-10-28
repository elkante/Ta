-- ==============================================================================
-- TÁ.SHOP — SUPABASE PRODUCTION DATABASE SCHEMA
-- Live Multi-Tenant Database for Social Commerce Storefronts
-- ==============================================================================

-- 1. STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_email TEXT,
  owner_password TEXT,
  tagline TEXT DEFAULT '',
  description TEXT DEFAULT '',
  whatsapp_country_code TEXT DEFAULT '+234',
  whatsapp_number TEXT DEFAULT '',
  currency TEXT DEFAULT 'NGN',
  currency_symbol TEXT DEFAULT '₦',
  logo_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  accent_color TEXT DEFAULT '#b45309',
  theme_style TEXT DEFAULT 'luxury',
  location TEXT DEFAULT '',
  announcement TEXT DEFAULT '',
  delivery_info TEXT DEFAULT '',
  social_links JSONB DEFAULT '{}'::jsonb,
  tier TEXT DEFAULT 'free',
  verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  plan_expires_at TIMESTAMPTZ DEFAULT NULL,
  admin_notes JSONB DEFAULT '[]'::jsonb,
  ai_bot_config JSONB DEFAULT '{}'::jsonb,
  open_hours JSONB DEFAULT NULL,
  restock_countdown JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. STORE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.store_categories (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC DEFAULT NULL,
  category TEXT DEFAULT 'General',
  images JSONB DEFAULT '[]'::jsonb,
  in_stock BOOLEAN DEFAULT true,
  is_low_stock BOOLEAN DEFAULT false,
  badge TEXT DEFAULT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '{}'::jsonb,
  inquiry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STORE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.store_orders (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  fulfillment_method TEXT DEFAULT 'delivery',
  delivery_address TEXT,
  delivery_area TEXT,
  buyer_notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency_symbol TEXT DEFAULT '₦',
  whatsapp_url TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. STORE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  comment TEXT DEFAULT '',
  product_name TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. WHATSAPP INQUIRY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.inquiry_logs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id TEXT,
  product_uid TEXT,
  product_name TEXT,
  variant_name TEXT,
  price NUMERIC DEFAULT 0,
  buyer_note TEXT,
  buyer_location TEXT,
  whatsapp_url TEXT,
  status TEXT DEFAULT 'inquired',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 7. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  platform_name TEXT DEFAULT 'Tá.shop',
  support_whatsapp TEXT DEFAULT '2348000000000',
  default_currency TEXT DEFAULT 'NGN',
  starter_price_monthly NUMERIC DEFAULT 5000,
  pro_price_monthly NUMERIC DEFAULT 15000,
  global_announcement TEXT DEFAULT '',
  allow_registrations BOOLEAN DEFAULT true,
  maintenance_mode BOOLEAN DEFAULT false,
  featured_store_slugs JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEXES FOR FAST QUERY PERFORMANCE ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_uid ON public.products(uid);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(store_id, category);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.store_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON public.store_reviews(store_id);

-- ─── ENABLE ROW LEVEL SECURITY (RLS) ────────────────────────────────────────
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ─── PUBLIC POLICIES (Full Social Catalog Read & Write) ─────────────────────
-- Stores
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
CREATE POLICY "Public can view active stores" ON public.stores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create or update stores" ON public.stores;
CREATE POLICY "Anyone can create or update stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);

-- Store Categories
DROP POLICY IF EXISTS "Public can view categories" ON public.store_categories;
CREATE POLICY "Public can view categories" ON public.store_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Merchants can manage categories" ON public.store_categories;
CREATE POLICY "Merchants can manage categories" ON public.store_categories FOR ALL USING (true) WITH CHECK (true);

-- Products
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Merchants can manage products" ON public.products;
CREATE POLICY "Merchants can manage products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Store Orders (Customers can place orders; merchants can view and update)
DROP POLICY IF EXISTS "Public can create and view orders" ON public.store_orders;
CREATE POLICY "Public can create and view orders" ON public.store_orders FOR ALL USING (true) WITH CHECK (true);

-- Store Reviews
DROP POLICY IF EXISTS "Public can read and write reviews" ON public.store_reviews;
CREATE POLICY "Public can read and write reviews" ON public.store_reviews FOR ALL USING (true) WITH CHECK (true);

-- Inquiry Logs
DROP POLICY IF EXISTS "Public can insert and view inquiries" ON public.inquiry_logs;
CREATE POLICY "Public can insert and view inquiries" ON public.inquiry_logs FOR ALL USING (true) WITH CHECK (true);

-- Platform Settings
DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
CREATE POLICY "Public can view platform settings" ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);

-- Realtime Publications (Safely added only if not already member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'store_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;
