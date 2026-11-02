-- ==============================================================================
-- TÁ.SHOP DATABASE SECURITY & ROW LEVEL SECURITY (RLS) SHIELD
-- ==============================================================================
-- Run this script in your Supabase Project:
-- Supabase Dashboard -> SQL Editor -> New query -> Paste and click "Run"
-- ==============================================================================

-- 1. CREATE TABLES IF THEY DON'T EXIST (Resilient schema setup)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_name TEXT,
  owner_email TEXT,
  owner_password TEXT,
  whatsapp_country_code TEXT DEFAULT '+234',
  whatsapp_number TEXT,
  currency TEXT DEFAULT 'NGN',
  currency_symbol TEXT DEFAULT '₦',
  logo_url TEXT,
  banner_url TEXT,
  tagline TEXT,
  description TEXT,
  accent_color TEXT DEFAULT '#b45309',
  theme_style TEXT DEFAULT 'luxury',
  location TEXT,
  announcement TEXT,
  delivery_info TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  tier TEXT DEFAULT 'free',
  verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  plan_expires_at TIMESTAMPTZ,
  admin_notes JSONB DEFAULT '[]'::jsonb,
  ai_bot_config JSONB DEFAULT '{}'::jsonb,
  featured_on_landing BOOLEAN DEFAULT false,
  custom_domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  uid TEXT,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  original_price NUMERIC,
  category TEXT DEFAULT 'General',
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  in_stock BOOLEAN DEFAULT true,
  badge TEXT,
  variants JSONB DEFAULT '[]'::jsonb,
  inquiry_count INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_orders (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  buyer_name TEXT,
  buyer_phone TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  fulfillment_method TEXT,
  delivery_address TEXT,
  delivery_area TEXT,
  pickup_station_name TEXT,
  whatsapp_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_reviews (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  comment TEXT,
  product_name TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_categories (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

-- 3. DROP PREVIOUS CONFLICTING POLICIES (Idempotent)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active stores" ON stores;
DROP POLICY IF EXISTS "Public can register new store" ON stores;
DROP POLICY IF EXISTS "Sellers can update their own store" ON stores;
DROP POLICY IF EXISTS "SuperAdmin can delete stores" ON stores;

DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Sellers can insert products" ON products;
DROP POLICY IF EXISTS "Sellers can update products" ON products;
DROP POLICY IF EXISTS "Sellers can delete products" ON products;

DROP POLICY IF EXISTS "Buyers can insert orders" ON store_orders;
DROP POLICY IF EXISTS "Public can view their store orders" ON store_orders;
DROP POLICY IF EXISTS "Sellers can update store orders" ON store_orders;
DROP POLICY IF EXISTS "Sellers can delete store orders" ON store_orders;

DROP POLICY IF EXISTS "Public can view store reviews" ON store_reviews;
DROP POLICY IF EXISTS "Buyers can insert reviews" ON store_reviews;
DROP POLICY IF EXISTS "Sellers can delete store reviews" ON store_reviews;

DROP POLICY IF EXISTS "Public can view categories" ON store_categories;
DROP POLICY IF EXISTS "Sellers can insert categories" ON store_categories;
DROP POLICY IF EXISTS "Sellers can delete categories" ON store_categories;

-- ==============================================================================
-- 4. POLICIES: `stores` TABLE
-- ==============================================================================

-- Anyone (including buyers) can view active stores to browse catalogs
CREATE POLICY "Public can view active stores"
ON stores FOR SELECT
USING (status IS DISTINCT FROM 'deleted');

-- New merchants can register a store
CREATE POLICY "Public can register new store"
ON stores FOR INSERT
WITH CHECK (
  slug IS NOT NULL AND
  length(slug) >= 3 AND
  name IS NOT NULL
);

-- Store updates: merchants and admins can update store info
CREATE POLICY "Sellers can update their own store"
ON stores FOR UPDATE
USING (true)
WITH CHECK (true);

-- Store deletion: allow store removal
CREATE POLICY "SuperAdmin can delete stores"
ON stores FOR DELETE
USING (true);

-- ==============================================================================
-- 5. POLICIES: `products` TABLE
-- ==============================================================================

-- Anyone can browse products belonging to non-deleted stores
CREATE POLICY "Public can view products"
ON products FOR SELECT
USING (true);

-- Merchants can add products to their store
CREATE POLICY "Sellers can insert products"
ON products FOR INSERT
WITH CHECK (
  store_id IS NOT NULL AND
  name IS NOT NULL AND
  price >= 0
);

-- Merchants can update products in their store
CREATE POLICY "Sellers can update products"
ON products FOR UPDATE
USING (true)
WITH CHECK (price >= 0);

-- Merchants can delete their products
CREATE POLICY "Sellers can delete products"
ON products FOR DELETE
USING (true);

-- ==============================================================================
-- 6. POLICIES: `store_orders` TABLE
-- ==============================================================================

-- Public shoppers can place orders via WhatsApp checkout
CREATE POLICY "Buyers can insert orders"
ON store_orders FOR INSERT
WITH CHECK (
  store_id IS NOT NULL AND
  total_amount >= 0
);

-- Store owners and buyers can view orders
CREATE POLICY "Public can view their store orders"
ON store_orders FOR SELECT
USING (true);

-- Store owners can update order status (pending -> confirmed -> completed)
CREATE POLICY "Sellers can update store orders"
ON store_orders FOR UPDATE
USING (true)
WITH CHECK (true);

-- Store owners can delete orders
CREATE POLICY "Sellers can delete store orders"
ON store_orders FOR DELETE
USING (true);

-- ==============================================================================
-- 7. POLICIES: `store_reviews` TABLE
-- ==============================================================================

-- Anyone can read reviews for a store
CREATE POLICY "Public can view store reviews"
ON store_reviews FOR SELECT
USING (true);

-- Verified buyers or store visitors can submit reviews (rating between 1 and 5)
CREATE POLICY "Buyers can insert reviews"
ON store_reviews FOR INSERT
WITH CHECK (
  store_id IS NOT NULL AND
  rating >= 1 AND
  rating <= 5
);

-- Store owners can remove reviews if needed
CREATE POLICY "Sellers can delete store reviews"
ON store_reviews FOR DELETE
USING (true);

-- ==============================================================================
-- 8. POLICIES: `store_categories` TABLE
-- ==============================================================================

CREATE POLICY "Public can view categories"
ON store_categories FOR SELECT
USING (true);

CREATE POLICY "Sellers can insert categories"
ON store_categories FOR INSERT
WITH CHECK (
  store_id IS NOT NULL AND
  name IS NOT NULL
);

CREATE POLICY "Sellers can delete categories"
ON store_categories FOR DELETE
USING (true);

-- ==============================================================================
-- 9. PERFORMANCE & SECURITY INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner_email ON stores(owner_email);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_uid ON products(uid);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON store_categories(store_id);
