// app/api/alerts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getEmailFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const email = getEmailFromCookie(req);

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) Resolver profile_id desde el email
    const { data: profile, error: profileErr } = await getSupabaseAdmin()
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileErr) {
      console.error("PROFILE ERROR", profileErr);
      return NextResponse.json({ error: "PROFILE_ERROR" }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const daysParam = searchParams.get("days");
    const typeParam = searchParams.get("type");

    const days = daysParam ? parseInt(daysParam, 10) : 7;
    const effectiveDays = Number.isNaN(days) ? 7 : days;

    const since = new Date();
    since.setDate(since.getDate() - effectiveDays);

    let query = getSupabaseAdmin()
      .from("alerts")
      .select("*")
      .eq("profile_id", profile.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (typeParam) {
      const typeList = typeParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (typeList.length > 0) {
        query = query.in("type", typeList);
      }
    }

    const { data: alerts, error: alertsErr } = await query;

    if (alertsErr) {
      console.error("ALERTS QUERY ERROR", alertsErr);
      return NextResponse.json({ error: "ALERTS_QUERY_ERROR" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      alerts: (alerts ?? []).filter((alert) =>
        (alert.payload as Record<string, unknown> | null)?.source_kind === "manual_owner"
      ),
    });
  } catch (e) {
    console.error("SERVER ERROR", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
