-- Bowldem Community Features - Supabase Schema
-- Run this in your Supabase SQL Editor to create the necessary tables

-- ============================================================================
-- LEADERBOARD ENTRIES TABLE
-- Stores puzzle completion results for leaderboard display
-- ============================================================================

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(20) NOT NULL,
  device_id VARCHAR(100),  -- Anonymous device identifier
  puzzle_date DATE NOT NULL,
  puzzle_number INT NOT NULL,
  guesses_used INT NOT NULL CHECK (guesses_used >= 1 AND guesses_used <= 5),  -- 1-4 for wins, 5 for losses
  won BOOLEAN NOT NULL,
  is_seed BOOLEAN DEFAULT FALSE,  -- For seeded/fake data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast puzzle leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_puzzle
ON leaderboard_entries(puzzle_date, guesses_used, created_at);

-- Index for device ID lookups (checking if already submitted)
CREATE INDEX IF NOT EXISTS idx_leaderboard_device
ON leaderboard_entries(puzzle_date, device_id);

-- Index for all-time leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_display_name
ON leaderboard_entries(display_name, won);

-- Unique constraint: one entry per device per puzzle
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_device_puzzle
ON leaderboard_entries(puzzle_date, device_id)
WHERE device_id IS NOT NULL;

-- ============================================================================
-- CONTACT SUBSCRIPTIONS TABLE
-- Stores email/phone for daily puzzle notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  phone_number VARCHAR(20),
  preferred_channel VARCHAR(10) DEFAULT 'email' CHECK (preferred_channel IN ('email', 'sms')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT has_contact CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_email
ON contact_subscriptions(email)
WHERE email IS NOT NULL;

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_phone
ON contact_subscriptions(phone_number)
WHERE phone_number IS NOT NULL;

-- Index for active subscriptions (for sending notifications)
CREATE INDEX IF NOT EXISTS idx_subscriptions_active
ON contact_subscriptions(is_active, preferred_channel)
WHERE is_active = TRUE;

-- Unique constraint on email (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_email
ON contact_subscriptions(email)
WHERE email IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS and set up policies for public access
-- ============================================================================

-- Enable RLS
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_subscriptions ENABLE ROW LEVEL SECURITY;

-- Leaderboard: Anyone can read
CREATE POLICY "Leaderboard entries are viewable by everyone"
ON leaderboard_entries FOR SELECT
USING (true);

-- Leaderboard: Anyone can insert (anonymous submissions)
CREATE POLICY "Anyone can submit to leaderboard"
ON leaderboard_entries FOR INSERT
WITH CHECK (
  NOT is_seed  -- Prevent seeding via public API
);

-- Contact subscriptions: Anyone can insert
CREATE POLICY "Anyone can subscribe to notifications"
ON contact_subscriptions FOR INSERT
WITH CHECK (true);

-- Contact subscriptions: Users can update their own (by email)
CREATE POLICY "Users can update own subscription"
ON contact_subscriptions FOR UPDATE
USING (true);

-- ============================================================================
-- HELPER FUNCTIONS (Optional)
-- ============================================================================

-- Function to get user ranking for a puzzle
CREATE OR REPLACE FUNCTION get_user_ranking(
  p_puzzle_date DATE,
  p_device_id VARCHAR(100)
)
RETURNS INT AS $$
DECLARE
  user_rank INT;
BEGIN
  SELECT rank INTO user_rank
  FROM (
    SELECT
      device_id,
      ROW_NUMBER() OVER (
        ORDER BY won DESC, guesses_used ASC, created_at ASC
      ) as rank
    FROM leaderboard_entries
    WHERE puzzle_date = p_puzzle_date
  ) ranked
  WHERE device_id = p_device_id;

  RETURN user_rank;
END;
$$ LANGUAGE plpgsql;

-- Function to get puzzle stats
CREATE OR REPLACE FUNCTION get_puzzle_stats(p_puzzle_date DATE)
RETURNS TABLE (
  total_players BIGINT,
  total_winners BIGINT,
  avg_guesses NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_players,
    COUNT(*) FILTER (WHERE won = true) as total_winners,
    ROUND(AVG(guesses_used) FILTER (WHERE won = true), 2) as avg_guesses
  FROM leaderboard_entries
  WHERE puzzle_date = p_puzzle_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE SEED DATA (for testing)
-- Uncomment and modify to add test data
-- ============================================================================

/*
INSERT INTO leaderboard_entries (display_name, device_id, puzzle_date, puzzle_number, guesses_used, won, is_seed, created_at)
VALUES
  ('SwiftYorker22', 'seed_001', '2026-01-22', 8, 2, true, true, '2026-01-22 06:15:00+00'),
  ('GoldenSpinner', 'seed_002', '2026-01-22', 8, 3, true, true, '2026-01-22 07:30:00+00'),
  ('CricketKing99', 'seed_003', '2026-01-22', 8, 1, true, true, '2026-01-22 08:45:00+00'),
  ('ProBatsman', 'seed_004', '2026-01-22', 8, 4, true, true, '2026-01-22 09:00:00+00'),
  ('SixerHunter', 'seed_005', '2026-01-22', 8, 2, true, true, '2026-01-22 10:20:00+00');
*/

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. The leaderboard_entries table uses device_id for anonymous tracking.
--    This allows users to submit without accounts while preventing duplicates.
--
-- 2. The is_seed flag marks seeded/fake entries for social proof.
--    Use the seed_leaderboard.js script to generate these.
--
-- 3. The contact_subscriptions table stores notification preferences.
--    Actual sending requires additional setup (Edge Functions + email/SMS service).
--
-- 4. Row Level Security (RLS) is enabled with permissive policies.
--    Adjust these based on your security requirements.
--
-- 5. The guesses_used column uses 5 to represent a loss (4 guesses, didn't win).
--    Values 1-4 represent successful completions.
--
