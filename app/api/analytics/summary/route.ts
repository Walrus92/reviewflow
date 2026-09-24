import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest } from "next/server";
import { requireProfile } from "@/lib/requestAuth";

export async function GET(req: NextRequest) {
    const auth = await requireProfile(req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const profile_id = url.searchParams.get("profile_id");

    if (!profile_id) {
        return Response.json({ error: "missing id" }, { status: 400 });
    }
    if (profile_id !== auth.profile.id) {
        return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // ---- METRICAS DE HOY ----
    const { count: visits_today } = await getSupabaseAdmin()
        .from("analytics_visits")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile_id)
        .gte("created_at", new Date().toISOString().slice(0, 10));

    const { count: clicks_today } = await getSupabaseAdmin()
        .from("analytics_clicks")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile_id)
        .gte("created_at", new Date().toISOString().slice(0, 10));

    // ---- ÚLTIMOS 7 DÍAS ----
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const { count: visits_7d } = await getSupabaseAdmin()
        .from("analytics_visits")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile_id)
        .gte("created_at", lastWeek.toISOString());
    const clicks_7d_res = await getSupabaseAdmin()
        .from("analytics_clicks")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile_id)
        .gte("created_at", lastWeek.toISOString());

    const clicks_7d = clicks_7d_res.count ?? 0;
    // ---- DESGLOSE GOOGLE/INSTAGRAM ----
    const { data: click_rows } = await getSupabaseAdmin()
        .from("analytics_clicks")
        .select("type")
        .eq("profile_id", profile_id);

    const google = click_rows?.filter((c) => c.type === "google").length || 0;
    const instagram = click_rows?.filter((c) => c.type === "instagram").length || 0;

    return Response.json({
        visits_today: visits_today ?? 0,
        clicks_today: clicks_today ?? 0,
        visits_7d: visits_7d ?? 0,
        clicks_7d: clicks_7d ?? 0,
        google,
        instagram,
        ctr_total: visits_7d ? clicks_7d / visits_7d : 0,
    });
}
