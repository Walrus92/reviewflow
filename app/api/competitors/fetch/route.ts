import { NextResponse } from "next/server";

// This legacy endpoint wrote Google Places content into competitor records.
export async function POST() {
  return NextResponse.json(
    { error: "GOOGLE_PLACES_COMPETITOR_IMPORT_DISABLED" },
    { status: 410 }
  );
}
