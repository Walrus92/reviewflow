import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { exchangeCode, googleBusinessConfigured } from "@/lib/googleBusiness";
import { createPendingSelection, selectionCookieName, selectionCookiePath,
  selectionMaxAgeSeconds } from "@/lib/googleBusinessSelection";

export async function GET(request: NextRequest) {
  const settings = new URL("/settings", request.nextUrl.origin);
  const respond = (code: string, selectionTicket?: string) => {
    settings.searchParams.set("google", code);
    const response = NextResponse.redirect(settings);
    response.cookies.set("reviewflow.google_oauth", "", {
      httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax",
      maxAge: 0, path: "/api/google-business/callback",
    });
    response.cookies.set(selectionCookieName, selectionTicket ?? "", {
      httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax",
      maxAge: selectionTicket ? selectionMaxAgeSeconds : 0, path: selectionCookiePath,
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
  if (payload.state !== state || payload.profileId !== auth.profile.id ||
      payload.placeIdAtStart !== auth.profile.place_id) {
    return respond("invalid_state");
  }
  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) return respond("no_offline_access");
    const ticket = createPendingSelection(auth.profile.id, auth.profile.place_id, tokens.refresh_token);
    return respond("choose_location", ticket);
  } catch (error) {
    console.error("GOOGLE_BUSINESS_CONNECT_FAILED", error);
    return respond("connection_failed");
  }
}
