-- 005_auth_user_profiles.sql
-- Links existing tables to auth.users and creates user_profiles

-- Add auth_user_id to existing tables
ALTER TABLE leaderboard_entries ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Create index for auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_auth_user ON leaderboard_entries(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_subs_auth_user ON email_subscribers(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Game-specific user profile (supplements auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name VARCHAR(20),
  device_ids TEXT[] DEFAULT '{}',
  local_stats JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow anon key to insert/update user_profiles (for migration flow via client)
CREATE POLICY "Service role can manage profiles"
  ON user_profiles FOR ALL
  USING (true)
  WITH CHECK (true);
