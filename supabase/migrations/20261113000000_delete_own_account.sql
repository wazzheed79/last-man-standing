-- Allows an authenticated user to permanently delete their own account and player data.
-- Required for Apple App Store (Guideline 5.1.1(v)) & Google Play compliance.
--
-- Execute in Supabase SQL Editor if applying manually.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Delete player picks
  DELETE FROM public.picks WHERE player_id = v_user_id;

  -- 2. Delete competition participation
  DELETE FROM public.competition_players WHERE user_id = v_user_id;

  -- 3. Delete user from auth.users (cascades sessions/identities)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Restrict to authenticated users
REVOKE ALL ON FUNCTION public.delete_own_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
