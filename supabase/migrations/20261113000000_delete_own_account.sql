-- Allows an authenticated user to permanently delete their own account.
-- Required for Apple App Store (Guideline 5.1.1(v)) and Google Play.
--
-- NOT APPLIED to production. Run this whole file once in the Supabase SQL editor.
-- Running it again only replaces this same function. Do not drop any columns.
--
-- Leagues this person created stay in place when other players are still in them.
-- Ownership moves to the player who joined first. A league with nobody else in
-- it is removed with the account, because competitions.created_by would
-- otherwise cascade-delete it anyway.

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

  -- winner_player_id does not cascade, so clear it before the player row goes.
  UPDATE public.competitions
  SET winner_player_id = NULL,
      updated_at = now()
  WHERE winner_player_id IN (
    SELECT id
    FROM public.competition_players
    WHERE user_id = v_user_id
  );

  -- created_by references auth.users ON DELETE CASCADE. Reassign shared leagues
  -- first, or deleting the login would wipe everyone else's game.
  UPDATE public.competitions AS c
  SET created_by = next_owner.user_id,
      updated_at = now()
  FROM (
    SELECT DISTINCT ON (cp.competition_id)
      cp.competition_id,
      cp.user_id
    FROM public.competition_players cp
    INNER JOIN public.competitions owned
      ON owned.id = cp.competition_id
    WHERE owned.created_by = v_user_id
      AND cp.user_id <> v_user_id
    ORDER BY cp.competition_id, cp.joined_at, cp.id
  ) AS next_owner
  WHERE c.id = next_owner.competition_id
    AND c.created_by = v_user_id;

  -- These rows do not cascade away with the login.
  DELETE FROM public.assistant_action_log
  WHERE actor_user_id = v_user_id;

  DELETE FROM public.feedback
  WHERE user_id = v_user_id;

  DELETE FROM public.pick_reminders_sent
  WHERE player_id = v_user_id;

  DELETE FROM auth.refresh_tokens
  WHERE user_id = v_user_id::text;

  DELETE FROM auth.flow_state
  WHERE user_id = v_user_id;

  -- Sessions, identities, league membership, picks, admin row, and any league
  -- this person still owns (no other players) cascade from this delete.
  DELETE FROM auth.users
  WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
