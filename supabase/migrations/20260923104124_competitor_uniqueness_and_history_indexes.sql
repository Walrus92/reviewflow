CREATE UNIQUE INDEX competitors_global_place_id_key
  ON public.competitors (place_id) WHERE profile_id IS NULL;
CREATE UNIQUE INDEX competitor_relations_pair_key
  ON public.competitor_relations (profile_id, competitor_id)
  WHERE profile_id IS NOT NULL AND competitor_id IS NOT NULL;
CREATE INDEX review_snapshots_profile_created_idx
  ON public.review_snapshots (profile_id, created_at DESC);
CREATE INDEX competitor_snapshots_competitor_created_idx
  ON public.competitor_snapshots (competitor_id, created_at DESC);

-- Rollback: DROP INDEX public.competitor_snapshots_competitor_created_idx;
-- DROP INDEX public.review_snapshots_profile_created_idx;
-- DROP INDEX public.competitor_relations_pair_key;
-- DROP INDEX public.competitors_global_place_id_key;
