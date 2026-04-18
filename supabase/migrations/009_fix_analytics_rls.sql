-- ============================================================================
-- 009: Fix analytics_events RLS so anon inserts work again
--
-- Diagnosis (2026-04-16): client-side insert from bowldem.com returns
--   42501: new row violates row-level security policy for table "analytics_events"
-- Migration 003 declared an INSERT policy, but it's either missing on prod
-- or was superseded. This migration drops any existing policies on the
-- table and re-creates the intended ones idempotently.
-- ============================================================================

-- Ensure RLS is enabled (safe no-op if already)
ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies with the intended names (idempotent)
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Authenticated users can read analytics" ON analytics_events;
DROP POLICY IF EXISTS "anon_insert_analytics_events" ON analytics_events;
DROP POLICY IF EXISTS "auth_read_analytics_events" ON analytics_events;

-- Recreate: anon + authenticated can insert any event
CREATE POLICY "anon_insert_analytics_events"
  ON analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Recreate: authenticated can read (for admin/dashboard use)
CREATE POLICY "auth_read_analytics_events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Also grant the INSERT privilege explicitly to anon — RLS policies require
-- the underlying table grant as well. This is a no-op if already granted.
GRANT INSERT ON analytics_events TO anon;
GRANT INSERT ON analytics_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE analytics_events_id_seq TO anon, authenticated;
