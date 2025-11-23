import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL;

export async function POST(req: NextRequest) {
  try {
    const { profile_id } = await req.json();

    if (!profile_id) {
      return NextResponse.json({ error: "Missing profile_id" }, { status: 400 });
    }

    // 1) Leer las relaciones profile ↔ competitor
    const { data: relations, error: relError } = await supabase
      .from("competitor_relations")
      .select("competitor_id")
      .eq("profile_id", profile_id);

    if (relError) {
      console.error("REL ERROR", relError);
      return NextResponse.json({ error: relError }, { status: 500 });
    }

    if (!relations || relations.length === 0) {
      // No hay competidores vinculados a este perfil todavía
      return NextResponse.json({
        ok: true,
        reason: "no_relations",
        snapshots: [],
      });
    }

    const competitorIds = relations.map((r) => r.competitor_id);

    // 2) Cargar competidores asociados
    const { data: competitors, error: compError } = await supabase
      .from("competitors")
      .select("*")
      .in("id", competitorIds);

    if (compError) {
      console.error("COMP ERROR", compError);
      return NextResponse.json({ error: compError }, { status: 500 });
    }

    const snapshots: any[] = [];

    for (const c of competitors) {
      // 3) Llamada a Google Details para cada competidor
      const res = await fetch(`${API_BASE}/api/google/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: c.place_id }),
      });

      const google = await res.json();

      if (!google || google.error) {
        console.warn("Google details error for competitor", c.id, google);
        continue;
      }

      // 4) Insertar snapshot en competitor_snapshots
      const { data: snap, error: snapError } = await supabase
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
    }

    return NextResponse.json({ ok: true, snapshots });

  } catch (e) {
    console.error("SERVER_ERROR", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
