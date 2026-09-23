import { NextRequest, NextResponse } from "next/server";
import { getEmailFromCookie } from "@/lib/auth";
import type { GooglePlaceResult } from "@/lib/googlePlaces";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    if (!getEmailFromCookie(req)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { lat, lng, type, radius = 500 } = await req.json();

    if (!lat || !lng || !type) {
      return NextResponse.json(
        { error: "Missing lat/lng/type" },
        { status: 400 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: data.status, message: data.error_message },
        { status: 500 }
      );
    }

    const results = (data.results as GooglePlaceResult[]).map((p) => ({
      place_id: p.place_id,
      name: p.name,
      rating: p.rating ?? null,
      reviews: p.user_ratings_total ?? null,
      address: p.vicinity ?? null,
      lat: p.geometry?.location?.lat ?? null,
      lng: p.geometry?.location?.lng ?? null,
      types: p.types ?? [],
    }));

    return NextResponse.json(results);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
