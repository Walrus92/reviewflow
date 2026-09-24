import type { ReviewObservation } from "./reviews";

export type GoogleLiveReview = {
  name?: string;
  reviewId?: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

export type GoogleLiveReviewPage = {
  source: "google_business_profile";
  reviews: GoogleLiveReview[];
  averageRating: number;
  totalReviewCount: number;
  nextPageToken: string | null;
};

const stars: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

// A review can appear on two pages if Google reorders results while paging.
export function dedupeLiveGoogleReviews(reviews: GoogleLiveReview[]): GoogleLiveReview[] {
  const unique: GoogleLiveReview[] = [];
  const indexByIdentity = new Map<string, number>();
  for (const review of reviews) {
    const identities = [
      review.reviewId ? `id:${review.reviewId}` : null,
      review.name ? `name:${review.name}` : null,
    ].filter((identity): identity is string => identity !== null);
    const existingIndex = identities.map((identity) => indexByIdentity.get(identity))
      .find((index) => index !== undefined);
    if (existingIndex === undefined) {
      const index = unique.push(review) - 1;
      for (const identity of identities) indexByIdentity.set(identity, index);
      continue;
    }
    for (const identity of identities) indexByIdentity.set(identity, existingIndex);
    const previous = unique[existingIndex];
    const previousTime = Date.parse(previous.updateTime ?? "");
    const currentTime = Date.parse(review.updateTime ?? "");
    if (Number.isFinite(currentTime) && (!Number.isFinite(previousTime) || currentTime > previousTime)) {
      unique[existingIndex] = review;
    }
  }
  return unique;
}

export function toLiveReviewObservations(reviews: GoogleLiveReview[], businessName: string): ReviewObservation[] {
  return reviews.flatMap((review) => {
    const id = review.reviewId || review.name;
    const rating = review.starRating ? stars[review.starRating] : undefined;
    const text = review.comment?.trim();
    const date = review.createTime?.slice(0, 10);
    if (!id || !rating || !text || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(review.createTime!))) return [];
    return [{
      id, subject: "own" as const, businessName, rating, text,
      publishedAt: date, publishedAtTime: review.createTime,
      source: "google_business_profile" as const,
    }];
  });
}
