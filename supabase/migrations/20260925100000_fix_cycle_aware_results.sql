CREATE OR REPLACE FUNCTION public.process_gameweek_results(p_competition_id uuid, p_gameweek integer DEFAULT NULL::integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_gw integer;
  v_season text;
  v_current_cycle integer;
  v_processed integer := 0;
  v_survivors integer;
  v_next_gw integer;
BEGIN
  SELECT current_gameweek, season, COALESCE(cycle_number, 1)
  INTO v_gw, v_season, v_current_cycle
  FROM public.competitions
  WHERE id = p_competition_id;

  IF v_gw IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  v_gw := COALESCE(p_gameweek, v_gw);

  -- 1. Grade only picks in the active cycle for the selected gameweek.
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
    AND COALESCE(p.cycle_number, 1) = v_current_cycle
    AND f.season = v_season
    AND f.matchday = v_gw
    AND (f.home_team_id = p.team_id OR f.away_team_id = p.team_id)
    AND upper(f.status) IN ('POSTPONED','PST','FINISHED','FT','AWARDED');

  GET DIAGNOSTICS v_processed = row_count;

  -- 2. Eliminate alive players only when their current-cycle pick was a draw/loss.
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
        AND COALESCE(p.cycle_number, 1) = v_current_cycle
        AND p.status IN ('draw','loss')
    );

  -- 3. Check for total wipeout (zero alive players remain).
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
      SET status = 'finished', winner_player_id = NULL, updated_at = NOW()
      WHERE id = p_competition_id;
    END IF;
  END IF;

  RETURN v_processed;
END;
$function$;

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

  IF v_current_cycle IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  UPDATE public.competition_players
  SET
    status = 'alive',
    eliminated_gameweek = NULL
  WHERE competition_id = p_competition_id;

  UPDATE public.competitions
  SET
    current_gameweek = p_next_gameweek,
    cycle_number = v_current_cycle + 1,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_competition_id;
END;
$$;
