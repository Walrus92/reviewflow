import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { googleBusinessConfigured, listOwnReviewsPage, refreshAccessToken } from "@/lib/googleBusiness";

export const dynamic = "force-dynamic";

const json = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) {
    auth.error.headers.set("Cache-Control", "private, no-store");
    return auth.error;
  }
  if (!googleBusinessConfigured()) return json({ error: "GOOGLE_BUSINESS_NOT_CONFIGURED" }, 503);

  const pageToken = request.nextUrl.searchParams.get("pageToken") ?? undefined;
  if (pageToken !== undefined && (!pageToken || pageToken.length > 2048)) {
    return json({ error: "INVALID_PAGE_TOKEN" }, 400);
  }
  const { data: connection, error } = await supabaseAdmin.from("google_business_connections")
    .select("place_id,location_name,refresh_token_encrypted")
    .eq("profile_id", auth.profile.id).maybeSingle();
  if (error) return json({ error: "CONNECTION_LOOKUP_FAILED" }, 500);
  if (!connection) return json({ error: "GOOGLE_BUSINESS_NOT_CONNECTED" }, 404);
  if (!auth.profile.place_id || connection.place_id !== auth.profile.place_id) {
    return json({ error: "CONNECTED_PLACE_CHANGED" }, 409);
  }
  try {
    const accessToken = await refreshAccessToken(connection.refresh_token_encrypted);
    const page = await listOwnReviewsPage(accessToken, connection.location_name, pageToken);
    return json({ source: "google_business_profile", ...page });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "UNKNOWN";
    console.error("GOOGLE_BUSINESS_LIVE_REVIEWS_FAILED", auth.profile.id, reason);
    return json({ error: "GOOGLE_REVIEWS_UNAVAILABLE" }, 502);
  }
}
