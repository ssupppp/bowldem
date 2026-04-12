-- 008_autoacquire.sql
-- AutoAcquire: Self-improving Meta ad acquisition system
-- Tables for campaigns, experiments, ad variants, attribution, and learnings

-- ============================================================================
-- Ad Campaigns (mirrors Meta campaign structure, tracked locally)
-- ============================================================================

CREATE TABLE IF NOT EXISTS aq_campaigns (
  id BIGSERIAL PRIMARY KEY,
  meta_campaign_id TEXT UNIQUE,          -- Meta's campaign ID (null before deployed)
  name TEXT NOT NULL,
  objective TEXT DEFAULT 'OUTCOME_TRAFFIC',
  status TEXT DEFAULT 'draft',           -- draft, pending_review, active, paused, completed
  daily_budget_paise INTEGER NOT NULL,   -- in paise (₹500 = 50000)
  total_spend_paise INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  meta_data JSONB DEFAULT '{}'           -- full Meta API response, targeting spec, etc.
);

-- ============================================================================
-- Ad Experiments (a cycle = one experiment, 3-day window)
-- ============================================================================

CREATE TABLE IF NOT EXISTS aq_experiments (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES aq_campaigns(id),
  cycle_number INTEGER NOT NULL,
  experiment_type TEXT NOT NULL,          -- cold_start, copy_test, creative_test, audience_test, exploit, explore_near, explore_far
  status TEXT DEFAULT 'running',         -- running, evaluating, completed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  evaluation JSONB,                      -- { winner_variant_id, summary, metrics_snapshot }
  config JSONB DEFAULT '{}'              -- experiment parameters, what's being tested
);

-- ============================================================================
-- Ad Variants (individual ads within an experiment)
-- ============================================================================

CREATE TABLE IF NOT EXISTS aq_variants (
  id BIGSERIAL PRIMARY KEY,
  experiment_id BIGINT REFERENCES aq_experiments(id),
  meta_ad_id TEXT,                       -- Meta's ad ID (null before deployed)
  meta_adset_id TEXT,                    -- Meta's ad set ID
  meta_creative_id TEXT,                 -- Meta's creative ID
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',           -- draft, pending_review, active, paused, killed, winner

  -- Creative content (what the agent generates)
  hook TEXT,                             -- first line / attention grabber
  body_text TEXT,                        -- primary text
  headline TEXT,                         -- headline (27 char recommended)
  cta_type TEXT DEFAULT 'LEARN_MORE',    -- Meta CTA enum
  image_url TEXT,                        -- uploaded image URL / hash
  image_prompt TEXT,                     -- prompt used to generate the image (if AI-generated)

  -- Targeting
  targeting JSONB DEFAULT '{}',          -- age, geo, interests, etc.

  -- Budget
  budget_type TEXT DEFAULT 'explore_far', -- exploit, explore_near, explore_far
  daily_budget_paise INTEGER,
  total_spend_paise INTEGER DEFAULT 0,

  -- Metrics (updated by evaluation loop)
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,           -- click-through rate %
  cpc_paise INTEGER DEFAULT 0,          -- cost per click in paise
  cpm_paise INTEGER DEFAULT 0,          -- cost per 1000 impressions
  reach INTEGER DEFAULT 0,
  frequency DECIMAL(6,2) DEFAULT 0,
  landing_page_views INTEGER DEFAULT 0,
  subscriptions INTEGER DEFAULT 0,       -- attributed subscriptions
  cac_paise INTEGER DEFAULT 0,          -- cost per acquisition in paise

  -- Lineage (for mutation tracking)
  parent_variant_id BIGINT REFERENCES aq_variants(id),
  mutation_type TEXT,                    -- null for originals, 'hook', 'body', 'creative', 'audience', 'wild_card'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  killed_at TIMESTAMPTZ,
  meta_data JSONB DEFAULT '{}'           -- full Meta API response
);

CREATE INDEX IF NOT EXISTS idx_aq_variants_experiment ON aq_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_aq_variants_status ON aq_variants(status);
CREATE INDEX IF NOT EXISTS idx_aq_variants_meta_ad ON aq_variants(meta_ad_id);

-- ============================================================================
-- Ad Attribution (links site visits + subscriptions back to ads)
-- ============================================================================

