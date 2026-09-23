import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireProfile(req);
  if (auth.error) return auth.error;
  const { data: links, error: linkError } = await supabaseAdmin
    .from("competitor_relations")
    .select("competitor_id")
    .eq("profile_id", auth.profile.id);
  if (linkError) return NextResponse.json({ error: "COMPETITORS_FAILED" }, { status: 500 });
  const ids = (links ?? []).map((link) => link.competitor_id);
  if (!ids.length) return NextResponse.json({ competitors: [] });
  const { data, error } = await supabaseAdmin
    .from("competitors")
    .select("id,place_id,name")
    .in("id", ids)
    .order("name");
  if (error) return NextResponse.json({ error: "COMPETITORS_FAILED" }, { status: 500 });
  return NextResponse.json({ competitors: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireProfile(req);
  if (auth.error) return auth.error;
  const body = await req.json();
  const placeId = typeof body.place_id === "string" ? body.place_id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!placeId || placeId.length > 255 || !name || name.length > 120) {
    return NextResponse.json({ error: "PLACE_ID_AND_NAME_REQUIRED" }, { status: 400 });
  }
  if (placeId === auth.profile.place_id) {
    return NextResponse.json({ error: "OWN_BUSINESS" }, { status: 400 });
  }

  const { data: existingCompetitor, error: lookupError } = await supabaseAdmin
    .from("competitors")
    .select("id,place_id,name")
    .eq("place_id", placeId)
    .is("profile_id", null)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: "COMPETITOR_LOOKUP_FAILED" }, { status: 500 });
  let competitor = existingCompetitor;
  if (!competitor) {
    const inserted = await supabaseAdmin
      .from("competitors")
      .insert({ place_id: placeId, name })
      .select("id,place_id,name")
      .single();
    if (inserted.error) {
      if (inserted.error.code !== "23505") {
        return NextResponse.json({ error: "COMPETITOR_SAVE_FAILED" }, { status: 500 });
      }
      const retry = await supabaseAdmin.from("competitors")
        .select("id,place_id,name").eq("place_id", placeId).is("profile_id", null).single();
      if (retry.error) return NextResponse.json({ error: "COMPETITOR_SAVE_FAILED" }, { status: 500 });
      competitor = retry.data;
    } else {
      competitor = inserted.data;
    }
  }
  const { error } = await supabaseAdmin.from("competitor_relations")
    .insert({ profile_id: auth.profile.id, competitor_id: competitor.id });
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "COMPETITOR_LINK_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ competitor }, { status: error ? 200 : 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireProfile(req);
  if (auth.error) return auth.error;
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "INVALID_COMPETITOR_ID" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("competitor_relations")
    .delete().eq("profile_id", auth.profile.id).eq("competitor_id", id);
  if (error) return NextResponse.json({ error: "COMPETITOR_REMOVE_FAILED" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
