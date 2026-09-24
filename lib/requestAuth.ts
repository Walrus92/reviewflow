import { NextRequest, NextResponse } from "next/server";
import { getEmailFromCookie } from "./auth";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type OwnedProfile = { id: string; email: string; place_id: string | null };

export async function requireProfile(req: NextRequest): Promise<
  { profile: OwnedProfile; error?: never } | { profile?: never; error: NextResponse }
> {
  const email = getEmailFromCookie(req);
  if (!email) {
    return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }

  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, email, place_id")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    return { error: NextResponse.json({ error: "PROFILE_LOOKUP_FAILED" }, { status: 500 }) };
  }
  if (!data) {
    return { error: NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 }) };
  }
  return { profile: data };
}

export function ownsProfileId(profile: OwnedProfile, requestedId: unknown): boolean {
  return typeof requestedId === "string" && requestedId === profile.id;
}
