import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();

  const { profile_id, user_agent } = body;

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
