ALTER TABLE public.owner_reviews
  ADD COLUMN source_review_id text CHECK (source_review_id IS NULL OR char_length(source_review_id) BETWEEN 1 AND 200);

GRANT UPDATE ON public.owner_reviews TO service_role;

CREATE INDEX owner_reviews_published_retention_idx ON public.owner_reviews (published_at);
