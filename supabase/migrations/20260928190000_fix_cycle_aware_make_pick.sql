-- Fix make_pick so a new cycle cannot accidentally reuse the previous cycle's
-- pick for the same gameweek.
--
-- This preserves the existing game rules and only changes the lookup of the
-- player's current pick to include cycle_number. SECURITY DEFINER is retained
-- because make_pick is the trusted database path for submitting picks.

CREATE OR REPLACE FUNCTION public.make_pick(
  p_competition_id uuid,
  p_team_id integer,
  p_team_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_player_id uuid;
  v_current_gw integer;
  v_pick_id uuid;
  v_existing_team_id integer;
  v_existing_status text;
  v_competition_status text;
  v_allow_pick_changes boolean;
  v_deadline timestamptz;
  v_cycle_number integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT cp.id
  INTO v_player_id
  FROM public.competition_players cp
  WHERE cp.competition_id = p_competition_id
    AND cp.user_id = v_user_id
    AND cp.status = 'alive';

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'You are not an active player in this competition';
  END IF;

  SELECT c.current_gameweek,
         c.status,
         COALESCE(c.allow_pick_changes, true),
         COALESCE(c.cycle_number, 1)
  INTO v_current_gw,
       v_competition_status,
       v_allow_pick_changes,
       v_cycle_number
  FROM public.competitions c
  WHERE c.id = p_competition_id;

  IF v_current_gw IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  IF v_competition_status NOT IN ('open', 'active') THEN
    RAISE EXCEPTION 'This competition is no longer accepting picks';
  END IF;

  -- IMPORTANT: include cycle_number so an old cycle's pick for the same
  -- gameweek cannot be mistaken for the current pick.
  SELECT p.id, p.team_id, p.status
  INTO v_pick_id, v_existing_team_id, v_existing_status
  FROM public.picks p
  WHERE p.competition_id = p_competition_id
    AND p.player_id = v_player_id
    AND p.gameweek = v_current_gw
    AND COALESCE(p.cycle_number, 1) = v_cycle_number
  FOR UPDATE;

  v_deadline := public.get_gameweek_deadline(p_competition_id, v_current_gw);

  -- Changing an existing (non-postponed) pick.
  IF v_pick_id IS NOT NULL AND v_existing_status IS DISTINCT FROM 'postponed' THEN
    IF NOT v_allow_pick_changes THEN
      RAISE EXCEPTION 'This league does not allow changing picks once submitted';
    END IF;
    IF v_deadline IS NOT NULL AND NOW() >= v_deadline THEN
      RAISE EXCEPTION 'The pick deadline has passed';
    END IF;
  END IF;

  -- First pick of the week after deadline.
  IF v_pick_id IS NULL AND v_deadline IS NOT NULL AND NOW() >= v_deadline THEN
    RAISE EXCEPTION 'The pick deadline has passed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fixtures_cache f
    WHERE f.season = (
      SELECT c.season
      FROM public.competitions c
      WHERE c.id = p_competition_id
    )
      AND f.matchday = v_current_gw
      AND (f.home_team_id = p_team_id OR f.away_team_id = p_team_id)
  ) THEN
    RAISE EXCEPTION 'This team is not playing in the current gameweek';
  END IF;

  -- A team may not be reused within the same cycle.
  IF EXISTS (
    SELECT 1
    FROM public.picks p
    WHERE p.competition_id = p_competition_id
      AND p.player_id = v_player_id
      AND p.team_id = p_team_id
      AND p.gameweek <> v_current_gw
      AND COALESCE(p.cycle_number, 1) = v_cycle_number
  ) THEN
    RAISE EXCEPTION 'You have already used this team';
  END IF;

  IF v_pick_id IS NOT NULL THEN
    UPDATE public.picks
    SET team_id = p_team_id,
        team_name = p_team_name,
        result = NULL,
        status = 'pending',
        deadline_exempt = (v_existing_status = 'postponed'),
        created_at = NOW()
    WHERE id = v_pick_id;

    RETURN v_pick_id;
  END IF;

  INSERT INTO public.picks (
    competition_id,
    player_id,
    gameweek,
    team_id,
    team_name,
    result,
    status,
    deadline_exempt,
    cycle_number
  )
  VALUES (
    p_competition_id,
    v_player_id,
    v_current_gw,
    p_team_id,
    p_team_name,
    NULL,
    'pending',
    false,
    v_cycle_number
  )
  RETURNING id INTO v_pick_id;

  RETURN v_pick_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.make_pick(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.make_pick(uuid, integer, text) TO authenticated;
