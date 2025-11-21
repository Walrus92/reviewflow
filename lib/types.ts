export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  rating: number | null;
  review_count: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
}

export interface GooglePlaceSearchResult {
  place_id: string;
  name: string;
  rating: number | null;
  review_count: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
}
