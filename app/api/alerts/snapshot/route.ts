import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    // 1) obtener perfil del usuario actual
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, place_id, email")
      .limit(1)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
    }

    if (!profile.place_id) {
      return NextResponse.json({ error: "NO_PLACE_ID" }, { status: 400 });
    }

    // 2) llamar a detalles
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/google/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: profile.place_id })
    });

    const details = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "GOOGLE_FETCH_FAILED", details }, { status: 400 });
    }

    // 3) guardar snapshot en supabase
    const { error: insertError } = await supabaseAdmin
      .from("review_snapshots")
      .insert({
        profile_id: profile.id,
        rating: details.rating,
        review_count: details.review_count
      });

    if (insertError) {
      return NextResponse.json({ error: insertError }, { status: 400 });
    }

    return NextResponse.json({ success: true, snapshot: details });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
