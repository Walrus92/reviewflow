import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return auth.error;
  const profileId = auth.profile.id;
  const [{ data: own, error: ownError }, { data: relations, error: relationError }] = await Promise.all([
    supabaseAdmin.from("review_snapshots").select("id,rating,review_count,created_at,source_kind")
      .eq("profile_id", profileId).eq("source_kind", "manual_owner")
      .order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("competitor_relations").select("competitor_id")
      .eq("profile_id", profileId),
  ]);
  if (ownError || relationError) return NextResponse.json({ error: "HISTORY_QUERY_FAILED" }, { status: 500 });
  const ids = [...new Set((relations ?? []).map((relation) => relation.competitor_id))];
  if (!ids.length) return NextResponse.json({ own: own ?? [], competitors: [], snapshots: [] });
  const [{ data: competitors, error: competitorError }, { data: snapshots, error: snapshotError }] = await Promise.all([
    supabaseAdmin.from("competitors").select("id,name,place_id").in("id", ids),
    supabaseAdmin.from("competitor_snapshots").select("id,competitor_id,rating,review_count,created_at,source_kind")
      .in("competitor_id", ids).eq("source_kind", "manual_owner")
      .or(`source_profile_id.is.null,source_profile_id.eq.${profileId}`)
      .order("created_at", { ascending: false }).limit(500),
  ]);
  if (competitorError || snapshotError) return NextResponse.json({ error: "HISTORY_QUERY_FAILED" }, { status: 500 });
  return NextResponse.json({ own: own ?? [], competitors: competitors ?? [], snapshots: snapshots ?? [] });
}
