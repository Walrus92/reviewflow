import { supabaseAdmin } from "./supabaseAdmin";
import { buildInsights, summarizeMetrics, type MetricPoint, type MetricSummary, type CompetitorSummary } from "./metrics";
export type { MetricPoint, MetricSummary, CompetitorSummary } from "./metrics";

export type ChangeItem = {
  id: number;
  subjectType: string;
  subjectPlaceId: string | null;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type Overview = {
  businessName: string;
  placeId: string | null;
  previousVisitAt: string | null;
  own: MetricSummary;
  competitors: CompetitorSummary[];
  changes: ChangeItem[];
  insights: string[];
};

export async function loadOverview(profileId: string, now = new Date(), changesSince?: string): Promise<Overview> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,business_name,place_id,last_dashboard_seen_at")
    .eq("id", profileId)
    .single();
  if (profileError || !profile) throw new Error("PROFILE_NOT_FOUND");

  const [{ data: ownRows, error: ownError }, { data: links, error: linkError }] = await Promise.all([
    supabaseAdmin.from("review_snapshots")
      .select("rating,review_count,created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("competitor_relations")
      .select("competitor_id")
      .eq("profile_id", profileId),
  ]);
  if (ownError || linkError) throw new Error("SNAPSHOT_QUERY_FAILED");

  const competitorIds = [...new Set((links ?? []).map((link) => Number(link.competitor_id)))];
  let competitors: { id: number; name: string | null; place_id: string }[] = [];
  let competitorRows: (MetricPoint & { competitor_id: number })[] = [];
  if (competitorIds.length) {
    const [{ data: compData, error: compError }, { data: snapData, error: snapError }] = await Promise.all([
      supabaseAdmin.from("competitors").select("id,name,place_id").in("id", competitorIds),
      supabaseAdmin.from("competitor_snapshots")
        .select("competitor_id,rating,review_count,created_at")
        .in("competitor_id", competitorIds)
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    if (compError || snapError) throw new Error("COMPETITOR_QUERY_FAILED");
    competitors = compData ?? [];
    competitorRows = snapData ?? [];
  }

  const since = changesSince ?? profile.last_dashboard_seen_at ??
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: alertRows, error: alertError } = await supabaseAdmin
    .from("alerts")
    .select("id,subject_type,subject_place_id,type,payload,created_at")
    .eq("profile_id", profileId)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  if (alertError) throw new Error("ALERT_QUERY_FAILED");

  const own = summarizeMetrics((ownRows ?? []) as MetricPoint[], now);
  const competitive = competitors.map((competitor) => ({
    id: competitor.id,
    name: competitor.name ?? competitor.place_id,
    placeId: competitor.place_id,
    ...summarizeMetrics(competitorRows.filter((row) => row.competitor_id === competitor.id), now),
  })).sort((a, b) => (b.reviewCount ?? -1) - (a.reviewCount ?? -1));

  return {
    businessName: profile.business_name ?? "Tu negocio",
    placeId: profile.place_id,
    previousVisitAt: profile.last_dashboard_seen_at,
    own,
    competitors: competitive,
    changes: (alertRows ?? []).map((row) => ({
      id: row.id,
      subjectType: row.subject_type ?? "own",
      subjectPlaceId: row.subject_place_id,
      type: row.type,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
    })),
    insights: buildInsights(own, competitive),
  };
}
