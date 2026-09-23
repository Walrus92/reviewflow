-- ReviewFlow currently accesses these tables from server routes with a
-- service-role client. There are no browser-side Supabase table queries.
-- Until user-scoped database access is designed, deny anon/authenticated
-- table access by enabling RLS without policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_relations ENABLE ROW LEVEL SECURITY;

-- Rollback if required: replace ENABLE with DISABLE in the ten statements
-- above. Doing so reopens access to anon/authenticated; use only temporarily.
