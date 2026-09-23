import { NextRequest, NextResponse } from "next/server";
import { getEmailFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!getEmailFromCookie(req)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { google_url } = await req.json();

  if (!google_url) {
    return NextResponse.json({ error: "NO_URL" }, { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 500 });
  }

  // 1) Convertir URL → Place ID
  const placeRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      google_url
    )}&inputtype=textquery&fields=place_id&key=${key}`
  ).then((r) => r.json());

  const place_id = placeRes?.candidates?.[0]?.place_id;

  if (!place_id) {
    return NextResponse.json({ error: "PLACE_NOT_FOUND" }, { status: 404 });
  }

  // 2) Obtener detalles del negocio
  const detailsRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total,formatted_address,icon_mask_base_uri,icon_background_color&key=${key}`
  ).then((r) => r.json());

  const details = detailsRes.result;

  return NextResponse.json({
    place_id,
    name: details?.name,
    rating: details?.rating,
    reviews: details?.user_ratings_total,
    address: details?.formatted_address,
    icon_base: details?.icon_mask_base_uri,
    icon_bg: details?.icon_background_color,
  });
}
