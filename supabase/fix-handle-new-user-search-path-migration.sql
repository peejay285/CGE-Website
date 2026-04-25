-- ════════════════════════════════════════════════════════════════════════════
-- Fix handle_new_user / create_seller_verification — pin search_path
--
-- Both of these run as SECURITY DEFINER and fire during Supabase signup.
-- Without an explicit search_path, the auth context couldn't resolve the
-- `profiles` and `seller_verifications` tables, and signup failed with:
--   ERROR: relation "profiles" does not exist (SQLSTATE 42P01)
--
-- Fix: pin search_path on each function and qualify the table references
-- with the schema name. Supabase docs recommend this for every
-- SECURITY DEFINER function (it's also a security best practice — without
-- it, an attacker can shadow the table with a temp object on a writable
-- schema and have the trigger insert there instead).
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, phone, location_state, location_city,
    location_lat, location_lng
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    NEW.raw_user_meta_data->>'location_state',
    NEW.raw_user_meta_data->>'location_city',
    NULLIF(NEW.raw_user_meta_data->>'location_lat', '')::DOUBLE PRECISION,
    NULLIF(NEW.raw_user_meta_data->>'location_lng', '')::DOUBLE PRECISION
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_seller_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seller_verifications (user_id, email_verified, email_verified_at)
  VALUES (NEW.id, TRUE, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
