import { NextResponse } from "next/server";

// This Places flow does not cover ReviewFlow's competitive intelligence use in the EEA.
export async function POST() {
  return NextResponse.json({ error: "GOOGLE_PLACES_SEARCH_DISABLED" }, { status: 410 });
}
