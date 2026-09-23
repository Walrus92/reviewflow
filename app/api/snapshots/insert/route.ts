// app/api/snapshots/insert/route.ts

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
    const { place_id, profile_id } = await req.json();

    if (!place_id || !profile_id) {
      return NextResponse.json(
        { error: "place_id and profile_id required" },
        { status: 400 }
      );
    }
    if (!ownsProfileId(auth.profile, profile_id) || place_id !== auth.profile.place_id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // 1) Obtener datos actuales de Google
    const google = await getPlaceDetails(place_id);
    if (!google) {
      return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 });
    }

    // 2) Último snapshot
    const { data: last } = await supabaseAdmin
      .from("review_snapshots")
      .select("rating, review_count, place_id")
      .eq("place_id", place_id)
      .eq("profile_id", profile_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previous: Snapshot | null = last
      ? {
          place_id,
          rating: last.rating,
          review_count: last.review_count,
        }
      : null;

    // 3) Insertar snapshot nuevo
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("review_snapshots")
      .insert({
        place_id,
        profile_id,
        rating: google.rating,
        review_count: google.review_count,
        data: google,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return NextResponse.json({ error: insertErr }, { status: 500 });
    }

    const current: Snapshot = {
      place_id,
      rating: google.rating,
      review_count: google.review_count,
    };

    // 4) Generar alertas usando la librería común
    const alerts = generateAlertsFromSnapshots({
      profile_id,
      subject_type: "own",
      subject_place_id: place_id,
      subject_name: google.name,
      previous,
      current,
    });

    // 5) Persistir alertas directamente en Supabase
    if (alerts.length > 0) {
      const { error: alertErr } = await supabaseAdmin
        .from("alerts")
        .insert(
          alerts.map((a) => ({
            profile_id: a.profile_id,
            subject_type: a.subject_type,
            subject_place_id: a.subject_place_id,
            type: a.type,
            payload: a.payload,
          }))
        );

      if (alertErr) {
        console.error("ALERT INSERT ERROR", alertErr);
      }
    }

    return NextResponse.json({
      ok: true,
      snapshot: inserted,
      alerts,
    });
  } catch (e) {
    console.error("SERVER ERROR", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
