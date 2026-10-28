-- ==============================================================================
-- TÁ.SHOP — SUPER ADMIN USER SETUP FOR SUPABASE AUTH
-- ==============================================================================
-- You set the password yourself directly in Supabase Auth!
--
-- How to create the admin user:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/auth/users
-- 2. Go to "Authentication" -> "Users"
-- 3. Click "Add user" -> "Create user"
-- 4. Fill in:
--    - Email: admin@ta.shop
--    - Password: (Enter whatever password you want!)
--    - Toggle "Auto Confirm User": ON (checked)
-- 5. Click "Create user".
--
-- After creating the user in Supabase Auth, you can optionally run the query below
-- in your Supabase SQL Editor to ensure their metadata role is tagged as 'superadmin':
-- ==============================================================================

UPDATE auth.users
SET 
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"superadmin"}'::jsonb,
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name":"Platform Super Admin","role":"superadmin"}'::jsonb,
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'admin@ta.shop';

-- Confirm it was tagged
SELECT id, email, role, email_confirmed_at, raw_app_meta_data
FROM auth.users
WHERE email = 'admin@ta.shop';
