import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseOwnerReviewImport } from "@/lib/ownerReviews";
import { oldestRetainedReviewDate } from "@/lib/ownerReviews";

export async function GET(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return auth.error;
  const { data, error } = await supabaseAdmin.from("owner_reviews")
    .select("id,rating,review_text,published_at,source_label,source_review_id,imported_at")
    .eq("profile_id", auth.profile.id)
    .gte("published_at", oldestRetainedReviewDate())
    .order("published_at", { ascending: false }).order("id", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: "REVIEWS_QUERY_FAILED" }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return auth.error;
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 256_000) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 256_000) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const input = parseOwnerReviewImport(body);
  if (!input) return NextResponse.json({ error: "INVALID_REVIEWS" }, { status: 400 });
  const now = new Date().toISOString();
  const values = input.reviews.map((review) => ({
    profile_id: auth.profile.id, fingerprint: review.fingerprint,
    rating: review.rating, review_text: review.text, published_at: review.date,
    source_kind: "owner_csv", source_label: input.sourceLabel,
    source_review_id: review.id ?? null, rights_confirmed_at: now, imported_at: now,
  }));
  const previous = await supabaseAdmin.from("owner_reviews")
    .select("fingerprint,rating,review_text,published_at,source_label")
    .eq("profile_id", auth.profile.id)
    .in("fingerprint", values.map((value) => value.fingerprint));
  if (previous.error) return NextResponse.json({ error: "IMPORT_LOOKUP_FAILED" }, { status: 500 });
  const byFingerprint = new Map((previous.data ?? []).map((row) => [row.fingerprint, row]));
  const imported = values.filter((value) => !byFingerprint.has(value.fingerprint)).length;
  const updated = values.filter((value) => {
    const old = byFingerprint.get(value.fingerprint);
    return old && (old.rating !== value.rating || old.review_text !== value.review_text ||
      old.published_at !== value.published_at || old.source_label !== value.source_label);
  }).length;
  const changed = values.filter((value) => {
    const old = byFingerprint.get(value.fingerprint);
    return !old || old.rating !== value.rating || old.review_text !== value.review_text ||
      old.published_at !== value.published_at || old.source_label !== value.source_label;
  });
  if (changed.length) {
    const { error } = await supabaseAdmin.from("owner_reviews")
      .upsert(changed, { onConflict: "profile_id,fingerprint" });
    if (error) {
      console.error("OWNER_REVIEW_IMPORT_FAILED", error);
      return NextResponse.json({ error: "IMPORT_FAILED" }, { status: 500 });
    }
  }
  return NextResponse.json({ accepted: input.reviews.length, imported, updated,
    duplicates: input.reviews.length - imported - updated }, { status: imported ? 201 : 200 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return auth.error;
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const requestedId = request.nextUrl.searchParams.get("id");
  if (requestedId !== null && (!/^\d+$/.test(requestedId) || !Number.isSafeInteger(Number(requestedId)))) {
    return NextResponse.json({ error: "INVALID_REVIEW_ID" }, { status: 400 });
  }
  let deletion = supabaseAdmin.from("owner_reviews").delete().eq("profile_id", auth.profile.id);
  if (requestedId !== null) deletion = deletion.eq("id", Number(requestedId));
  const { error } = await deletion;
  if (error) return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
