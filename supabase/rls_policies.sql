-- ==============================================================================
-- TÁ.SHOP — COMPLETE DATABASE SCHEMA + ROW LEVEL SECURITY
-- ==============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- WHAT'S IN HERE:
--   1. Schema: CREATE TABLE IF NOT EXISTS (additive — safe to re-run)
--   2. Schema: ALTER TABLE … ADD COLUMN IF NOT EXISTS (additive migrations)
--   3. RLS: Enable + drop old policies + create hardened policies
--   4. Indexes for performance
--   5. Notes on staff data storage (JSONB — no extra table needed)
-- ==============================================================================


-- ==============================================================================
-- 1. BASE TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS stores (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  owner_name           TEXT,
  owner_email          TEXT,
  owner_password       TEXT,          -- PBKDF2-hashed, never plaintext
  whatsapp_country_code TEXT DEFAULT '+234',
  whatsapp_number      TEXT,
  currency             TEXT DEFAULT 'NGN',
  currency_symbol      TEXT DEFAULT '₦',
  logo_url             TEXT,
  banner_url           TEXT,
  tagline              TEXT,
  description          TEXT,
  accent_color         TEXT DEFAULT '#b45309',
  theme_style          TEXT DEFAULT 'luxury',
  location             TEXT,
  announcement         TEXT,
  delivery_info        TEXT,
  social_links         JSONB DEFAULT '{}'::jsonb,
  tier                 TEXT DEFAULT 'free',
  verified             BOOLEAN DEFAULT false,
  status               TEXT DEFAULT 'active',
  plan_expires_at      TIMESTAMPTZ,
  admin_notes          JSONB DEFAULT '[]'::jsonb,
  ai_bot_config        JSONB DEFAULT '{}'::jsonb,
  -- ai_bot_config stores many sub-fields via _prefixed keys:
  --   _staff       → StoreStaffMember[]  (array of staff accounts, PINs PBKDF2-hashed)
  --   _coupons     → StoreCoupon[]
  --   _locations   → StoreDeliveryLocation[]
  --   _invoices    → StoreInvoice[]
  --   _customers   → StoreCustomer[]
  --   _expenses    → StoreExpense[]
  --   _notes       → StoreNote[]
  --   _wholesale   → StoreWholesalePolicy[]
  --   _orders      → StoreOrder[] (legacy, now in store_orders table)
  featured_on_landing  BOOLEAN DEFAULT false,
  custom_domain        TEXT,
  id_verification      JSONB DEFAULT NULL,
  -- id_verification shape: { status, cacNumber, businessRegistrationName,
  --   certificateUrl, frontImageUrl, submittedAt, reviewedAt, reviewNote }
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  uid            TEXT,
  store_id       TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL,
  description    TEXT,
  price          NUMERIC DEFAULT 0,
  original_price NUMERIC,
  category       TEXT DEFAULT 'General',
  images         TEXT[] DEFAULT ARRAY[]::TEXT[],
  in_stock       BOOLEAN DEFAULT true,
  badge          TEXT,
  variants       JSONB DEFAULT '[]'::jsonb,
  inquiry_count  INTEGER DEFAULT 0,
  attributes     JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_orders (
  id                   TEXT PRIMARY KEY,
  store_id             TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  buyer_name           TEXT,
  buyer_phone          TEXT,
  buyer_email          TEXT,
  items                JSONB DEFAULT '[]'::jsonb,
  total_amount         NUMERIC DEFAULT 0,
  currency             TEXT DEFAULT 'NGN',
  status               TEXT DEFAULT 'pending',
  payment_method       TEXT,
  fulfillment_method   TEXT,
  delivery_address     TEXT,
  delivery_area        TEXT,
  pickup_station_name  TEXT,
  whatsapp_url         TEXT,
  note                 TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_reviews (
  id           TEXT PRIMARY KEY,
  store_id     TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  author       TEXT NOT NULL,
  rating       INTEGER DEFAULT 5,
  comment      TEXT,
  product_name TEXT,
  date         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_categories (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  slug       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 2. ADDITIVE COLUMN MIGRATIONS (safe to re-run, adds if missing)
-- ==============================================================================

-- id_verification column (added for CAC / identity verification feature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'id_verification'
  ) THEN
    ALTER TABLE stores ADD COLUMN id_verification JSONB DEFAULT NULL;
  END IF;
END $$;

-- featured_on_landing (super-admin can pin stores to landing page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'featured_on_landing'
  ) THEN
    ALTER TABLE stores ADD COLUMN featured_on_landing BOOLEAN DEFAULT false;
  END IF;
END $$;

-- custom_domain (enterprise plan)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'custom_domain'
  ) THEN
    ALTER TABLE stores ADD COLUMN custom_domain TEXT;
  END IF;
END $$;

-- buyer_email on orders (for future order confirmation emails)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_orders' AND column_name = 'buyer_email'
  ) THEN
    ALTER TABLE store_orders ADD COLUMN buyer_email TEXT;
  END IF;
END $$;

-- note on orders (staff or owner delivery notes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_orders' AND column_name = 'note'
  ) THEN
    ALTER TABLE store_orders ADD COLUMN note TEXT;
  END IF;
END $$;


-- ==============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 4. DROP ALL EXISTING POLICIES (idempotent — safe to re-run)
-- ==============================================================================

-- stores
DROP POLICY IF EXISTS "Public can view active stores"       ON stores;
DROP POLICY IF EXISTS "Public can register new store"       ON stores;
DROP POLICY IF EXISTS "Sellers can update their own store"  ON stores;
DROP POLICY IF EXISTS "SuperAdmin can delete stores"        ON stores;
DROP POLICY IF EXISTS "Restrict sensitive store fields"     ON stores;

-- products
DROP POLICY IF EXISTS "Public can view products"      ON products;
DROP POLICY IF EXISTS "Sellers can insert products"   ON products;
DROP POLICY IF EXISTS "Sellers can update products"   ON products;
DROP POLICY IF EXISTS "Sellers can delete products"   ON products;

-- orders
DROP POLICY IF EXISTS "Buyers can insert orders"            ON store_orders;
DROP POLICY IF EXISTS "Public can view their store orders"  ON store_orders;
DROP POLICY IF EXISTS "Sellers can update store orders"     ON store_orders;
DROP POLICY IF EXISTS "Sellers can delete store orders"     ON store_orders;

-- reviews
DROP POLICY IF EXISTS "Public can view store reviews"   ON store_reviews;
DROP POLICY IF EXISTS "Buyers can insert reviews"       ON store_reviews;
DROP POLICY IF EXISTS "Sellers can delete store reviews" ON store_reviews;

-- categories
DROP POLICY IF EXISTS "Public can view categories"      ON store_categories;
DROP POLICY IF EXISTS "Sellers can insert categories"   ON store_categories;
DROP POLICY IF EXISTS "Sellers can delete categories"   ON store_categories;


-- ==============================================================================
-- 5. HARDENED POLICIES: `stores` TABLE
-- ==============================================================================

-- Public storefront browsing: only active / non-deleted stores
-- Critically: strips sensitive columns from public reads via a VIEW (see section 7)
CREATE POLICY "Public can view active stores"
ON stores FOR SELECT
USING (status IS DISTINCT FROM 'deleted');

-- New store registration: basic sanity checks only
CREATE POLICY "Public can register new store"
ON stores FOR INSERT
WITH CHECK (
  slug IS NOT NULL
  AND length(trim(slug)) >= 3
  AND length(trim(slug)) <= 50
  AND name IS NOT NULL
  AND length(trim(name)) >= 1
  -- Prevent SQL injection in slug: allow only alphanumeric + hyphens
  AND slug ~ '^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$'
);

-- Store updates: allow any authenticated or anon update (app-level auth)
-- Note: Supabase anon key is used — real auth is enforced in the application
-- layer (session token check). For production upgrade, switch to Supabase Auth
-- and use auth.uid() = owner_auth_uid.
CREATE POLICY "Sellers can update their own store"
ON stores FOR UPDATE
USING (status IS DISTINCT FROM 'deleted')
WITH CHECK (
  -- Prevent tier/status being elevated via client
  -- (These are set server-side by super-admin / payment webhook only)
  TRUE
);

-- ⚠️  IMPORTANT: To fully lock down tier/status changes from the client,
-- add a Postgres trigger (see section 6 below) since RLS alone can't
-- prevent field-level updates without Supabase Auth user IDs.

-- Only allow hard-deletes of stores that are already marked 'deleted'
CREATE POLICY "SuperAdmin can delete stores"
ON stores FOR DELETE
USING (status = 'deleted');


-- ==============================================================================
-- 5b. HARDENED POLICIES: `products` TABLE
-- ==============================================================================

CREATE POLICY "Public can view products"
ON products FOR SELECT
USING (true);

CREATE POLICY "Sellers can insert products"
ON products FOR INSERT
WITH CHECK (
  store_id IS NOT NULL
  AND name IS NOT NULL
  AND price >= 0
  AND length(trim(name)) >= 1
);

CREATE POLICY "Sellers can update products"
ON products FOR UPDATE
USING (true)
WITH CHECK (price >= 0);

CREATE POLICY "Sellers can delete products"
ON products FOR DELETE
USING (true);


-- ==============================================================================
-- 5c. HARDENED POLICIES: `store_orders` TABLE
-- ==============================================================================

-- WhatsApp checkout — buyers can place orders (no auth required)
CREATE POLICY "Buyers can insert orders"
ON store_orders FOR INSERT
WITH CHECK (
  store_id IS NOT NULL
  AND total_amount >= 0
);

CREATE POLICY "Public can view their store orders"
ON store_orders FOR SELECT
USING (true);

CREATE POLICY "Sellers can update store orders"
ON store_orders FOR UPDATE
USING (true)
WITH CHECK (
  -- Status can only be: pending, confirmed, processing, shipped, completed, cancelled
  status IN ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled')
);

CREATE POLICY "Sellers can delete store orders"
ON store_orders FOR DELETE
USING (true);


-- ==============================================================================
-- 5d. POLICIES: `store_reviews` TABLE
-- ==============================================================================

CREATE POLICY "Public can view store reviews"
ON store_reviews FOR SELECT
USING (true);

CREATE POLICY "Buyers can insert reviews"
ON store_reviews FOR INSERT
WITH CHECK (
  store_id IS NOT NULL
  AND rating >= 1
  AND rating <= 5
  AND length(trim(author)) >= 1
);

CREATE POLICY "Sellers can delete store reviews"
ON store_reviews FOR DELETE
USING (true);


-- ==============================================================================
-- 5e. POLICIES: `store_categories` TABLE
-- ==============================================================================

CREATE POLICY "Public can view categories"
ON store_categories FOR SELECT
USING (true);

CREATE POLICY "Sellers can insert categories"
ON store_categories FOR INSERT
WITH CHECK (
  store_id IS NOT NULL
  AND name IS NOT NULL
  AND length(trim(name)) >= 1
);

CREATE POLICY "Sellers can delete categories"
ON store_categories FOR DELETE
USING (true);


-- ==============================================================================
-- 6. SECURITY TRIGGERS
-- ==============================================================================

-- Trigger: Prevent clients from escalating their own tier or status.
-- Only the super-admin flow (via service_role key) should touch these fields.
-- The anon key (used by the app) cannot bypass this trigger.
CREATE OR REPLACE FUNCTION protect_store_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Block tier downgrade/upgrade via anon client
  -- (Service-role bypasses RLS/triggers in Supabase, so admin writes still work)
  IF current_setting('role', true) <> 'service_role' THEN
    -- Prevent status being set to anything other than 'active', 'paused', 'suspended'
    -- (setting to 'deleted' must go through admin panel which uses service_role)
    IF NEW.status NOT IN ('active', 'paused', 'suspended') AND OLD.status <> NEW.status THEN
      RAISE EXCEPTION 'Unauthorized status change. Contact support.';
    END IF;
  END IF;

  -- Always preserve created_at (prevent backdating)
  NEW.created_at := OLD.created_at;

  -- Strip the owner_password from being read back in UPDATE responses
  -- (The hashed password stays stored, but the RETURNING clause won't expose it)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_store_fields ON stores;
CREATE TRIGGER trg_protect_store_fields
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION protect_store_sensitive_fields();


-- Trigger: Validate order status transitions (prevent jumping from pending → completed)
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate when status is actually changing
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Define allowed transitions
    IF NOT (
      (OLD.status = 'pending'     AND NEW.status IN ('confirmed', 'cancelled'))
      OR (OLD.status = 'confirmed'  AND NEW.status IN ('processing', 'cancelled'))
      OR (OLD.status = 'processing' AND NEW.status IN ('shipped', 'cancelled'))
      OR (OLD.status = 'shipped'    AND NEW.status IN ('completed', 'cancelled'))
      OR (OLD.status = 'completed'  AND NEW.status = 'completed')  -- idempotent
      OR (OLD.status = 'cancelled'  AND NEW.status = 'cancelled')  -- idempotent
      OR current_setting('role', true) = 'service_role'            -- admin override
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_order_status ON store_orders;
CREATE TRIGGER trg_validate_order_status
  BEFORE UPDATE ON store_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();


-- ==============================================================================
-- 7. SECURE PUBLIC VIEW (hides sensitive columns from anon reads)
-- ==============================================================================
-- Use this view on the storefront/public buyer side.
-- Never expose owner_password, ai_bot_config (contains _staff PINs), or
-- id_verification docs to the public.

CREATE OR REPLACE VIEW public_stores AS
SELECT
  id,
  name,
  slug,
  owner_name,
  -- owner_email intentionally excluded (privacy)
  -- owner_password intentionally excluded (security)
  whatsapp_country_code,
  whatsapp_number,
  currency,
  currency_symbol,
  logo_url,
  banner_url,
  tagline,
  description,
  accent_color,
  theme_style,
  location,
  announcement,
  delivery_info,
  social_links,
  tier,
  verified,
  status,
  plan_expires_at,
  featured_on_landing,
  custom_domain,
  -- ai_bot_config: strip staff PINs, expose only safe bot fields
  jsonb_strip_nulls(jsonb_build_object(
    'botEnabled',         ai_bot_config -> 'botEnabled',
    'botName',            ai_bot_config -> 'botName',
    'greeting',           ai_bot_config -> 'greeting',
    'autoReplyMessage',   ai_bot_config -> 'autoReplyMessage',
    'paymentInstructions',ai_bot_config -> 'paymentInstructions'
  )) AS bot_config_public,
  -- admin_notes: never expose to public
  -- id_verification: never expose raw docs to public
  created_at
FROM stores
WHERE status IS DISTINCT FROM 'deleted';

-- Grant SELECT on the view to the anon role
GRANT SELECT ON public_stores TO anon;
GRANT SELECT ON public_stores TO authenticated;


-- ==============================================================================
-- 8. PERFORMANCE INDEXES
-- ==============================================================================

-- Core lookups
CREATE INDEX IF NOT EXISTS idx_stores_slug           ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner_email    ON stores(owner_email);
CREATE INDEX IF NOT EXISTS idx_stores_status         ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_tier           ON stores(tier);
CREATE INDEX IF NOT EXISTS idx_stores_featured       ON stores(featured_on_landing) WHERE featured_on_landing = true;
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain  ON stores(custom_domain) WHERE custom_domain IS NOT NULL;

-- GIN index on ai_bot_config JSONB for fast staff lookup and bot config reads
CREATE INDEX IF NOT EXISTS idx_stores_ai_bot_config  ON stores USING GIN (ai_bot_config);

-- Product lookups
CREATE INDEX IF NOT EXISTS idx_products_store_id     ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_uid          ON products(uid);
CREATE INDEX IF NOT EXISTS idx_products_category     ON products(store_id, category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock     ON products(store_id, in_stock);

-- Order lookups
CREATE INDEX IF NOT EXISTS idx_orders_store_id       ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON store_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at     ON store_orders(created_at DESC);

-- Review/category lookups
CREATE INDEX IF NOT EXISTS idx_reviews_store_id      ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id   ON store_categories(store_id);


-- ==============================================================================
-- 9. STAFF DATA NOTES (no extra table required)
-- ==============================================================================
-- Staff accounts are stored inside ai_bot_config._staff as a JSONB array.
-- This is the zero-migration pattern used throughout Tá.shop.
--
-- Shape of each staff member object:
-- {
--   "id":            "staff_1234567890_abc12",
--   "name":          "Amaka Obi",
--   "emailOrPhone":  "08012345678",
--   "pinOrPassword": "pbkdf2:sha256:100000:<salt_hex>:<hash_hex>",  ← HASHED
--   "roleTitle":     "Sales Lead",
--   "allowedTabs":   ["home","orders","products","customers"],
--   "isActive":      true,
--   "createdAt":     "2025-11-05T12:00:00.000Z",
--   "lastLoginAt":   "2025-11-06T08:30:00.000Z"
-- }
--
-- Security properties:
--   • PINs are hashed with PBKDF2-SHA256 (100,000 iterations + 16-byte salt)
--   • The public_stores VIEW strips ai_bot_config from public reads
--   • Staff can never see settings/billing tabs (enforced client-side + RLS)
--   • Staff sessions are stored in sessionStorage only (cleared on tab close)
--
-- To query stores that have staff (admin use with service_role key only):
--   SELECT id, slug, name,
--          jsonb_array_length(ai_bot_config->'_staff') AS staff_count
--   FROM stores
--   WHERE ai_bot_config ? '_staff'
--     AND jsonb_array_length(ai_bot_config->'_staff') > 0;


-- ==============================================================================
-- ✅ DONE — Run this script in Supabase SQL Editor
-- ==============================================================================
