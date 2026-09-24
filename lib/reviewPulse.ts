import type { ReviewObservation } from "./reviews";
import type { Finding } from "./findings";
import { complainsAboutHours, complainsAboutWaiting, praisesCare } from "./reviewTopics.ts";

export type ReviewPulse = {
  countRecent7d: number;
  countSinceVisit: number | null;
  lastPublishedAt: string | null;
};

const day = 86_400_000;
const quote = (review: ReviewObservation) =>
  `${review.publishedAt}: «${review.text.length > 120 ? `${review.text.slice(0, 117)}…` : review.text}»`;

export function buildReviewPulse(reviews: ReviewObservation[], now: Date, previousVisitAt: string | null): ReviewPulse {
  const own = reviews.filter((review) => review.subject === "own");
  const sevenDaysAgo = new Date(now.getTime() - 6 * day).toISOString().slice(0, 10);
  const visitDate = previousVisitAt && Number.isFinite(Date.parse(previousVisitAt))
    ? previousVisitAt.slice(0, 10) : null;
  return {
    countRecent7d: own.filter((review) => review.publishedAt >= sevenDaysAgo).length,
    countSinceVisit: visitDate === null ? null : own.filter((review) => review.publishedAt > visitDate).length,
    lastPublishedAt: own.reduce<string | null>((latest, review) =>
      latest === null || review.publishedAt > latest ? review.publishedAt : latest, null),
  };
}

const trendTopics = [
  {
    id: "hours", title: "Más quejas sobre el horario en el último mes",
    matches: complainsAboutHours,
    rating: (value: number) => value <= 2,
    action: "Comprueba las aperturas reales, los festivos y el horario publicado.",
  },
  {
    id: "waiting", title: "Más quejas sobre la espera en el último mes",
    matches: complainsAboutWaiting,
    rating: (value: number) => value <= 2,
    action: "Localiza cuándo se producen las esperas y contrasta los tiempos prometidos con los reales.",
  },
  {
    id: "service", title: "La atención aparece más en los elogios recientes",
    matches: praisesCare,
    rating: (value: number) => value >= 4,
    action: "Identifica qué prácticas del equipo están generando esos comentarios y mantenlas.",
  },
] as const;

export function reviewTrendFindings(reviews: ReviewObservation[], now = new Date(), sampleCapped = false): Finding[] {
  if (sampleCapped) return [];
  const today = now.getTime();
  const currentStart = new Date(today - 29 * day).toISOString().slice(0, 10);
  const previousStart = new Date(today - 59 * day).toISOString().slice(0, 10);
  const todayDate = now.toISOString().slice(0, 10);
  const own = reviews.filter((review) => review.subject === "own");
  const current = own.filter((review) => review.publishedAt >= currentStart && review.publishedAt <= todayDate);
  const previous = own.filter((review) => review.publishedAt >= previousStart && review.publishedAt < currentStart);
  if (current.length < 3 || previous.length < 3) return [];
  const findings: Finding[] = [];
  for (const topic of trendTopics) {
    const matches = (list: ReviewObservation[]) => list.filter((review) =>
      topic.rating(review.rating) && topic.matches(review.text));
    const currentMatches = matches(current);
    const previousMatches = matches(previous);
    const fractionChange = currentMatches.length / current.length - previousMatches.length / previous.length;
    if (currentMatches.length < 2 || fractionChange < 0.3) continue;
    findings.push({
      id: `review-trend-${topic.id}`,
      title: topic.title,
      evidence: [
        `${currentMatches.length} de ${current.length} reseñas de los últimos 30 días frente a ${previousMatches.length} de ${previous.length} de los 30 días anteriores.`,
        ...currentMatches.slice(0, 2).map(quote),
      ],
      action: topic.action,
      basis: "reviews",
      caveat: "Cambio en la proporción de menciones dentro de dos muestras; no prueba la causa ni representa a todos los clientes.",
    });
  }
  return findings;
}
