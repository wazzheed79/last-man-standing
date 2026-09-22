-- Gap #2: drop the short (2-arg) overload of create_competition.
-- The fuller overload already has defaults for the extra params, so callers
-- that only pass p_name + p_display_name continue to work.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Safe to run once; if the 2-arg function is already gone, it is a no-op.

DO $$
BEGIN
  -- Drop the 2-parameter overload if it exists.
  -- Signature: create_competition(text, text)
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_competition'
      AND pg_get_function_identity_arguments(p.oid) = 'p_name text, p_display_name text'
  ) THEN
    DROP FUNCTION public.create_competition(text, text);
    RAISE NOTICE 'Dropped create_competition(text, text)';
  ELSE
    RAISE NOTICE 'create_competition(text, text) not found — nothing to drop';
  END IF;
END $$;

-- Optional verification: list remaining create_competition signatures
-- SELECT pg_get_function_identity_arguments(p.oid) AS args
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'create_competition';
