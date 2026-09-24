import { getSupabaseAdmin } from "./supabaseAdmin";
import { getOwnReviewTotals, refreshAccessToken } from "./googleBusiness";
import { generateAlertsFromSnapshots } from "./alerts";
import type { Snapshot } from "./types";

// Retired: this stores Business Profile API content in historical snapshots.
// Do not call until a compliant source/retention model has been approved.
type Connection = {
  profile_id: string; place_id: string; location_name: string; refresh_token_encrypted: string;
};

export async function captureGoogleBusiness(connection: Connection, now = new Date()) {
  const profile = await getSupabaseAdmin().from("profiles").select("place_id,business_name")
    .eq("id", connection.profile_id).single();
  if (profile.error || !profile.data || profile.data.place_id !== connection.place_id) {
    throw new Error("CONNECTED_PLACE_CHANGED");
  }
  const accessToken = await refreshAccessToken(connection.refresh_token_encrypted);
  const totals = await getOwnReviewTotals(accessToken, connection.location_name);
  const captureKey = `google_business_profile:${connection.profile_id}:${now.toISOString().slice(0, 10)}`;
  const existing = await getSupabaseAdmin().from("review_snapshots").select("id")
    .eq("capture_key", captureKey).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { duplicate: true, captureId: existing.data.id };
  const previous = await getSupabaseAdmin().from("review_snapshots")
    .select("rating,review_count")
    .eq("profile_id", connection.profile_id).eq("source_kind", "google_business_profile")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (previous.error) throw previous.error;
  const inserted = await getSupabaseAdmin().from("review_snapshots").insert({
    profile_id: connection.profile_id, place_id: connection.place_id,
    rating: totals.rating, review_count: totals.reviewCount,
    source_kind: "google_business_profile", observed_at: now.toISOString(),
    capture_key: captureKey, data: null,
  }).select("id").single();
  if (inserted.error?.code === "23505") return { duplicate: true, captureId: null };
  if (inserted.error) throw inserted.error;
  const oldSnapshot: Snapshot | null = previous.data ? {
    place_id: connection.place_id, rating: previous.data.rating,
    review_count: previous.data.review_count,
  } : null;
  const alerts = generateAlertsFromSnapshots({
    profile_id: connection.profile_id, subject_type: "own",
    subject_place_id: connection.place_id,
    subject_name: profile.data.business_name ?? "Tu negocio",
    previous: oldSnapshot,
    current: { place_id: connection.place_id, rating: totals.rating, review_count: totals.reviewCount },
  });
  if (alerts.length) {
    const saved = await getSupabaseAdmin().from("alerts").insert(alerts.map((alert) => ({
      profile_id: alert.profile_id, subject_type: alert.subject_type,
      subject_place_id: alert.subject_place_id, type: alert.type,
      payload: { ...alert.payload, capture_id: inserted.data.id, source_kind: "google_business_profile" },
    })));
    if (saved.error) console.error("GOOGLE_BUSINESS_ALERT_SAVE_FAILED", connection.profile_id, saved.error);
  }
  return { duplicate: false, captureId: inserted.data.id };
}
