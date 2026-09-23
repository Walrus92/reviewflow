CREATE TABLE public.google_business_connections (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  location_name text NOT NULL,
  account_name text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_capture_at timestamptz,
  last_error text
);

ALTER TABLE public.google_business_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_business_connections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_business_connections TO service_role;

ALTER TABLE public.google_business_connections ADD CONSTRAINT google_business_location_name_format
  CHECK (location_name ~ '^accounts/[^/]+/locations/[^/]+$');
