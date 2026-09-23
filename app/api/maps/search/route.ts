import { NextRequest, NextResponse } from "next/server";
import { getEmailFromCookie } from "@/lib/auth";
import type { GooglePlaceResult } from "@/lib/googlePlaces";

export async function POST(req: NextRequest) {
    if (!getEmailFromCookie(req)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { query } = await req.json();

    if (!query || query.trim().length === 0) {
        return NextResponse.json([]);
    }

    const key = process.env.GOOGLE_PLACES_API_KEY;

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
    )}&key=${key}`;

    const resp = await fetch(url).then((r) => r.json());

    if (!resp.results) return NextResponse.json([]);

    const enriched = (resp.results as GooglePlaceResult[]).slice(0, 10).map((r) => ({
        name: r.name,
        place_id: r.place_id,
        rating: r.rating ?? null,
        reviews: r.user_ratings_total ?? null,
        address: r.formatted_address ?? "",
        open_now: r.opening_hours?.open_now ?? null,
        types: r.types ?? [],
    }));

    return NextResponse.json(enriched);
}
