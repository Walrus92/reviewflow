import assert from "node:assert/strict";
import test from "node:test";
import { dedupeLiveGoogleReviews, toLiveReviewObservations } from "../lib/liveGoogleReviews.ts";

test("a review repeated across pages is shown and counted once with its newest version", () => {
  const firstPage = [
    { reviewId: "r-1", name: "accounts/1/locations/2/reviews/r-1", comment: "Antes",
      starRating: "THREE", createTime: "2026-09-20T10:00:00Z", updateTime: "2026-09-20T10:00:00Z" },
    { reviewId: "r-2", name: "accounts/1/locations/2/reviews/r-2", comment: "Bien",
      starRating: "FIVE", createTime: "2026-09-21T10:00:00Z" },
  ];
  const secondPage = [
    { reviewId: "r-1", name: "accounts/1/locations/2/reviews/r-1", comment: "Ahora",
      starRating: "FOUR", createTime: "2026-09-20T10:00:00Z", updateTime: "2026-09-22T10:00:00Z" },
    { reviewId: "r-3", name: "accounts/1/locations/2/reviews/r-3", comment: "Excelente",
      starRating: "FIVE", createTime: "2026-09-22T10:00:00Z" },
  ];
  const unique = dedupeLiveGoogleReviews([...firstPage, ...secondPage]);
  assert.equal(unique.length, 3);
  assert.equal(unique[0].comment, "Ahora");
  assert.deepEqual(toLiveReviewObservations(unique, "Mi negocio").map((review) => review.id),
    ["r-1", "r-2", "r-3"]);
});

test("normalizes authorized Google reviews for temporary analysis without inventing text", () => {
  const observations = toLiveReviewObservations([
    { reviewId: "r-1", starRating: "TWO", comment: "  Cerrado durante el horario anunciado  ", createTime: "2026-09-22T10:00:00Z" },
    { reviewId: "r-2", starRating: "FIVE", createTime: "2026-09-21T10:00:00Z" },
    { reviewId: "r-3", starRating: "UNKNOWN", comment: "Bien", createTime: "2026-09-20T10:00:00Z" },
    { reviewId: "r-4", starRating: "FOUR", comment: "Muy bien", createTime: "invalid" },
  ], "Mi negocio");

  assert.deepEqual(observations, [{
    id: "r-1", subject: "own", businessName: "Mi negocio", rating: 2,
    text: "Cerrado durante el horario anunciado", publishedAt: "2026-09-22",
    publishedAtTime: "2026-09-22T10:00:00Z",
    source: "google_business_profile",
  }]);
});
