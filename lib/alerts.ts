// lib/alerts.ts
import type {
  Snapshot,
  SubjectType,
  GeneratedAlert,
} from "./types";

export function generateAlertsFromSnapshots(args: {
  profile_id: string;
  subject_type: SubjectType;
  subject_place_id: string;
  subject_name?: string;
  previous: Snapshot | null;
  current: Snapshot;
}): GeneratedAlert[] {
  const { profile_id, subject_type, subject_place_id, subject_name, previous, current } = args;

  if (!previous) return [];

  const alerts: GeneratedAlert[] = [];

  // --- REVIEW INCREASE ---
  if (current.review_count !== null && previous.review_count !== null &&
      current.review_count > previous.review_count) {
    const delta = current.review_count - previous.review_count;

    alerts.push({
      profile_id,
      subject_type,
      subject_place_id,
      type: "review_increase",
      payload: {
        previous_reviews: previous.review_count,
        current_reviews: current.review_count,
        delta_reviews: delta,
        subject_name,
      }
    });
  }

  // --- RATING CHANGE ---
  const threshold = 0.1; // evita alertas por variaciones de 0.01

  if (current.rating !== null && previous.rating !== null &&
      current.rating > previous.rating + threshold) {
    alerts.push({
      profile_id,
      subject_type,
      subject_place_id,
      type: "rating_up",
      payload: {
        previous_rating: previous.rating,
        current_rating: current.rating,
        delta_rating: current.rating - previous.rating,
        subject_name,
      }
    });
  }

  if (current.rating !== null && previous.rating !== null &&
      current.rating < previous.rating - threshold) {
    alerts.push({
      profile_id,
      subject_type,
      subject_place_id,
      type: "rating_down",
      payload: {
        previous_rating: previous.rating,
        current_rating: current.rating,
        delta_rating: previous.rating - current.rating,
        subject_name,
      }
    });
  }

  return alerts;
}
