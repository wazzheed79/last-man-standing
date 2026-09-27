-- Reminder rows are keyed by competitions.id, which is UUID. Older table
-- creation used bigint; fail safely if legacy rows exist because those IDs
-- cannot be mapped back to a competition without an explicit migration map.
do $$
declare
  competition_id_type text;
begin
  select data_type
  into competition_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'pick_reminders_sent'
    and column_name = 'competition_id';

  if competition_id_type is null then
    raise exception 'public.pick_reminders_sent.competition_id is missing';
  end if;

  if competition_id_type <> 'uuid' then
    if exists (select 1 from public.pick_reminders_sent) then
      raise exception 'Cannot convert pick reminder competition IDs: legacy rows exist and need a mapping to competitions.id';
    end if;

    alter table public.pick_reminders_sent
      alter column competition_id type uuid
      using competition_id::text::uuid;
  end if;
end;
$$;

-- The live function still returns competition_id as bigint, so replace it
-- explicitly rather than attempting an incompatible CREATE OR REPLACE.
drop function if exists public.get_pending_pick_reminders();

create or replace function public.get_pending_pick_reminders()
returns table (
  competition_id uuid,
  competition_name text,
  player_id uuid,
  player_email text,
  player_name text,
  gameweek integer,
  cycle_number integer,
  deadline timestamptz,
  reminder_window text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
begin
  return query
  with active_comps as (
    select
      c.id as comp_id,
      c.name as comp_name,
      c.current_gameweek as gw,
      coalesce(c.cycle_number, 1) as current_cycle,
      min(f.utc_date) as first_kickoff
    from public.competitions c
    join public.fixtures_cache f
      on f.season = c.season
     and f.matchday = c.current_gameweek
    where c.status = 'active'
    group by c.id, c.name, c.current_gameweek, c.cycle_number
    having min(f.utc_date) > now_ts
  ),
  timed_comps as (
    select
      ac.*,
      case
        when ac.first_kickoff <= (now_ts + interval '2 hours') then '2h'
        when ac.first_kickoff <= (now_ts + interval '24 hours') then '24h'
        else null
      end as target_window
    from active_comps ac
  )
  select
    tc.comp_id,
    tc.comp_name,
    cp.user_id,
    u.email::text,
    coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1)
    ),
    tc.gw,
    tc.current_cycle,
    tc.first_kickoff,
    tc.target_window
  from timed_comps tc
  join public.competition_players cp
    on cp.competition_id = tc.comp_id
   and cp.status = 'alive'
  join auth.users u on u.id = cp.user_id
  where tc.target_window is not null
    and not exists (
      select 1
      from public.picks p
      where p.competition_id = tc.comp_id
        and p.player_id = cp.id
        and p.gameweek = tc.gw
        and coalesce(p.cycle_number, 1) = tc.current_cycle
    )
    and not exists (
      select 1
      from public.pick_reminders_sent prs
      where prs.competition_id = tc.comp_id
        and prs.player_id = cp.user_id
        and prs.gameweek = tc.gw
        and prs.cycle_number = tc.current_cycle
        and prs.reminder_window = tc.target_window
    );
end;
$$;

revoke all on function public.get_pending_pick_reminders() from public, anon, authenticated;
grant execute on function public.get_pending_pick_reminders() to service_role;

