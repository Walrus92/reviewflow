import { GooglePlaceDetails, GooglePlaceSearchResult } from "./types";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const BASE_URL = "https://maps.googleapis.com/maps/api/place";

export type GooglePlaceResult = {
  place_id: string; name: string; rating?: number; user_ratings_total?: number;
  formatted_address?: string; vicinity?: string; types?: string[];
  opening_hours?: { open_now?: boolean };
  geometry?: { location?: { lat?: number; lng?: number } };
};

/**
 * Obtiene detalles completos de un lugar por place_id.
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const url = `${BASE_URL}/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_address,geometry,types,photos&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    console.error("Google Places error:", data);
    return null;
  }

  const result = data.result;

  return {
    place_id: placeId,
    name: result.name,
    rating: result.rating ?? null,
    review_count: result.user_ratings_total ?? null,
    address: result.formatted_address ?? null,
    lat: result.geometry?.location?.lat ?? null,
    lng: result.geometry?.location?.lng ?? null,
    types: result.types ?? [],
  };
}

/**
 * Nearby Search (competidores).
 */
export async function searchNearby(lat: number, lng: number, radius = 500): Promise<GooglePlaceSearchResult[]> {
  const url = `${BASE_URL}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") return [];

  return (data.results as GooglePlaceResult[]).map((r) => ({
    place_id: r.place_id,
    name: r.name,
    address: r.vicinity ?? null,
    rating: r.rating ?? null,
    review_count: r.user_ratings_total ?? null,
    lat: r.geometry?.location?.lat ?? null,
    lng: r.geometry?.location?.lng ?? null,
    types: r.types ?? [],
  }));
}
