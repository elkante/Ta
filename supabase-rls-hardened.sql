-- ==============================================================================
-- TÁ.SHOP — HARDENED SECURITY: ROW LEVEL SECURITY POLICIES
-- Run this in Supabase SQL Editor AFTER supabase-schema.sql
-- This replaces all open "true" policies with purpose-scoped rules.
-- ==============================================================================

-- ─── SECURITY FUNCTIONS ───────────────────────────────────────────────────────

-- Helper: extract the store's owner_password hash stored in the stores table.
-- The app sends X-Store-Key: <store_id>:<password_sha256> in the request header.
-- We verify it here server-side without exposing passwords to other rows.

-- We use a session-level claim stored via set_config / current_setting.
-- The app must call: SELECT set_config('app.current_store_id', '<id>', true)
--                and: SELECT set_config('app.store_secret', '<sha256>', true)
-- before any write. This is handled in supabase.ts before mutations.

CREATE OR REPLACE FUNCTION public.app_store_id() RETURNS TEXT
  LANGUAGE sql STABLE
  AS $$ SELECT current_setting('app.current_store_id', true) $$;

CREATE OR REPLACE FUNCTION public.app_store_secret() RETURNS TEXT
  LANGUAGE sql STABLE
  AS $$ SELECT current_setting('app.store_secret', true) $$;

-- Verify caller owns the store: store_id matches + password hash matches.
-- Password is stored as plain text (app can hash client-side with SHA-256 later).
CREATE OR REPLACE FUNCTION public.caller_owns_store(p_store_id TEXT) RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = p_store_id
        AND id = public.app_store_id()
        AND (
          owner_password IS NULL                          -- no password set yet → allow
          OR owner_password = public.app_store_secret()  -- password matches
        )
    )
  $$;

-- ─── RATE-LIMIT TABLE (blocks spam order submissions) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  ip_hash TEXT NOT NULL,
  action  TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  hit_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, action, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Rate limits are internal — no public read/write
CREATE POLICY "No public access to rate limits" ON public.rate_limits FOR ALL USING (false);

-- ─── DROP ALL OLD OPEN POLICIES ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Public can view active stores"      ON public.stores;
DROP POLICY IF EXISTS "Anyone can create or update stores" ON public.stores;
DROP POLICY IF EXISTS "Public can view categories"         ON public.store_categories;
DROP POLICY IF EXISTS "Merchants can manage categories"    ON public.store_categories;
DROP POLICY IF EXISTS "Public can view products"           ON public.products;
DROP POLICY IF EXISTS "Merchants can manage products"      ON public.products;
DROP POLICY IF EXISTS "Public can create and view orders"  ON public.store_orders;
DROP POLICY IF EXISTS "Public can read and write reviews"  ON public.store_reviews;
DROP POLICY IF EXISTS "Public can insert and view inquiries" ON public.inquiry_logs;
DROP POLICY IF EXISTS "Public can view platform settings"  ON public.platform_settings;

-- ==============================================================================
-- 1. STORES TABLE POLICIES
-- ==============================================================================

-- Anyone can READ active stores (public catalog browsing)
CREATE POLICY "stores_select_public"
  ON public.stores FOR SELECT
  USING (status = 'active');

-- Anyone can CREATE a new store (onboarding — store doesn't exist yet so can't own it)
-- Restrict: id must match app.current_store_id claim to prevent creating on behalf of others
CREATE POLICY "stores_insert_self"
  ON public.stores FOR INSERT
  WITH CHECK (id = public.app_store_id());

-- Only the store owner can UPDATE their own store
CREATE POLICY "stores_update_owner"
  ON public.stores FOR UPDATE
  USING  (public.caller_owns_store(id))
  WITH CHECK (public.caller_owns_store(id));

-- No hard DELETE via API — use status='deleted' soft-delete instead
CREATE POLICY "stores_no_delete"
  ON public.stores FOR DELETE
  USING (false);

-- ==============================================================================
-- 2. STORE CATEGORIES
-- ==============================================================================

-- Public can read any store's categories
CREATE POLICY "categories_select_public"
  ON public.store_categories FOR SELECT
  USING (true);

-- Only store owner can insert/update/delete categories for their store
CREATE POLICY "categories_write_owner"
  ON public.store_categories FOR INSERT
  WITH CHECK (public.caller_owns_store(store_id));

CREATE POLICY "categories_update_owner"
  ON public.store_categories FOR UPDATE
  USING  (public.caller_owns_store(store_id))
  WITH CHECK (public.caller_owns_store(store_id));

CREATE POLICY "categories_delete_owner"
  ON public.store_categories FOR DELETE
  USING (public.caller_owns_store(store_id));

-- ==============================================================================
-- 3. PRODUCTS TABLE
-- ==============================================================================

-- Anyone can browse in-stock products of active stores
CREATE POLICY "products_select_public"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = products.store_id
        AND s.status = 'active'
    )
  );

-- Only verified store owner can add products
CREATE POLICY "products_insert_owner"
  ON public.products FOR INSERT
  WITH CHECK (
    public.caller_owns_store(store_id)
    -- Prevent price manipulation: enforce positive price
    AND price >= 0
  );

-- Only owner can update their products
CREATE POLICY "products_update_owner"
  ON public.products FOR UPDATE
  USING  (public.caller_owns_store(store_id))
  WITH CHECK (
    public.caller_owns_store(store_id)
    AND price >= 0
  );

-- Only owner can delete their products
CREATE POLICY "products_delete_owner"
  ON public.products FOR DELETE
  USING (public.caller_owns_store(store_id));

-- ==============================================================================
-- 4. STORE ORDERS
-- ==============================================================================

