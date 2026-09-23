-- Preserve legacy rows while requiring explicit provenance for new captures.
ALTER TABLE public.review_snapshots
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS capture_key text;

ALTER TABLE public.competitor_snapshots
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS capture_key text;

UPDATE public.review_snapshots
SET source_kind = 'legacy_google_places', observed_at = created_at
WHERE source_kind IS NULL OR observed_at IS NULL;

UPDATE public.competitor_snapshots
SET source_kind = 'legacy_google_places', observed_at = created_at
WHERE source_kind IS NULL OR observed_at IS NULL;

ALTER TABLE public.review_snapshots
  ALTER COLUMN source_kind SET NOT NULL,
  ALTER COLUMN observed_at SET NOT NULL;

ALTER TABLE public.competitor_snapshots
  ALTER COLUMN source_kind SET NOT NULL,
  ALTER COLUMN observed_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS review_snapshots_capture_key_unique
  ON public.review_snapshots (capture_key) WHERE capture_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS competitor_snapshots_capture_key_unique
  ON public.competitor_snapshots (capture_key) WHERE capture_key IS NOT NULL;
