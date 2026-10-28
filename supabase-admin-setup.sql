-- ==============================================================================
-- TÁ.SHOP — SUPER ADMIN USER CREATION IN SUPABASE AUTH
-- Run this in Supabase SQL Editor to provision admin@ta.shop
-- ==============================================================================

-- 1. Ensure pgcrypto extension is active for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create the admin user in auth.users (if not already existing)
-- Change 'AdminPassword2026!' to your desired master password
DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := 'admin@ta.shop';
  v_password TEXT := 'AdminPassword2026!'; -- Change this password as desired!
  v_encrypted_pw TEXT;
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    v_encrypted_pw := crypt(v_password, gen_salt('bf'));
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      now(), -- Automatically confirmed
      now(),
      now(),
      '{"provider":"email","providers":["email"],"role":"superadmin"}'::jsonb,
      '{"full_name":"Platform Super Admin","role":"superadmin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- Also insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, v_email)::jsonb,
      'email',
      v_email,
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Admin user % created successfully with ID %', v_email, v_user_id;
  ELSE
    -- If already exists, update password and confirm email
    UPDATE auth.users
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = raw_app_meta_data || '{"role":"superadmin"}'::jsonb,
      raw_user_meta_data = raw_user_meta_data || '{"role":"superadmin"}'::jsonb,
      updated_at = now()
    WHERE email = v_email;
    
    RAISE NOTICE 'Admin user % updated with new password', v_email;
  END IF;
END $$;
