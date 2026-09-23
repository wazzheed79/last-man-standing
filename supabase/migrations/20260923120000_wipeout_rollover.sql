-- 1. Add cycle_number columns
ALTER TABLE public.competitions 
ADD COLUMN IF NOT EXISTS cycle_number integer DEFAULT 1;

ALTER TABLE public.picks 
ADD COLUMN IF NOT EXISTS cycle_number integer DEFAULT 1;

-- 2. Update unique constraint to allow team reuse in subsequent cycles
ALTER TABLE public.picks 
DROP CONSTRAINT IF EXISTS picks_competition_id_player_id_team_id_key;

ALTER TABLE public.picks 
DROP CONSTRAINT IF EXISTS picks_competition_player_team_cycle_key;

ALTER TABLE public.picks 
ADD CONSTRAINT picks_competition_player_team_cycle_key 
UNIQUE (competition_id, player_id, team_id, cycle_number);


-- 3. Dedicated Rollover Function
CREATE OR REPLACE FUNCTION public.handle_wipeout_rollover(p_competition_id uuid, p_next_gameweek integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_cycle integer;
BEGIN
  SELECT COALESCE(cycle_number, 1)
  INTO v_current_cycle
  FROM public.competitions
  WHERE id = p_competition_id;

  -- Revive every player who originally joined this competition
  UPDATE public.competition_players
  SET 
    status = 'alive',
    eliminated_gameweek = NULL
  WHERE competition_id = p_competition_id;

  -- Advance to the next gameweek and start the new cycle
  UPDATE public.competitions
  SET 
    current_gameweek = p_next_gameweek,
    cycle_number = v_current_cycle + 1,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_competition_id;
END;
$$;


-- 4. Update process_gameweek_results with Auto-Wipeout Rollover
CREATE OR REPLACE FUNCTION public.process_gameweek_results(p_competition_id uuid, p_gameweek integer DEFAULT NULL::integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_gw integer;
  v_season text;
  v_processed integer := 0;
  v_survivors integer;
  v_next_gw integer;
BEGIN
  SELECT current_gameweek, season
  INTO v_gw, v_season
  FROM public.competitions
  WHERE id = p_competition_id;

  IF v_gw IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  v_gw := COALESCE(p_gameweek, v_gw);

  -- 1. Grade picks against fixtures_cache
  UPDATE public.picks p
  SET
    status = CASE
      WHEN upper(f.status) IN ('POSTPONED','PST') THEN 'postponed'
      WHEN upper(f.status) IN ('FINISHED','FT','AWARDED') AND f.home_score > f.away_score
           AND f.home_team_id = p.team_id THEN 'win'
      WHEN upper(f.status) IN ('FINISHED','FT','AWARDED') AND f.away_score > f.home_score
           AND f.away_team_id = p.team_id THEN 'win'
      WHEN upper(f.status) IN ('FINISHED','FT','AWARDED') AND f.home_score = f.away_score THEN 'draw'
      WHEN upper(f.status) IN ('FINISHED','FT','AWARDED') THEN 'loss'
      ELSE p.status
    END,
    result = CASE
      WHEN upper(f.status) IN ('POSTPONED','PST') THEN NULL
      WHEN upper(f.status) IN ('FINISHED','FT','AWARDED') AND (
        (f.home_team_id = p.team_id AND f.home_score > f.away_score) OR
        (f.away_team_id = p.team_id AND f.away_score > f.home_score)
      ) THEN 'win'
      WHEN upper(f.status) IN ('FINISHED','FT','AWARDED') AND f.home_score = f.away_score THEN 'draw'
      WHEN upper(f.status) IN ('FINISHED','FT','AWARDED') THEN 'loss'
      ELSE p.result
    END
  FROM public.fixtures_cache f
  WHERE p.competition_id = p_competition_id
    AND p.gameweek = v_gw
    AND f.season = v_season
    AND f.matchday = v_gw
    AND (f.home_team_id = p.team_id OR f.away_team_id = p.team_id)
    AND upper(f.status) IN ('POSTPONED','PST','FINISHED','FT','AWARDED');

  GET DIAGNOSTICS v_processed = row_count;

  -- 2. Eliminate players who drew or lost
  UPDATE public.competition_players cp
  SET status = 'eliminated',
      eliminated_gameweek = v_gw
  WHERE cp.competition_id = p_competition_id
    AND cp.status = 'alive'
    AND EXISTS (
      SELECT 1
      FROM public.picks p
      WHERE p.player_id = cp.id
        AND p.competition_id = p_competition_id
        AND p.gameweek = v_gw
        AND p.status IN ('draw','loss')
    );

  -- 3. Check for total wipeout (zero alive players remain)
  SELECT COUNT(*)
  INTO v_survivors
  FROM public.competition_players
  WHERE competition_id = p_competition_id
    AND status = 'alive';

  IF v_survivors = 0 THEN
    SELECT MIN(matchday)
    INTO v_next_gw
    FROM public.fixtures_cache
    WHERE season = v_season
      AND matchday > v_gw;

    IF v_next_gw IS NOT NULL THEN
      PERFORM public.handle_wipeout_rollover(p_competition_id, v_next_gw);
    ELSE
      UPDATE public.competitions
      SET status = 'finished', winner_player_id = NULL
      WHERE id = p_competition_id;
    END IF;
  END IF;

  RETURN v_processed;
END;
$function$;


-- 5. Updated make_pick (Aware of cycle_number)
CREATE OR REPLACE FUNCTION public.make_pick(
  p_competition_id uuid,
  p_team_id integer,
  p_team_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  SELECT c.current_gameweek, c.status, COALESCE(c.allow_pick_changes, true), COALESCE(c.cycle_number, 1)
  INTO v_current_gw, v_competition_status, v_allow_pick_changes, v_cycle_number
  FROM public.competitions c
  WHERE c.id = p_competition_id;

  IF v_current_gw IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  IF v_competition_status NOT IN ('open', 'active') THEN
    RAISE EXCEPTION 'This competition is no longer accepting picks';
  END IF;

  SELECT p.id, p.team_id, p.status
  INTO v_pick_id, v_existing_team_id, v_existing_status
  FROM public.picks p
  WHERE p.competition_id = p_competition_id
    AND p.player_id = v_player_id
    AND p.gameweek = v_current_gw
  FOR UPDATE;

  v_deadline := public.get_gameweek_deadline(p_competition_id, v_current_gw);

  -- Changing an existing (non-postponed) pick
  IF v_pick_id IS NOT NULL AND v_existing_status IS DISTINCT FROM 'postponed' THEN
    IF NOT v_allow_pick_changes THEN
      RAISE EXCEPTION 'This league does not allow changing picks once submitted';
    END IF;
    IF v_deadline IS NOT NULL AND NOW() >= v_deadline THEN
      RAISE EXCEPTION 'The pick deadline has passed';
    END IF;
  END IF;

  -- First pick of the week after deadline
  IF v_pick_id IS NULL AND v_deadline IS NOT NULL AND NOW() >= v_deadline THEN
    RAISE EXCEPTION 'The pick deadline has passed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fixtures_cache f
    WHERE f.season = (SELECT c.season FROM public.competitions c WHERE c.id = p_competition_id)
      AND f.matchday = v_current_gw
      AND (f.home_team_id = p_team_id OR f.away_team_id = p_team_id)
  ) THEN
    RAISE EXCEPTION 'This team is not playing in the current gameweek';
  END IF;

  -- Verify team hasn't already been used IN THIS CYCLE
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
    competition_id, player_id, gameweek, team_id, team_name, result, status, deadline_exempt, cycle_number
  )
  VALUES (
    p_competition_id, v_player_id, v_current_gw, p_team_id, p_team_name, NULL, 'pending', false, v_cycle_number
  )
  RETURNING id INTO v_pick_id;

  RETURN v_pick_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.make_pick(uuid, integer, text) TO authenticated;
