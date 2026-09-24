import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const auth = await requireProfile(req);
  if (auth.error) return auth.error;
  const { error } = await getSupabaseAdmin()
    .from("profiles")
    .update({ last_dashboard_seen_at: new Date().toISOString() })
    .eq("id", auth.profile.id);
  if (error) return NextResponse.json({ error: "SEEN_UPDATE_FAILED" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
