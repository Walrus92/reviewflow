import { NextResponse } from "next/server";

export async function POST(req: Request) {
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

    const enriched = resp.results.slice(0, 10).map((r: any) => ({
        name: r.name,
        place_id: r.place_id,
        rating: r.rating ?? null,
        reviews: r.user_ratings_total ?? null,
        address: r.formatted_address ?? "",
        open_now: r.opening_hours?.open_now ?? null,
        types: r.types ?? [],
        photo_url: r.photos?.[0]
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${key}`
            : null,
    }));

    return NextResponse.json(enriched);
}
