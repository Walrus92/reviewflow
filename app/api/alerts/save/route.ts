import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ownsProfileId, requireProfile } from "@/lib/requestAuth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfile(req);
    if (auth.error) return auth.error;
    const { profile_id, type, message, metadata } = await req.json();

    if (!profile_id || !type || !message) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }
    if (!ownsProfileId(auth.profile, profile_id)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("alerts")
      .insert({
        profile_id,
        type,
        subject_type: "own",
        subject_place_id: auth.profile.place_id,
        payload: { message, metadata },
      })
      .select()
      .single();

    if (error) {
      console.error("ALERT INSERT ERROR:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alert: data });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
