-- 011_autoacquire_interests.sql
-- Seed cricket interest IDs into aq_strategy.audiences.primary.interests so
-- deployToMeta can push them into Meta's flexible_spec. Before this, the
-- interests field held string "cricket" which Meta silently dropped — new
-- ad sets ran broad (18-44 IN, no interest filter) and burned impressions
-- on non-cricket audiences.
--
-- IDs resolved via /search?type=adinterest&q=cricket on 2026-04-20.
-- Using a four-interest OR-bucket (single flexible_spec entry) to keep the
-- audience broad enough for Meta's ML to explore while filtering out pure
-- non-cricket traffic. Interests ordered rough broad → narrow.

UPDATE aq_strategy
SET value = jsonb_set(
      value,
      '{primary,interests}',
      '[
        {"id": "6002988344794", "name": "Cricket"},
        {"id": "6015435741683", "name": "ICC - International Cricket Council"},
        {"id": "6003228043699", "name": "India national cricket team"},
        {"id": "6003351883000", "name": "Cricket World Cup"}
      ]'::jsonb,
      false
    ),
    updated_at = NOW()
WHERE key = 'audiences';
