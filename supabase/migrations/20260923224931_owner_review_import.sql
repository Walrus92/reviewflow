CREATE TABLE public.owner_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NOT NULL CHECK (char_length(review_text) BETWEEN 5 AND 2000),
  published_at date NOT NULL,
  source_kind text NOT NULL DEFAULT 'owner_csv' CHECK (source_kind = 'owner_csv'),
  source_label text NOT NULL CHECK (char_length(source_label) BETWEEN 3 AND 120),
  rights_confirmed_at timestamptz NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, fingerprint)
);

CREATE INDEX owner_reviews_profile_published_idx
  ON public.owner_reviews (profile_id, published_at DESC, id DESC);

ALTER TABLE public.owner_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.owner_reviews FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.owner_reviews TO service_role;
