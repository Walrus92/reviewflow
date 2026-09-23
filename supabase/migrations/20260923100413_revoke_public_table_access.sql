-- The application currently reads and writes these tables only through
-- server-side service-role clients. Remove direct Data API / GraphQL table
-- privileges from public roles as defense in depth.
REVOKE ALL ON TABLE
  public.users,
  public.magic_links,
  public.profiles,
  public.analytics_visits,
  public.analytics_clicks,
  public.review_snapshots,
  public.competitors,
  public.competitor_snapshots,
  public.alerts,
  public.competitor_relations
FROM anon, authenticated;

-- Rollback if browser-side table access is intentionally introduced:
-- grant only the required privileges alongside appropriate RLS policies.
