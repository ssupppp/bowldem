-- Migration: Add email column to leaderboard_entries
-- Purpose: Allow optional email linking for leaderboard persistence across devices
-- Date: 2026-01-27

-- Add email column to leaderboard_entries for optional persistence
ALTER TABLE leaderboard_entries
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;

-- Create index for email lookups (partial index for non-null emails only)
CREATE INDEX IF NOT EXISTS idx_leaderboard_email
ON leaderboard_entries(email)
WHERE email IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN leaderboard_entries.email IS 'Optional email for cross-device persistence. Users can link email after submission to track historical entries.';

-- Note: No constraint for unique email per puzzle date since:
-- 1. Users might play on multiple devices before linking email
-- 2. The device_id is still the primary duplicate prevention mechanism
-- 3. Email linking is optional and happens post-submission
