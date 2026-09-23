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

export interface Snapshot {
  place_id: string;
  name?: string;
  rating: number | null;
  review_count: number | null;
}

export type SubjectType = "own" | "competitor";

export type AlertType =
  | "review_increase"
  | "rating_up"
  | "rating_down";

export interface AlertPayload {
  previous_reviews?: number;
  current_reviews?: number;
  delta_reviews?: number;

  previous_rating?: number;
  current_rating?: number;
  delta_rating?: number;

  subject_name?: string;
  subject_place_id?: string;
}

export interface GeneratedAlert {
  profile_id: string;
  subject_type: SubjectType;
  subject_place_id: string;
  type: AlertType;
  payload: AlertPayload;
}
