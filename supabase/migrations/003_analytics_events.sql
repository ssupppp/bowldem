-- Analytics Events Table
-- Stores all user interaction events for analysis

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  device_id TEXT NOT NULL,
  session_id TEXT,
  category TEXT NOT NULL,  -- page_view, game, feature, button, funnel, session
  action TEXT NOT NULL,    -- specific action within category
  properties JSONB DEFAULT '{}',  -- flexible event properties
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT valid_category CHECK (category IN ('page_view', 'game', 'feature', 'button', 'funnel', 'session'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_device ON analytics_events(device_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_category ON analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_analytics_action ON analytics_events(action);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_category_action ON analytics_events(category, action);

-- Composite index for funnel analysis
CREATE INDEX IF NOT EXISTS idx_analytics_funnel ON analytics_events(device_id, category, action, created_at);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert events (anonymous users)
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can read (for admin dashboard)
CREATE POLICY "Authenticated users can read analytics"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- Analytics Views for common queries
-- ============================================================================

-- Daily Active Users
CREATE OR REPLACE VIEW analytics_dau AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT device_id) as unique_devices,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_events
FROM analytics_events
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Event Summary by Category
CREATE OR REPLACE VIEW analytics_event_summary AS
SELECT
  category,
  action,
  COUNT(*) as count,
  COUNT(DISTINCT device_id) as unique_users,
  DATE(MIN(created_at)) as first_seen,
  DATE(MAX(created_at)) as last_seen
FROM analytics_events
GROUP BY category, action
ORDER BY count DESC;

-- Game Funnel Analysis
CREATE OR REPLACE VIEW analytics_game_funnel AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT CASE WHEN action = 'app_opened' THEN device_id END) as opened,
  COUNT(DISTINCT CASE WHEN action = 'tutorial_seen' THEN device_id END) as saw_tutorial,
  COUNT(DISTINCT CASE WHEN action = 'game_started' THEN device_id END) as started_game,
  COUNT(DISTINCT CASE WHEN action = 'first_guess' THEN device_id END) as made_guess,
  COUNT(DISTINCT CASE WHEN action = 'game_won' THEN device_id END) as won,
  COUNT(DISTINCT CASE WHEN action = 'game_lost' THEN device_id END) as lost,
  COUNT(DISTINCT CASE WHEN action = 'share_completed' THEN device_id END) as shared
FROM analytics_events
WHERE category = 'funnel'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Feature Usage
CREATE OR REPLACE VIEW analytics_feature_usage AS
SELECT
  action as feature,
  COUNT(*) as usage_count,
  COUNT(DISTINCT device_id) as unique_users,
  DATE(MAX(created_at)) as last_used
FROM analytics_events
WHERE category = 'feature'
GROUP BY action
ORDER BY usage_count DESC;

-- Button Taps
CREATE OR REPLACE VIEW analytics_button_taps AS
SELECT
  properties->>'button_name' as button,
  COUNT(*) as tap_count,
  COUNT(DISTINCT device_id) as unique_users
FROM analytics_events
WHERE category = 'button'
GROUP BY properties->>'button_name'
ORDER BY tap_count DESC;

-- ============================================================================
-- Contact Subscriptions Table (for notifications)
-- This may already exist, but ensure it has all needed columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email TEXT,
  phone_number TEXT,
  preferred_channel TEXT DEFAULT 'whatsapp',  -- 'email', 'whatsapp', 'sms'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one contact method required
  CONSTRAINT contact_required CHECK (email IS NOT NULL OR phone_number IS NOT NULL),

  -- Unique constraint on email if provided
  CONSTRAINT unique_email UNIQUE (email),

  -- Unique constraint on phone if provided
  CONSTRAINT unique_phone UNIQUE (phone_number)
);

-- Index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON contact_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON contact_subscriptions(preferred_channel);

-- RLS for contact_subscriptions
ALTER TABLE contact_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (subscribe)
CREATE POLICY "Anyone can subscribe"
  ON contact_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated can read (admin)
CREATE POLICY "Authenticated can read subscriptions"
  ON contact_subscriptions
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE analytics_events IS 'User interaction events for analytics and funnel analysis';
COMMENT ON TABLE contact_subscriptions IS 'Email and phone subscriptions for puzzle notifications';
