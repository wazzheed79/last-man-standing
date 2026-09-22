-- Harden make_pick: respect allow_pick_changes and deadline when changing a pick.
-- Postponed picks can always be re-selected.
-- Run in Supabase SQL Editor.

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
declare
  v_user_id uuid := auth.uid();
  v_player_id uuid;
  v_current_gw integer;
  v_pick_id uuid;
  v_existing_team_id integer;
  v_existing_status text;
  v_competition_status text;
  v_allow_pick_changes boolean;
  v_deadline timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select cp.id
  into v_player_id
  from public.competition_players cp
  where cp.competition_id = p_competition_id
    and cp.user_id = v_user_id
    and cp.status = 'alive';

  if v_player_id is null then
    raise exception 'You are not an active player in this competition';
  end if;

  select c.current_gameweek, c.status, coalesce(c.allow_pick_changes, true)
  into v_current_gw, v_competition_status, v_allow_pick_changes
  from public.competitions c
  where c.id = p_competition_id;

  if v_current_gw is null then
    raise exception 'Competition not found';
  end if;

  if v_competition_status not in ('open', 'active') then
    raise exception 'This competition is no longer accepting picks';
  end if;

  select p.id, p.team_id, p.status
  into v_pick_id, v_existing_team_id, v_existing_status
  from public.picks p
  where p.competition_id = p_competition_id
    and p.player_id = v_player_id
    and p.gameweek = v_current_gw
  for update;

  v_deadline := public.get_gameweek_deadline(p_competition_id, v_current_gw);

  -- Changing an existing (non-postponed) pick
  if v_pick_id is not null and v_existing_status is distinct from 'postponed' then
    if not v_allow_pick_changes then
      raise exception 'This league does not allow changing picks once submitted';
    end if;
    if v_deadline is not null and now() >= v_deadline then
      raise exception 'The pick deadline has passed';
    end if;
  end if;

  -- First pick of the week after deadline
  if v_pick_id is null and v_deadline is not null and now() >= v_deadline then
    raise exception 'The pick deadline has passed';
  end if;

  if not exists (
    select 1
    from public.fixtures_cache f
    where f.season = (select c.season from public.competitions c where c.id = p_competition_id)
      and f.matchday = v_current_gw
      and (f.home_team_id = p_team_id or f.away_team_id = p_team_id)
  ) then
    raise exception 'This team is not playing in the current gameweek';
  end if;

  if exists (
    select 1
    from public.picks p
    where p.competition_id = p_competition_id
      and p.player_id = v_player_id
      and p.team_id = p_team_id
      and p.gameweek <> v_current_gw
  ) then
    raise exception 'You have already used this team';
  end if;

  if v_pick_id is not null then
    update public.picks
    set team_id = p_team_id,
        team_name = p_team_name,
        result = null,
        status = 'pending',
        deadline_exempt = (v_existing_status = 'postponed'),
        created_at = now()
    where id = v_pick_id;

    return v_pick_id;
  end if;

  insert into public.picks (
    competition_id, player_id, gameweek, team_id, team_name, result, status, deadline_exempt
  )
  values (
    p_competition_id, v_player_id, v_current_gw, p_team_id, p_team_name, null, 'pending', false
  )
  returning id into v_pick_id;

  return v_pick_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.make_pick(uuid, integer, text) TO authenticated;