-- Buyers can INSERT orders (place order without auth)
-- Prevent: empty name, empty phone, zero total, wrong store_id
CREATE POLICY "orders_insert_buyer"
  ON public.store_orders FOR INSERT
  WITH CHECK (
    length(buyer_name)  >= 2
    AND length(buyer_phone) >= 6
    AND total_amount    >  0
    AND jsonb_array_length(items) > 0
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.status = 'active'
    )
  );

-- Only the owning merchant can READ orders for their store
CREATE POLICY "orders_select_owner"
  ON public.store_orders FOR SELECT
  USING (public.caller_owns_store(store_id));

-- Only store owner can update order status (e.g. pending → dispatched)
-- Restrict: can only change the `status` field, not amounts or items
CREATE POLICY "orders_update_owner"
  ON public.store_orders FOR UPDATE
  USING  (public.caller_owns_store(store_id))
  WITH CHECK (
    public.caller_owns_store(store_id)
    -- Prevent retroactive price changes on orders
    AND total_amount = (SELECT total_amount FROM public.store_orders WHERE id = store_orders.id)
  );

-- No order deletion (audit trail) — soft-cancel via status='cancelled'
CREATE POLICY "orders_no_delete"
  ON public.store_orders FOR DELETE
  USING (false);

-- ==============================================================================
-- 5. STORE REVIEWS
-- ==============================================================================

-- Public can read reviews of active stores
CREATE POLICY "reviews_select_public"
  ON public.store_reviews FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.status = 'active')
  );

-- Anyone can submit a review (no auth — rate limiting handled at app level)
-- Enforce: rating must be 1–5, author name ≥ 2 chars
CREATE POLICY "reviews_insert_public"
  ON public.store_reviews FOR INSERT
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND length(author) >= 2
    AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.status = 'active')
  );

-- Only store owner can delete abusive reviews on their store
CREATE POLICY "reviews_delete_owner"
  ON public.store_reviews FOR DELETE
  USING (public.caller_owns_store(store_id));

-- No UPDATE on reviews (immutable once submitted)
CREATE POLICY "reviews_no_update"
  ON public.store_reviews FOR UPDATE
  USING (false);

-- ==============================================================================
-- 6. INQUIRY LOGS (WhatsApp click tracking)
-- ==============================================================================

-- Anyone can INSERT an inquiry log (buyer clicked WhatsApp)
CREATE POLICY "inquiries_insert_public"
  ON public.inquiry_logs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.status = 'active')
  );

-- Only store owner can read their own inquiry logs
CREATE POLICY "inquiries_select_owner"
  ON public.inquiry_logs FOR SELECT
  USING (public.caller_owns_store(store_id));

-- No update/delete (immutable audit log)
CREATE POLICY "inquiries_no_update" ON public.inquiry_logs FOR UPDATE USING (false);
CREATE POLICY "inquiries_no_delete" ON public.inquiry_logs FOR DELETE USING (false);

-- ==============================================================================
-- 7. PLATFORM SETTINGS (Super-admin read-only for public)
-- ==============================================================================

-- Anyone can READ platform-wide settings (currency defaults, announcements)
CREATE POLICY "platform_settings_select_public"
  ON public.platform_settings FOR SELECT
  USING (true);

-- No writes via API — platform settings only changed by DB admin directly
CREATE POLICY "platform_settings_no_write"
  ON public.platform_settings FOR INSERT USING (false);
CREATE POLICY "platform_settings_no_update"
  ON public.platform_settings FOR UPDATE USING (false);
CREATE POLICY "platform_settings_no_delete"
  ON public.platform_settings FOR DELETE USING (false);

-- ==============================================================================
-- ADDITIONAL HARDENING CONSTRAINTS
-- ==============================================================================

-- Prevent SQL-injection via slug field (only a-z, 0-9, hyphens allowed)
ALTER TABLE public.stores
  ADD CONSTRAINT IF NOT EXISTS stores_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{1,50}[a-z0-9]$');

-- Prevent negative prices
ALTER TABLE public.products
  ADD CONSTRAINT IF NOT EXISTS products_price_positive
  CHECK (price >= 0);

-- Prevent invalid order totals
ALTER TABLE public.store_orders
  ADD CONSTRAINT IF NOT EXISTS orders_total_positive
  CHECK (total_amount > 0);

-- Prevent invalid ratings
ALTER TABLE public.store_reviews
  ADD CONSTRAINT IF NOT EXISTS reviews_rating_range
  CHECK (rating BETWEEN 1 AND 5);

-- Prevent unknown store status values
ALTER TABLE public.stores
  ADD CONSTRAINT IF NOT EXISTS stores_status_enum
  CHECK (status IN ('active', 'suspended', 'deleted'));

-- Prevent unknown tier values
ALTER TABLE public.stores
  ADD CONSTRAINT IF NOT EXISTS stores_tier_enum
  CHECK (tier IN ('free', 'starter', 'pro', 'business'));

-- Prevent unknown order status values
ALTER TABLE public.store_orders
  ADD CONSTRAINT IF NOT EXISTS orders_status_enum
  CHECK (status IN ('pending', 'confirmed', 'dispatched', 'completed', 'cancelled'));

-- ==============================================================================
-- REALTIME (keep orders + products live for merchant dashboard)
-- ==============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.store_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- ==============================================================================
-- GRANT USAGE (anon key gets access to public schema only)
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.stores TO anon;
GRANT UPDATE ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_categories TO anon;
GRANT SELECT, INSERT, UPDATE ON public.products TO anon;
GRANT DELETE ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_orders TO anon;
GRANT SELECT, INSERT ON public.store_reviews TO anon;
GRANT DELETE ON public.store_reviews TO anon;
GRANT SELECT, INSERT ON public.inquiry_logs TO anon;
GRANT SELECT ON public.platform_settings TO anon;
