import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { googleAuthorizeUrl, googleBusinessConfigured } from "@/lib/googleBusiness";

export async function GET(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return auth.error;
  if (!googleBusinessConfigured()) return NextResponse.json({ error: "GOOGLE_BUSINESS_NOT_CONFIGURED" }, { status: 503 });
  const state = randomBytes(32).toString("base64url");
  const stateCookie = jwt.sign({ state, profileId: auth.profile.id, placeIdAtStart: auth.profile.place_id },
    process.env.NEXTAUTH_SECRET!, { expiresIn: "10m" });
  const response = NextResponse.redirect(googleAuthorizeUrl(state));
  response.cookies.set("reviewflow.google_oauth", stateCookie, {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", maxAge: 600, path: "/api/google-business/callback",
  });
  return response;
}
