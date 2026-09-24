import { supabaseAdmin } from "./supabaseAdmin";
import { buildInsights, summarizeMetrics, type MetricPoint, type MetricSummary, type CompetitorSummary } from "./metrics";
import { metricFindings, ownReviewFindings, type Finding } from "./findings";
import type { ReviewObservation } from "./reviews";
import { buildReviewPulse, reviewTrendFindings, type ReviewPulse } from "./reviewPulse";
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
  findings: Finding[];
  ownReviewSampleCount: number;
  ownReviewSampleCapped: boolean;
  reviewPulse: ReviewPulse;
};

export async function loadOverview(profileId: string, now = new Date(), changesSince?: string): Promise<Overview> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,business_name,place_id,last_dashboard_seen_at")
    .eq("id", profileId)
    .single();
  if (profileError || !profile) throw new Error("PROFILE_NOT_FOUND");

  const reviewCutoff = new Date(now.getTime() - 89 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: ownRows, error: ownError }, { data: links, error: linkError },
    { data: reviewRows, error: reviewError }] = await Promise.all([
    supabaseAdmin.from("review_snapshots")
      .select("rating,review_count,created_at,source_kind")
      .eq("profile_id", profileId)
      .eq("source_kind", "manual_owner")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("competitor_relations")
      .select("competitor_id")
      .eq("profile_id", profileId),
    supabaseAdmin.from("owner_reviews")
      .select("id,rating,review_text,published_at")
      .eq("profile_id", profileId).gte("published_at", reviewCutoff)
      .order("published_at", { ascending: false }).limit(201),
  ]);
  if (ownError || linkError || reviewError) throw new Error("OVERVIEW_QUERY_FAILED");

  const competitorIds = [...new Set((links ?? []).map((link) => Number(link.competitor_id)))];
  let competitors: { id: number; name: string | null; place_id: string }[] = [];
  let competitorRows: (MetricPoint & { competitor_id: number })[] = [];
  if (competitorIds.length) {
    const [{ data: compData, error: compError }, { data: snapData, error: snapError }] = await Promise.all([
      supabaseAdmin.from("competitors").select("id,name,place_id").in("id", competitorIds),
      supabaseAdmin.from("competitor_snapshots")
        .select("competitor_id,rating,review_count,created_at,source_kind")
        .in("competitor_id", competitorIds)
        .eq("source_kind", "manual_owner")
        .or(`source_profile_id.is.null,source_profile_id.eq.${profileId}`)
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
  const sampleCapped = (reviewRows?.length ?? 0) > 200;
  const ownReviews: ReviewObservation[] = (reviewRows ?? []).slice(0, 200).map((row) => ({
    id: String(row.id), subject: "own", businessName: profile.business_name ?? "Tu negocio",
    rating: row.rating, text: row.review_text, publishedAt: row.published_at, source: "owner_declared",
  }));
  const trendSignals = reviewTrendFindings(ownReviews, now, sampleCapped);
  const recentStart = new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const recentReviews = ownReviews.filter((review) => review.publishedAt >= recentStart);
  const repeatedSignals = ownReviewFindings(recentReviews).filter((finding) =>
    !trendSignals.some((trend) =>
      (trend.id === "review-trend-hours" && finding.id === "opening-hours") ||
      (trend.id === "review-trend-waiting" && finding.id === "own-waiting") ||
      (trend.id === "review-trend-service" && finding.id === "own-service-praise")));
  const reviewSignals = [...trendSignals, ...repeatedSignals];
  const metricSignals = metricFindings(own, competitive, now)
    .filter((finding) => finding.id !== "no-strong-signal" || reviewSignals.length === 0);
  const urgentMetric = metricSignals.find((finding) => finding.id === "own-rating-down");
  const otherMetric = metricSignals.find((finding) => finding.id !== "own-rating-down");
  const prioritized: Finding[] = [];
  if (urgentMetric) prioritized.push(urgentMetric);
  prioritized.push(...trendSignals.slice(0, urgentMetric ? 1 : 2));
  prioritized.push(...repeatedSignals);
  if (otherMetric) prioritized.push(otherMetric);
  prioritized.push(...reviewSignals, ...metricSignals);
  const findings = [...new Map(prioritized.map((finding) => [finding.id, finding])).values()].slice(0, 3);

  return {
    businessName: profile.business_name ?? "Tu negocio",
    placeId: profile.place_id,
    previousVisitAt: profile.last_dashboard_seen_at,
    own,
    competitors: competitive,
    changes: (alertRows ?? []).filter((row) =>
      (row.payload as Record<string, unknown> | null)?.source_kind === "manual_owner"
    ).map((row) => ({
      id: row.id,
      subjectType: row.subject_type ?? "own",
      subjectPlaceId: row.subject_place_id,
      type: row.type,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
    })),
    insights: buildInsights(own, competitive),
    findings,
    ownReviewSampleCount: ownReviews.length,
    ownReviewSampleCapped: sampleCapped,
    reviewPulse: buildReviewPulse(ownReviews, now, profile.last_dashboard_seen_at),
  };
}
