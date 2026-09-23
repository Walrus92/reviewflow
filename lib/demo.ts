import { buildInsights, summarizeMetrics, type MetricPoint } from "./metrics";
import { analyzeReviews, type ReviewObservation, type ReviewSource } from "./reviews";

function point(daysAgo: number, rating: number, reviewCount: number, now: Date): MetricPoint {
  return { rating, review_count: reviewCount,
    created_at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString() };
}

export function demoOverview(now = new Date()) {
  const own = summarizeMetrics([point(14, 4.4, 180, now), point(8, 4.4, 184, now), point(1, 4.3, 188, now)], now);
  const competitors = [
    { id: 1, name: "Estudio Norte", placeId: "demo-norte", ...summarizeMetrics([point(14, 4.5, 210, now), point(8, 4.5, 216, now), point(1, 4.6, 230, now)], now) },
    { id: 2, name: "Estudio Plaza", placeId: "demo-plaza", ...summarizeMetrics([point(14, 4.2, 130, now), point(8, 4.2, 132, now), point(1, 4.2, 135, now)], now) },
  ];
  return { own, competitors, insights: buildInsights(own, competitors) };
}

const demoReviews: ReviewObservation[] = [
  { id: "o1", subject: "own", businessName: "Mi negocio", rating: 5, text: "Gran atención y excelente calidad del trabajo.", publishedAt: "2026-09-20", source: "demo" },
  { id: "o2", subject: "own", businessName: "Mi negocio", rating: 1, text: "Fui a las 9:15 y estaba cerrado aunque el horario decía abierto.", publishedAt: "2026-09-19", source: "demo" },
  { id: "o3", subject: "own", businessName: "Mi negocio", rating: 2, text: "El sábado abrían a las diez según Google, pero llegué y estaba cerrado.", publishedAt: "2026-09-18", source: "demo" },
  { id: "o4", subject: "own", businessName: "Mi negocio", rating: 2, text: "Otra vez el local cerrado dentro del horario publicado; perdí el viaje.", publishedAt: "2026-09-17", source: "demo" },
  { id: "o5", subject: "own", businessName: "Mi negocio", rating: 4, text: "Buen resultado y trato amable.", publishedAt: "2026-09-15", source: "demo" },
  { id: "c1", subject: "competitor", businessName: "Estudio Norte", rating: 5, text: "Entrega en 24 horas, justo el plazo que prometieron.", publishedAt: "2026-09-21", source: "demo" },
  { id: "c2", subject: "competitor", businessName: "Estudio Norte", rating: 5, text: "Ana me atendió y dejó el pedido listo en un día.", publishedAt: "2026-09-20", source: "demo" },
  { id: "c3", subject: "competitor", businessName: "Estudio Norte", rating: 5, text: "Gracias a Ana por la atención y la entrega tan rápida.", publishedAt: "2026-09-19", source: "demo" },
  { id: "c4", subject: "competitor", businessName: "Estudio Norte", rating: 5, text: "Ana me atendió con paciencia. La entrega fue puntual.", publishedAt: "2026-09-18", source: "demo" },
  { id: "c5", subject: "competitor", businessName: "Estudio Norte", rating: 2, text: "El precio fue caro para el resultado.", publishedAt: "2026-09-13", source: "demo" },
  { id: "c6", subject: "competitor", businessName: "Estudio Norte", rating: 5, text: "Resultado de gran calidad.", publishedAt: "2026-09-12", source: "demo" },
];

export const demoReviewSource: ReviewSource = {
  name: "Datos de demostración",
  async listReviews() { return demoReviews; },
};

export async function demoReviewAnalysis() {
  const reviews = await demoReviewSource.listReviews();
  return {
    reviews,
    own: analyzeReviews(reviews.filter((review) => review.subject === "own")),
    competitor: analyzeReviews(reviews.filter((review) => review.subject === "competitor")),
  };
}
