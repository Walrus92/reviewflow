import { NextResponse } from "next/server";

// Places details are not a source for ReviewFlow's persistent business profile.
export async function POST() {
  return NextResponse.json({ error: "GOOGLE_PLACES_RESOLVE_DISABLED" }, { status: 410 });
}
