import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest } from "next/server";
import { ownsProfileId, requireProfile } from "@/lib/requestAuth";

export async function POST(req: NextRequest) {
  const auth = await requireProfile(req);
  if (auth.error) return auth.error;
  const body = await req.json();
  const { profile_id, type, user_agent } = body;
  if (!ownsProfileId(auth.profile, profile_id)) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (type !== "google" && type !== "instagram") {
    return Response.json({ error: "INVALID_TYPE" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") || null;

  const { error } = await getSupabaseAdmin()
    .from("analytics_clicks")
    .insert([{ profile_id, type, user_agent, ip }]);

  if (error) {
    console.error(error);
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}
