import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPlaceDetails } from "@/lib/googlePlaces";
import { generateAlertsFromSnapshots } from "@/lib/alerts";
import { Snapshot } from "@/lib/types";
import { ownsProfileId, requireProfile } from "@/lib/requestAuth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfile(req);
    if (auth.error) return auth.error;
    if (process.env.LEGACY_GOOGLE_CAPTURE_ENABLED !== "true") {
      return NextResponse.json({ error: "HISTORICAL_SOURCE_NOT_CONFIGURED" }, { status: 503 });
    }
    const { profile_id } = await req.json();

    if (!profile_id) {
      return NextResponse.json({ error: "Missing profile_id" }, { status: 400 });
    }
    if (!ownsProfileId(auth.profile, profile_id)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // 1) Leer relaciones profile ↔ competitor
    const { data: relations, error: relError } = await supabaseAdmin
      .from("competitor_relations")
      .select("competitor_id")
      .eq("profile_id", profile_id);

    if (relError) {
      console.error("REL ERROR", relError);
      return NextResponse.json({ error: relError }, { status: 500 });
    }

    if (!relations || relations.length === 0) {
      return NextResponse.json({
        ok: true,
        reason: "no_relations",
        snapshots: [],
        alerts: [],
      });
    }

    const competitorIds = relations.map((r) => r.competitor_id);

    // 2) Cargar competidores asociados
    const { data: competitors, error: compError } = await supabaseAdmin
      .from("competitors")
      .select("id, place_id, name")
      .in("id", competitorIds);

    if (compError) {
      console.error("COMP ERROR", compError);
      return NextResponse.json({ error: compError }, { status: 500 });
    }

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({
        ok: true,
        reason: "no_competitors",
        snapshots: [],
        alerts: [],
      });
    }

    const snapshots: unknown[] = [];
    const allAlerts: ReturnType<typeof generateAlertsFromSnapshots> = [];

    for (const c of competitors) {
      // 3) Detalles de Google para cada competidor (directo, sin pegarte a tu propia API)
      const google = await getPlaceDetails(c.place_id);

      if (!google) {
        console.warn("Google details error for competitor", c.id);
        continue;
      }

      // 4) Último snapshot del competidor
      const { data: lastSnap, error: lastErr } = await supabaseAdmin
        .from("competitor_snapshots")
        .select("rating, review_count")
        .eq("competitor_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastErr) {
        console.error("LAST SNAP ERROR", lastErr);
      }

      const previous: Snapshot | null = lastSnap
        ? {
            place_id: c.place_id,
            rating: lastSnap.rating,
            review_count: lastSnap.review_count,
          }
        : null;

      // 5) Insertar snapshot nuevo
      const { data: snap, error: snapError } = await supabaseAdmin
        .from("competitor_snapshots")
        .insert({
          competitor_id: c.id,
          rating: google.rating ?? null,
          review_count: google.review_count ?? null,
          data: google,
        })
        .select()
        .single();

      if (snapError) {
        console.error("SNAP ERROR", snapError);
        continue;
      }

      snapshots.push(snap);

      const current: Snapshot = {
        place_id: c.place_id,
        rating: google.rating,
        review_count: google.review_count,
      };

      // 6) Generar alertas para este competidor
      const alerts = generateAlertsFromSnapshots({
        profile_id,
        subject_type: "competitor",
        subject_place_id: c.place_id,
        subject_name: c.name,
        previous,
        current,
      });

      allAlerts.push(...alerts);
    }

    // 7) Insertar todas las alertas en bloque
    if (allAlerts.length > 0) {
      const { error: alertErr } = await supabaseAdmin
        .from("alerts")
        .insert(
          allAlerts.map((a) => ({
            profile_id: a.profile_id,
            subject_type: a.subject_type,
            subject_place_id: a.subject_place_id,
            type: a.type,
            payload: a.payload,
          }))
        );

      if (alertErr) {
        console.error("ALERT INSERT ERROR (competitors)", alertErr);
      }
    }

    return NextResponse.json({
      ok: true,
      snapshots,
      alerts: allAlerts,
    });
  } catch (e) {
    console.error("SERVER_ERROR", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
