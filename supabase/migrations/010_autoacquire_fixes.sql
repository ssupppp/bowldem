-- 010_autoacquire_fixes.sql
-- Fixes identified during the 2026-04-20 gap audit:
--   1. aq_funnel_summary view grouped by utm_content, which the agent never
--      populates (only utm_term carries the adset-id / variant identifier).
--      The view was empty since launch and broke downstream analytics.
--   2. Seeded strategy.meta_account.pixel_id still pointed at the old BM
--      pixel (914591388051991) which the personal ad account cannot read.
--      Update to the personal-account pixel (1626935348426327).
--   3. Added strategy.goals.optimization_goal so the agent can flip from
--      LINK_CLICKS to OFFSITE_CONVERSIONS (or similar) once a mid-funnel
--      custom conversion exists on Meta — see autoacquire-agent deployToMeta.
-- All statements are idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Rebuild aq_funnel_summary keyed on utm_term (adset id = variant id)
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS aq_funnel_summary;

CREATE VIEW aq_funnel_summary AS
SELECT
  a.utm_term AS adset_id,
  a.utm_campaign AS campaign_id,
  v.id AS variant_id,
  v.name AS variant_name,
  v.status AS variant_status,
  COUNT(*) AS landings,
  COUNT(a.puzzle_played_at) AS plays,
  COUNT(a.subscribed_at) AS subscriptions,
  ROUND(COUNT(a.puzzle_played_at)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1) AS landing_to_play_pct,
  ROUND(COUNT(a.subscribed_at)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1) AS landing_to_sub_pct,
  ROUND(COUNT(a.subscribed_at)::DECIMAL / NULLIF(COUNT(a.puzzle_played_at), 0) * 100, 1) AS play_to_sub_pct
FROM aq_attributions a
LEFT JOIN aq_variants v ON v.meta_adset_id = a.utm_term
WHERE a.utm_source = 'meta'
GROUP BY a.utm_term, a.utm_campaign, v.id, v.name, v.status;

-- ---------------------------------------------------------------------------
-- 2. Update seeded meta_account strategy to the current pixel. The env var
--    META_PIXEL_ID is the operational source of truth for CAPI; this row is
--    informational but the old value was misleading every reader.
-- ---------------------------------------------------------------------------

UPDATE aq_strategy
SET value = jsonb_set(
      value,
      '{pixel_id}',
      '"1626935348426327"'::jsonb,
      false
    ),
    updated_at = NOW()
WHERE key = 'meta_account';

-- ---------------------------------------------------------------------------
-- 3. Register optimization_goal in strategy.goals (default keeps current
--    behavior so flipping is a one-line DB update, not a code change).
-- ---------------------------------------------------------------------------

UPDATE aq_strategy
SET value = jsonb_set(
      value,
      '{optimization_goal}',
      '"LINK_CLICKS"'::jsonb,
      true
    ),
    updated_at = NOW()
WHERE key = 'goals'
  AND NOT (value ? 'optimization_goal');
