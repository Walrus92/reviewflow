import { NextRequest, NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/googlePlaces";

export async function POST(req: NextRequest) {
  const { place_id } = await req.json();

  if (!place_id) {
    return NextResponse.json({ error: "place_id required" }, { status: 400 });
  }

  const result = await getPlaceDetails(place_id);

  return NextResponse.json(result);
}
