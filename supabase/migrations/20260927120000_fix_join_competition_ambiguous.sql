-- Fix: column reference "competition_id" is ambiguous
-- RETURNS TABLE(competition_id ...) creates output variables that clash
-- with unqualified table columns in the function body.

CREATE OR REPLACE FUNCTION public.join_competition(
  p_join_code text,
  p_display_name text DEFAULT NULL
)
RETURNS TABLE(competition_id uuid, player_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_comp_id uuid;
  v_player_id uuid;
  v_display text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.id INTO v_comp_id
  FROM public.competitions c
  WHERE c.join_code = upper(trim(p_join_code));

  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code';
  END IF;

  -- Qualify table columns so they do not clash with RETURNS TABLE output names
  IF EXISTS (
    SELECT 1
    FROM public.competition_players cp
    WHERE cp.competition_id = v_comp_id
      AND cp.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already joined this competition';
  END IF;

  v_display := coalesce(
    nullif(trim(p_display_name), ''),
    split_part(auth.jwt() ->> 'email', '@', 1)
  );

  INSERT INTO public.competition_players (competition_id, user_id, display_name)
  VALUES (v_comp_id, v_user_id, v_display)
  RETURNING competition_players.id INTO v_player_id;

  RETURN QUERY
  SELECT v_comp_id, v_player_id, 'Successfully joined'::text;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.join_competition(text, text) TO authenticated;
