import { NextResponse } from "next/server";

// Historical snapshots from Places content are not an authorized source.
export async function POST() {
  return NextResponse.json(
    { error: "GOOGLE_PLACES_HISTORICAL_CAPTURE_DISABLED" },
    { status: 410 }
  );
}
