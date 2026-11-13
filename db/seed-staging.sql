-- Seed data for staging environment
-- Run this in the Supabase SQL editor for your staging project

-- Replace IDs if they collide with existing data in your project

-- 1) Competition
INSERT INTO competitions (id, name, cycle_number, current_gameweek, join_code, status, created_by, description, created_at, updated_at)
VALUES (
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  'Staging League',
  1,
  6,
  'STAGE123',
  'open',
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  'Free-to-play staging league. Bragging rights only — no entry fee and no prizes.',
  NOW(),
  NOW()
);

-- 2) Players
INSERT INTO competition_players (id, competition_id, user_id, display_name, status, joined_at)
VALUES
  ('11111111-1111-4111-1111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '22222222-2222-4222-2222-222222222222', 'Alice', 'alive', NOW()),
  ('33333333-3333-4333-3333-333333333333', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Bob', 'alive', NOW()),
  ('55555555-5555-4555-5555-555555555555', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '66666666-6666-4666-6666-666666666666', 'Charlie', 'eliminated', NOW());

-- 3) Picks (current cycle = 1)
INSERT INTO picks (id, competition_id, player_id, gameweek, cycle_number, team_name, created_at)
VALUES
  ('p1111111-1111-4111-1111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '11111111-1111-4111-1111-111111111111', 6, 1, 'Newcastle United FC', NOW()),
  ('p3333333-3333-4333-3333-333333333333', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '33333333-3333-4333-3333-333333333333', 6, 1, 'Manchester City FC', NOW()),
  ('p5555555-5555-4555-5555-555555555555', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '55555555-5555-4555-5555-555555555555', 5, 1, 'Chelsea FC', NOW());

-- Optional: mark a winner (uncomment to test finished state)
-- UPDATE competitions SET winner_player_id = '11111111-1111-4111-1111-111111111111', status = 'finished' WHERE id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
