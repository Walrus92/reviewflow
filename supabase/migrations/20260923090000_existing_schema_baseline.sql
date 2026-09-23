-- Baseline reconstructed from the existing ReviewFlow project on 2026-09-23.
-- IF NOT EXISTS keeps this migration safe when synchronizing with the original project.
-- It creates structure only; production data stays in the original database.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  business_name text,
  google_review_url text,
  instagram_url text,
  wifi_ssid text,
  wifi_password text,
  custom_cta text,
  created_at timestamptz DEFAULT now(),
  slug text UNIQUE,
  types text[],
  place_id text,
  address text,
  rating numeric,
  reviews integer,
  lat numeric,
  lng numeric
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.magic_links (
  email text NOT NULL,
  token text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating numeric,
  review_count integer,
  created_at timestamptz DEFAULT now(),
  data jsonb,
  place_id text
);

CREATE TABLE IF NOT EXISTS public.competitors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  name text,
  rating numeric,
  review_count integer,
  address text,
  lat numeric,
  lng numeric,
  types text[],
  created_at timestamptz DEFAULT now(),
  CONSTRAINT competitors_unique_place UNIQUE (place_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.competitor_relations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id),
  competitor_id bigint REFERENCES public.competitors(id),
  distance_m integer,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitor_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  competitor_id bigint REFERENCES public.competitors(id) ON DELETE CASCADE,
  rating numeric,
  review_count integer,
  created_at timestamptz DEFAULT now(),
  place_id text,
  data jsonb
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now(),
  subject_type text DEFAULT 'own',
  subject_place_id text,
  seen boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.analytics_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  user_agent text,
  ip inet
);

CREATE TABLE IF NOT EXISTS public.analytics_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('google', 'instagram')),
  created_at timestamptz DEFAULT now(),
  user_agent text,
  ip inet
);
