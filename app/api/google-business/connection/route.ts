import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptToken, googleBusinessConfigured } from "@/lib/googleBusiness";

export async function GET(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return auth.error;
  const { data, error } = await supabaseAdmin.from("google_business_connections")
    .select("place_id,connected_at,last_capture_at,last_error")
    .eq("profile_id", auth.profile.id).maybeSingle();
  if (error) return NextResponse.json({ error: "CONNECTION_LOOKUP_FAILED" }, { status: 500 });
  return NextResponse.json({ configured: googleBusinessConfigured(), connection: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return auth.error;
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const existing = await supabaseAdmin.from("google_business_connections")
    .select("refresh_token_encrypted").eq("profile_id", auth.profile.id).maybeSingle();
  if (existing.error) return NextResponse.json({ error: "CONNECTION_LOOKUP_FAILED" }, { status: 500 });
  if (existing.data && googleBusinessConfigured()) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decryptToken(existing.data.refresh_token_encrypted) }),
        cache: "no-store",
      });
    } catch (cause) { console.error("GOOGLE_BUSINESS_REVOKE_FAILED", cause); }
  }
  const { error } = await supabaseAdmin.from("google_business_connections").delete()
    .eq("profile_id", auth.profile.id);
  if (error) return NextResponse.json({ error: "DISCONNECT_FAILED" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
