-- Ensure competition_id in pick_reminders_sent is uuid
alter table if exists public.pick_reminders_sent
  alter column competition_id type uuid using competition_id::text::uuid;

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
      c.cycle_number as current_cycle,
      min(f.utc_date) as first_kickoff
    from public.competitions c
    join public.fixtures_cache f on f.matchday = c.current_gameweek
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
    cp.user_id as player_id,
    u.email::text as player_email,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as player_name,
    tc.gw,
    tc.current_cycle,
    tc.first_kickoff as deadline,
    tc.target_window
  from timed_comps tc
  join public.competition_players cp
    on cp.competition_id = tc.comp_id
   and cp.status = 'alive'
  join auth.users u
    on u.id = cp.user_id
  where tc.target_window is not null
    -- Player has not submitted a pick for this gameweek and cycle
    and not exists (
      select 1 from public.picks p
      where p.competition_id = tc.comp_id
        and p.player_id = cp.user_id
        and p.gameweek = tc.gw
        and p.cycle_number = tc.current_cycle
    )
    -- Reminder has not already been sent for this window
    and not exists (
      select 1 from public.pick_reminders_sent prs
      where prs.competition_id = tc.comp_id
        and prs.player_id = cp.user_id
        and prs.gameweek = tc.gw
        and prs.cycle_number = tc.current_cycle
        and prs.reminder_window = tc.target_window
    );
end;
$$;
