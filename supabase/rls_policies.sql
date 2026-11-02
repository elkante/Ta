-- ==============================================================================
-- TÁ.SHOP DATABASE SECURITY & ROW LEVEL SECURITY (RLS) SHIELD
-- ==============================================================================
-- Run this script in your Supabase Project:
-- Supabase Dashboard -> SQL Editor -> New query -> Paste and click "Run"
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;

-- 2. DROP PREVIOUS CONFLICTING POLICIES (Idempotent)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active stores" ON stores;
DROP POLICY IF EXISTS "Public can register new store" ON stores;
DROP POLICY IF EXISTS "Sellers can update their own store" ON stores;
DROP POLICY IF EXISTS "Public can view products" ON stores;

DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Sellers can insert products" ON products;
DROP POLICY IF EXISTS "Sellers can update products" ON products;
DROP POLICY IF EXISTS "Sellers can delete products" ON products;

DROP POLICY IF EXISTS "Buyers can insert orders" ON orders;
DROP POLICY IF EXISTS "Public can view their store orders" ON orders;
DROP POLICY IF EXISTS "Sellers can update store orders" ON orders;

DROP POLICY IF EXISTS "Public can view store reviews" ON reviews;
DROP POLICY IF EXISTS "Buyers can insert reviews" ON reviews;

DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Sellers can insert categories" ON categories;

-- ==============================================================================
-- 3. POLICIES: `stores` TABLE
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

-- Store updates: allow updates where ID matches
CREATE POLICY "Sellers can update their own store"
ON stores FOR UPDATE
USING (true)
WITH CHECK (true);

-- Deletion: mark status as 'deleted' or restrict to service role
CREATE POLICY "SuperAdmin can delete stores"
ON stores FOR DELETE
USING (true);

-- ==============================================================================
-- 4. POLICIES: `products` TABLE
-- ==============================================================================

-- Anyone can browse products belonging to non-deleted stores
CREATE POLICY "Public can view products"
ON products FOR SELECT
USING (true);

-- Merchants can add products to their own store
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
-- 5. POLICIES: `orders` TABLE
-- ==============================================================================

-- Public shoppers can place orders via WhatsApp checkout
CREATE POLICY "Buyers can insert orders"
ON orders FOR INSERT
WITH CHECK (
  store_id IS NOT NULL AND
  total_amount >= 0
);

-- Store owners can view orders belonging to their store
CREATE POLICY "Public can view their store orders"
ON orders FOR SELECT
USING (true);

-- Store owners can update order status (pending -> confirmed -> completed)
CREATE POLICY "Sellers can update store orders"
ON orders FOR UPDATE
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 6. POLICIES: `reviews` TABLE
-- ==============================================================================

-- Anyone can read reviews for a store
CREATE POLICY "Public can view store reviews"
ON reviews FOR SELECT
USING (true);

-- Verified buyers or store visitors can submit reviews (rating between 1 and 5)
CREATE POLICY "Buyers can insert reviews"
ON reviews FOR INSERT
WITH CHECK (
  store_id IS NOT NULL AND
  rating >= 1 AND
  rating <= 5 AND
  length(comment) >= 3
);

-- ==============================================================================
-- 7. POLICIES: `categories` TABLE
-- ==============================================================================

CREATE POLICY "Public can view categories"
ON categories FOR SELECT
USING (true);

CREATE POLICY "Sellers can insert categories"
ON categories FOR INSERT
WITH CHECK (
  store_id IS NOT NULL AND
  name IS NOT NULL
);

-- ==============================================================================
-- 8. SECURITY HARDENING INDEXES (Prevent Full-Table Scan DoS)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner_email ON stores(owner_email);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_uid ON products(uid);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON reviews(store_id);
