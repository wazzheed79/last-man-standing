create extension if not exists pgcrypto;

create table if not exists public.pick_reminders_sent (
  id uuid primary key default gen_random_uuid(),
  competition_id bigint not null,
  player_id uuid not null,
  gameweek integer not null,
  cycle_number integer not null default 1,
  reminder_window text not null check (reminder_window in ('24h', '2h')),
  sent_at timestamptz not null default now()
);

create unique index if not exists pick_reminders_sent_unique
  on public.pick_reminders_sent (competition_id, player_id, gameweek, cycle_number, reminder_window);

create index if not exists pick_reminders_sent_competition_idx
  on public.pick_reminders_sent (competition_id, sent_at);
