-- ============================================================================
-- 007: Analytics RPC functions + pg_cron schedules
-- For send-daily-analytics and seed-daily-leaderboard edge functions
-- ============================================================================

-- RPC: Count unique players for a given date (excluding seeds)
CREATE OR REPLACE FUNCTION count_unique_players(target_date DATE)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT device_id)::INTEGER
  FROM leaderboard_entries
  WHERE puzzle_date = target_date
    AND is_seed = FALSE
    AND device_id IS NOT NULL;
$$ LANGUAGE SQL STABLE;

-- RPC: Calculate win rate for a given date (excluding seeds)
CREATE OR REPLACE FUNCTION calc_win_rate(target_date DATE)
RETURNS INTEGER AS $$
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(AVG(won::int) * 100)::INTEGER
  END
  FROM leaderboard_entries
  WHERE puzzle_date = target_date
    AND is_seed = FALSE;
$$ LANGUAGE SQL STABLE;

-- RPC: Calculate average guesses for winners on a given date (excluding seeds)
CREATE OR REPLACE FUNCTION calc_avg_guesses(target_date DATE)
RETURNS NUMERIC AS $$
  SELECT ROUND(AVG(guesses_used)::NUMERIC, 2)
  FROM leaderboard_entries
  WHERE puzzle_date = target_date
    AND is_seed = FALSE
    AND won = TRUE;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- pg_cron schedules (run these manually in SQL Editor if pg_cron is enabled)
-- ============================================================================

-- Seed leaderboard at 00:15 UTC daily
-- SELECT cron.schedule(
--   'seed-daily-leaderboard',
--   '15 0 * * *',
--   $$SELECT net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/seed-daily-leaderboard',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
--   );$$
-- );

-- Send analytics at 03:00 UTC daily
-- SELECT cron.schedule(
--   'send-daily-analytics',
--   '0 3 * * *',
--   $$SELECT net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-analytics',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
--   );$$
-- );
