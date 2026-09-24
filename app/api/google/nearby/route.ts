import { NextResponse } from "next/server";

// The nearby Places endpoint fed a legacy competitor import that stored Places content.
export async function POST() {
  return NextResponse.json(
    { error: "GOOGLE_PLACES_COMPETITOR_DISCOVERY_DISABLED" },
    { status: 410 }
  );
}