CREATE TABLE IF NOT EXISTS aq_attributions (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT,                        -- bowldem_device_id
  session_id TEXT,

  -- UTM params captured on landing
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,                     -- maps to meta campaign ID
  utm_content TEXT,                      -- maps to meta ad ID
  utm_term TEXT,                         -- maps to meta adset ID
  fbclid TEXT,                           -- Facebook click ID

  -- Funnel events
  landed_at TIMESTAMPTZ DEFAULT NOW(),
  puzzle_played_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  auth_signed_up_at TIMESTAMPTZ,

  -- User identity (filled in on subscribe/auth)
  email TEXT,
  auth_user_id UUID,

  -- Attribution status
  converted BOOLEAN DEFAULT FALSE,       -- did they subscribe?
  conversion_type TEXT,                  -- 'email_subscribe', 'auth_signup', null

  -- CAPI status
  capi_sent BOOLEAN DEFAULT FALSE,
  capi_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aq_attr_device ON aq_attributions(device_id);
CREATE INDEX IF NOT EXISTS idx_aq_attr_fbclid ON aq_attributions(fbclid);
CREATE INDEX IF NOT EXISTS idx_aq_attr_utm ON aq_attributions(utm_source, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_aq_attr_converted ON aq_attributions(converted) WHERE converted = true;

-- ============================================================================
-- Ad Learnings (structured knowledge the agent accumulates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS aq_learnings (
  id BIGSERIAL PRIMARY KEY,
  cycle_number INTEGER,
  category TEXT NOT NULL,                -- copy, creative, audience, placement, timing, landing
  dimension TEXT NOT NULL,               -- hook, body, cta, tone, image_style, age, geo, interests
  finding TEXT NOT NULL,                 -- human-readable finding
  confidence TEXT DEFAULT 'low',         -- low, medium, high
  evidence JSONB DEFAULT '{}',           -- { winner_id, loser_id, metric, values, sample_sizes, p_value }
  implication TEXT,                      -- action item for future cycles
  superseded_by BIGINT REFERENCES aq_learnings(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aq_learnings_category ON aq_learnings(category, dimension);

-- ============================================================================
-- Strategy Config (agent reads this each cycle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS aq_strategy (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default strategy
INSERT INTO aq_strategy (key, value) VALUES
  ('budget', '{"daily_cap_paise": 50000, "platform": "meta"}'),
  ('goals', '{"primary_metric": "subscription_conversion", "target_cac_paise": 1500, "min_impressions_before_judge": 1000, "min_clicks_before_judge": 30}'),
  ('cycle', '{"duration_days": 3, "max_concurrent_variants": 4, "early_kill_threshold": 0.5, "min_spend_before_kill_paise": 50000}'),
  ('allocation', '{"exploit_pct": 50, "explore_near_pct": 30, "explore_far_pct": 20}'),
  ('brand', '{"voice": "fun, cricket-nerdy, not corporate", "no_clickbait": true, "product_name": "Bowldem", "url": "https://bowldem.com", "tagline": "Guess the Man of the Match", "player_count": 1099, "puzzle_count": 117}'),
  ('audiences', '{"primary": {"geo": ["IN"], "age_min": 18, "age_max": 44, "genders": [1, 2], "interests": ["cricket"]}, "secondary": {"geo": ["GB", "AU", "PK", "BD", "ZA"], "age_min": 18, "age_max": 44}}'),
  ('meta_account', '{"pixel_id": "914591388051991", "ad_account_id": "26284501", "page_id": "1119272264595136", "system_user_token": null}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE aq_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE aq_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE aq_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE aq_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aq_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE aq_strategy ENABLE ROW LEVEL SECURITY;

-- All aq_ tables: service role full access, anon can only insert attributions
CREATE POLICY "Service role manages campaigns" ON aq_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages experiments" ON aq_experiments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages variants" ON aq_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages learnings" ON aq_learnings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages strategy" ON aq_strategy FOR ALL USING (true) WITH CHECK (true);

-- Attributions: anon can insert (frontend landing), service role can read/update
CREATE POLICY "Anyone can create attribution" ON aq_attributions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service role manages attributions" ON aq_attributions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Views for the agent
-- ============================================================================

-- Active variant performance (agent reads this to evaluate)
CREATE OR REPLACE VIEW aq_active_performance AS
SELECT
  v.id as variant_id,
  v.name,
  v.experiment_id,
  e.cycle_number,
  e.experiment_type,
  v.status,
  v.budget_type,
  v.hook,
  v.headline,
  v.impressions,
  v.clicks,
  v.ctr,
  v.cpc_paise,
  v.reach,
  v.frequency,
  v.subscriptions,
  v.cac_paise,
  v.total_spend_paise,
  v.daily_budget_paise,
  v.created_at,
  v.parent_variant_id,
  v.mutation_type
FROM aq_variants v
JOIN aq_experiments e ON v.experiment_id = e.id
WHERE v.status IN ('active', 'pending_review')
ORDER BY v.ctr DESC;

-- Attribution funnel summary (per utm_content = ad ID)
CREATE OR REPLACE VIEW aq_funnel_summary AS
SELECT
  utm_content as ad_id,
  utm_campaign as campaign_id,
  COUNT(*) as landings,
  COUNT(puzzle_played_at) as plays,
  COUNT(subscribed_at) as subscriptions,
  ROUND(COUNT(puzzle_played_at)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1) as landing_to_play_pct,
  ROUND(COUNT(subscribed_at)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1) as landing_to_sub_pct
FROM aq_attributions
WHERE utm_source = 'meta'
GROUP BY utm_content, utm_campaign;
