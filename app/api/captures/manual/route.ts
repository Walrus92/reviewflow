import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireProfile } from "@/lib/requestAuth";
import { manualCaptureKey, parseManualCapture } from "@/lib/manualCapture";
import { generateAlertsFromSnapshots } from "@/lib/alerts";
import type { Snapshot } from "@/lib/types";

export async function POST(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return auth.error;
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const input = parseManualCapture(body);
  if (!input) return NextResponse.json({ error: "INVALID_CAPTURE" }, { status: 400 });

  const now = new Date();
  const captureKey = manualCaptureKey(auth.profile.id, input, now);
  const table = input.subjectType === "own" ? "review_snapshots" : "competitor_snapshots";
  const existing = await getSupabaseAdmin().from(table)
    .select("id,rating,review_count")
    .eq("capture_key", captureKey).maybeSingle();
  if (existing.error) return NextResponse.json({ error: "CAPTURE_LOOKUP_FAILED" }, { status: 500 });
  if (existing.data) {
    const same = Number(existing.data.rating) === input.rating && existing.data.review_count === input.reviewCount;
    return NextResponse.json({ error: same ? undefined : "CAPTURE_ALREADY_EXISTS_TODAY", duplicate: same },
      { status: same ? 200 : 409 });
  }

  let placeId = auth.profile.place_id ?? auth.profile.id;
  let name = "Tu negocio";
  let competitorId: number | null = null;
  if (input.subjectType === "competitor") {
    competitorId = input.competitorId;
    const relation = await getSupabaseAdmin().from("competitor_relations")
      .select("competitor_id").eq("profile_id", auth.profile.id)
      .eq("competitor_id", competitorId).maybeSingle();
    if (relation.error) return NextResponse.json({ error: "RELATION_LOOKUP_FAILED" }, { status: 500 });
    if (!relation.data) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    const competitor = await getSupabaseAdmin().from("competitors")
      .select("place_id,name").eq("id", competitorId).single();
    if (competitor.error) return NextResponse.json({ error: "COMPETITOR_LOOKUP_FAILED" }, { status: 500 });
    placeId = competitor.data.place_id;
    name = competitor.data.name ?? placeId;
  } else {
    const profile = await getSupabaseAdmin().from("profiles")
      .select("business_name").eq("id", auth.profile.id).single();
    if (profile.error) return NextResponse.json({ error: "PROFILE_LOOKUP_FAILED" }, { status: 500 });
    name = profile.data.business_name ?? name;
  }

  const cutoff = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  let previousQuery = getSupabaseAdmin().from(table)
    .select("rating,review_count")
    .eq("source_kind", "manual_owner")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false }).limit(1);
  previousQuery = input.subjectType === "own"
    ? previousQuery.eq("profile_id", auth.profile.id)
    : previousQuery.eq("competitor_id", competitorId!).eq("source_profile_id", auth.profile.id);
  const previousResult = await previousQuery.maybeSingle();
  if (previousResult.error) return NextResponse.json({ error: "PREVIOUS_CAPTURE_FAILED" }, { status: 500 });
  const previous: Snapshot | null = previousResult.data ? {
    place_id: placeId,
    rating: previousResult.data.rating,
    review_count: previousResult.data.review_count,
  } : null;

  const values = input.subjectType === "own"
    ? { profile_id: auth.profile.id, place_id: placeId, rating: input.rating,
      review_count: input.reviewCount, source_kind: "manual_owner", observed_at: now.toISOString(),
      capture_key: captureKey, data: null }
    : { competitor_id: competitorId, source_profile_id: auth.profile.id, place_id: placeId, rating: input.rating,
      review_count: input.reviewCount, source_kind: "manual_owner", observed_at: now.toISOString(),
      capture_key: captureKey, data: null };
  const inserted = await getSupabaseAdmin().from(table).insert(values).select("id").single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return NextResponse.json({ error: "CAPTURE_ALREADY_EXISTS_TODAY" }, { status: 409 });
    }
    return NextResponse.json({ error: "CAPTURE_SAVE_FAILED" }, { status: 500 });
  }

  const alerts = generateAlertsFromSnapshots({
    profile_id: auth.profile.id,
    subject_type: input.subjectType,
    subject_place_id: placeId,
    subject_name: name,
    previous,
    current: { place_id: placeId, rating: input.rating, review_count: input.reviewCount },
  });
  let savedAlertCount = 0;
  if (alerts.length) {
    const saved = await getSupabaseAdmin().from("alerts").insert(alerts.map((alert) => ({
      profile_id: alert.profile_id, subject_type: alert.subject_type,
      subject_place_id: alert.subject_place_id, type: alert.type,
      payload: { ...alert.payload, capture_id: inserted.data.id, source_kind: "manual_owner" },
    })));
    if (saved.error) console.error("MANUAL_CAPTURE_ALERT_FAILED", saved.error);
    else savedAlertCount = alerts.length;
  }
  return NextResponse.json({ ok: true, captureId: inserted.data.id, alertCount: savedAlertCount }, { status: 201 });
}
