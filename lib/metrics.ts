export type MetricPoint = {
  rating: number | null;
  review_count: number | null;
  created_at: string;
};

export type MetricSummary = {
  rating: number | null;
  reviewCount: number | null;
  capturedAt: string | null;
  ratingChange: number | null;
  reviewChange: number | null;
  reviewsGained7d: number | null;
};

export type CompetitorSummary = MetricSummary & { id: number; name: string; placeId: string };

function difference(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
}

export function summarizeMetrics(points: MetricPoint[], now = new Date()): MetricSummary {
  const ordered = [...points].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const latest = ordered[0];
  const previous = ordered[1];
  const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const weekBaseline = ordered.find((point) => Date.parse(point.created_at) <= cutoff);
  return {
    rating: latest?.rating ?? null,
    reviewCount: latest?.review_count ?? null,
    capturedAt: latest?.created_at ?? null,
    ratingChange: latest && previous ? difference(latest.rating, previous.rating) : null,
    reviewChange: latest && previous ? difference(latest.review_count, previous.review_count) : null,
    reviewsGained7d: latest && weekBaseline
      ? difference(latest.review_count, weekBaseline.review_count)
      : null,
  };
}

export function buildInsights(own: MetricSummary, competitors: CompetitorSummary[]): string[] {
  const insights: string[] = [];
  if (own.ratingChange !== null && own.ratingChange < 0) {
    insights.push(`Tu valoración bajó ${Math.abs(own.ratingChange).toFixed(1)} puntos desde la captura anterior.`);
  }
  if (own.reviewChange !== null && own.reviewChange > 0) {
    insights.push(`Tu negocio ganó ${own.reviewChange} reseñas desde la captura anterior.`);
  }
  const ranked = competitors
    .filter((competitor) => competitor.reviewsGained7d !== null)
    .sort((a, b) => (b.reviewsGained7d ?? 0) - (a.reviewsGained7d ?? 0));
  const leader = ranked[0];
  if (leader && own.reviewsGained7d !== null &&
      (leader.reviewsGained7d ?? 0) > own.reviewsGained7d) {
    insights.push(`${leader.name} ganó más reseñas que tu negocio en los últimos 7 días (${leader.reviewsGained7d} frente a ${own.reviewsGained7d}).`);
  }
  return insights;
}
