import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { profile_id } = await req.json();
    if (!profile_id) {
      return NextResponse.json({ error: "Missing profile_id" }, { status: 400 });
    }

    // 1. Obtener snapshots ordenados del más reciente al más antiguo
    const { data: snaps, error } = await supabase
      .from("review_snapshots")
      .select("*")
      .eq("profile_id", profile_id)
      .order("created_at", { ascending: false })
      .limit(2);

    if (error) throw error;

    if (!snaps || snaps.length < 2) {
      return NextResponse.json({ ok: true, alerts: [] });
    }

    const current = snaps[0];
    const previous = snaps[1];

    const alerts: any[] = [];

    // ---- NEW REVIEW ----
    if (
      current.review_count != null &&
      previous.review_count != null &&
      current.review_count > previous.review_count
    ) {
      alerts.push({
        profile_id,
        type: "new_review",
        message: `Tienes ${current.review_count - previous.review_count} reseña(s) nueva(s)`,
      });
    }

    // ---- RATING UP ----
    if (
      current.rating != null &&
      previous.rating != null &&
      current.rating > previous.rating
    ) {
      alerts.push({
        profile_id,
        type: "rating_up",
        message: `Tu valoración ha subido de ${previous.rating} a ${current.rating}`,
      });
    }

    // ---- RATING DOWN ----
    if (
      current.rating != null &&
      previous.rating != null &&
      current.rating < previous.rating
    ) {
      alerts.push({
        profile_id,
        type: "rating_down",
        message: `Tu valoración ha bajado de ${previous.rating} a ${current.rating}`,
      });
    }

    // Insertar todas las alertas
    if (alerts.length > 0) {
      await supabase.from("alerts").insert(alerts);
    }

    return NextResponse.json({ ok: true, alerts });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
