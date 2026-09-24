import { NextResponse } from "next/server";

// Place Details is not an authorized historical reputation data source.
export async function POST() {
  return NextResponse.json(
    { error: "GOOGLE_PLACES_DETAILS_DISABLED" },
    { status: 410 }
  );
}
