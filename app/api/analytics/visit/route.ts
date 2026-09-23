import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest } from "next/server";
import { ownsProfileId, requireProfile } from "@/lib/requestAuth";

export async function POST(req: NextRequest) {
  const auth = await requireProfile(req);
  if (auth.error) return auth.error;
  const body = await req.json();

  const { profile_id, user_agent } = body;
  if (!ownsProfileId(auth.profile, profile_id)) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for") || null;

  const { error } = await supabaseAdmin
    .from("analytics_visits")
    .insert([{ profile_id, user_agent, ip }]);

  if (error) {
    console.error(error);
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}
