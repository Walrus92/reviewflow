-- Legacy competitor rows stay shared; owner-submitted observations belong to one profile.
ALTER TABLE public.competitor_snapshots
  ADD COLUMN IF NOT EXISTS source_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

UPDATE public.competitor_snapshots
SET source_profile_id = split_part(capture_key, ':', 2)::uuid
WHERE source_kind = 'manual_owner' AND source_profile_id IS NULL;

ALTER TABLE public.competitor_snapshots
  ADD CONSTRAINT competitor_manual_capture_has_owner
  CHECK (source_kind <> 'manual_owner' OR source_profile_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS competitor_snapshots_owner_recent_idx
  ON public.competitor_snapshots (source_profile_id, competitor_id, created_at DESC)
  WHERE source_profile_id IS NOT NULL;
