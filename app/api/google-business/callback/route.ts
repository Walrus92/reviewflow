import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptToken, exchangeCode, findAuthorizedLocation, googleBusinessConfigured } from "@/lib/googleBusiness";

export async function GET(request: NextRequest) {
  const settings = new URL("/settings", request.nextUrl.origin);
  const respond = (code: string) => {
    settings.searchParams.set("google", code);
    const response = NextResponse.redirect(settings);
    response.cookies.set("reviewflow.google_oauth", "", {
      httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax",
      maxAge: 0, path: "/api/google-business/callback",
    });
    return response;
  };
  const auth = await requireProfile(request);
  if (auth.error) return respond("session_expired");
  if (!googleBusinessConfigured()) return respond("not_configured");
  const signed = request.cookies.get("reviewflow.google_oauth")?.value;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!signed || !code || !state) return respond("authorization_failed");
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(signed, process.env.NEXTAUTH_SECRET!);
    if (typeof decoded === "string") return respond("invalid_state");
    payload = decoded;
  } catch { return respond("invalid_state"); }
  if (payload.state !== state || payload.profileId !== auth.profile.id || payload.placeId !== auth.profile.place_id) {
    return respond("invalid_state");
  }
  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) return respond("no_offline_access");
    const location = await findAuthorizedLocation(tokens.access_token!, auth.profile.place_id!);
    if (!location) return respond("location_not_found");
    const { error } = await supabaseAdmin.from("google_business_connections").upsert({
      profile_id: auth.profile.id, place_id: auth.profile.place_id,
      account_name: location.accountName, location_name: location.locationName,
      refresh_token_encrypted: encryptToken(tokens.refresh_token),
      connected_at: new Date().toISOString(), last_error: null,
    }, { onConflict: "profile_id" });
    if (error) throw error;
    return respond("connected");
  } catch (error) {
    console.error("GOOGLE_BUSINESS_CONNECT_FAILED", error);
    return respond("connection_failed");
  }
}
