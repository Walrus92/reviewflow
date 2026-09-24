import type { CompetitorSummary, MetricSummary } from "./metrics";
import type { ReviewObservation } from "./reviews";
import { complainsAboutHours, complainsAboutWaiting, praisesCare } from "./reviewTopics.ts";

export type Finding = {
  id: string;
  title: string;
  evidence: string[];
  action: string;
  basis: "metrics" | "reviews" | "coverage";
  caveat?: string;
};

const number = (value: number) => value.toLocaleString("es-ES");
const quote = (review: ReviewObservation) =>
  `${review.publishedAt}: «${review.text.length > 120 ? `${review.text.slice(0, 117)}…` : review.text}»`;

export function metricFindings(own: MetricSummary, competitors: CompetitorSummary[], now = new Date()): Finding[] {
  if (!own.capturedAt) return [{
    id: "no-capture", title: "Aún no hay comparativa histórica de cifras",
    evidence: ["No hay capturas propias de una fuente habilitada para el histórico."],
    action: "Conecta una fuente autorizada o registra una captura comprobada para crear la primera línea base.", basis: "coverage",
  }];

  const age = now.getTime() - Date.parse(own.capturedAt);
  if (!Number.isFinite(age) || age > 14 * 86_400_000) return [{
    id: "stale-capture", title: "Los datos necesitan una captura nueva",
    evidence: [`Última captura propia: ${new Date(own.capturedAt).toLocaleDateString("es-ES")}.`],
    action: "Registra una captura actual comprobada antes de tomar decisiones con estas cifras.", basis: "coverage",
  }];

  if (own.ratingChange === null && own.reviewChange === null && own.reviewsGained7d === null) return [{
    id: "baseline-only", title: "Ya hay una línea base; falta una segunda captura",
    evidence: [`Primera captura actual: ${new Date(own.capturedAt).toLocaleDateString("es-ES")}.`],
    action: "Registra otra captura en un día diferente para saber qué ha cambiado.", basis: "coverage",
  }];

  const findings: Finding[] = [];
  if (own.ratingChange !== null && own.ratingChange <= -0.1) findings.push({
    id: "own-rating-down", title: "Tu valoración ha bajado",
    evidence: [`${Math.abs(own.ratingChange).toFixed(1)} puntos menos que en la captura anterior.`,
      own.reviewChange === null ? "No hay volumen comparable." : `${own.reviewChange > 0 ? "+" : ""}${number(own.reviewChange)} reseñas en ese intervalo.`],
    action: "Revisa las reseñas recientes y pregunta al equipo por incidencias repetidas. La cifra sola no identifica la causa.",
    basis: "metrics", caveat: "Una variación agregada no permite atribuir el cambio a horario, trato o servicio.",
  });

  const active = competitors.filter((item) => item.reviewsGained7d !== null && item.capturedAt &&
    now.getTime() - Date.parse(item.capturedAt) <= 14 * 86_400_000);
  const leader = [...active].sort((a, b) => (b.reviewsGained7d ?? 0) - (a.reviewsGained7d ?? 0))[0];
  if (leader && own.reviewsGained7d !== null && (leader.reviewsGained7d ?? 0) - own.reviewsGained7d >= 3) findings.push({
    id: "competitor-pace", title: `${leader.name} está acumulando reseñas más rápido`,
    evidence: [`${number(leader.reviewsGained7d!)} reseñas nuevas frente a ${number(own.reviewsGained7d)} de tu negocio en 7 días observados.`],
    action: "Investiga qué aspectos mencionan sus clientes antes de cambiar tu operación. El volumen no explica por sí solo el motivo.",
    basis: "metrics", caveat: "Comparamos capturas, no ventas ni calidad del servicio.",
  });

  if (!findings.length) findings.push({
    id: "no-strong-signal", title: "Sin cambios que requieran actuar hoy",
    evidence: ["Las capturas comparables no muestran una caída propia ni un competidor claramente más rápido."],
    action: "Mantén la vigilancia. Con texto de reseñas autorizado podremos detectar motivos concretos.", basis: "metrics",
  });
  return findings.slice(0, 3);
}

function matching(reviews: ReviewObservation[], expression: RegExp) {
  return reviews.filter((review) => expression.test(review.text));
}

export function reviewFindings(reviews: ReviewObservation[]): Finding[] {
  const own = reviews.filter((review) => review.subject === "own");
  const rival = reviews.filter((review) => review.subject === "competitor");
  const findings: Finding[] = [];
  const hours = own.filter((review) => review.rating <= 2 && complainsAboutHours(review.text));
  if (hours.length >= 2) findings.push({
    id: "opening-hours", title: "Clientes señalan problemas con el horario",
    evidence: [`${hours.length} de ${own.length} reseñas propias de la muestra lo mencionan.`, ...hours.slice(0, 2).map(quote)],
    action: "Comprueba aperturas reales, festivos y horario publicado; corrige cualquier desajuste y mide si dejan de aparecer estas quejas.",
    basis: "reviews", caveat: "Menciones en una muestra de reseñas; no demuestran cuántos clientes se perdieron.",
  });
  const delivery = matching(rival.filter((review) => review.rating >= 4), /entrega|entregar|listo en|plazo/i);
  if (delivery.length >= 2) findings.push({
    id: "rival-delivery", title: `${delivery[0].businessName} recibe elogios por la entrega`,
    evidence: [`${delivery.length} de ${rival.length} reseñas competidoras de la muestra mencionan entregas o plazos.`, ...delivery.slice(0, 2).map(quote)],
    action: "Compara tus plazos prometidos y reales. Si puedes cumplir un plazo mejor, comunícalo claramente.",
    basis: "reviews", caveat: "Es una señal de percepción en la muestra, no una explicación probada de su crecimiento.",
  });
  const people = new Map<string, ReviewObservation[]>();
  for (const review of rival.filter((item) => item.rating >= 4)) {
    const name = review.text.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+(?:me|nos)\s+atendi[oó]/i)?.[1] ??
      review.text.match(/(?:[Gg]racias a|me atendi[oó]|nos atendi[oó])\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/)?.[1];
    if (name && /^[A-ZÁÉÍÓÚÑ]/.test(name)) people.set(name, [...(people.get(name) ?? []), review]);
  }
  const [person, mentions] = [...people].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (person && mentions && mentions.length >= 2) findings.push({
    id: "rival-person", title: `${person} aparece repetidamente en los elogios`,
    evidence: [`${mentions.length} de ${rival.length} reseñas competidoras de la muestra mencionan a ${person}.`, ...mentions.slice(0, 1).map(quote)],
    action: "Observa si tu equipo genera experiencias personales igual de memorables y reconoce las buenas prácticas internas.",
    basis: "reviews", caveat: "La repetición de un nombre no prueba que esa persona cause el crecimiento del negocio.",
  });
  return findings;
}

export function ownReviewFindings(reviews: ReviewObservation[]): Finding[] {
  const own = reviews.filter((review) => review.subject === "own");
  const findings = reviewFindings(own);
  const negative = own.filter((review) => review.rating <= 2);
  const waiting = negative.filter((review) => complainsAboutWaiting(review.text));
  if (waiting.length >= 2) findings.push({
    id: "own-waiting", title: "Varias reseñas critican los tiempos de espera",
    evidence: [`${waiting.length} de ${own.length} reseñas propias recientes de la muestra lo mencionan.`,
      ...waiting.slice(0, 2).map(quote)],
    action: "Comprueba cuándo se acumulan las esperas y si los tiempos prometidos coinciden con los reales.",
    basis: "reviews", caveat: "Las reseñas señalan experiencias; no miden el tiempo medio de todos los clientes.",
  });
  const care = own.filter((review) => review.rating >= 4 && praisesCare(review.text));
  if (care.length >= 2) findings.push({
    id: "own-service-praise", title: "La atención aparece repetidamente en los elogios",
    evidence: [`${care.length} de ${own.length} reseñas propias recientes de la muestra lo mencionan.`,
      ...care.slice(0, 2).map(quote)],
    action: "Identifica qué prácticas del equipo generan esos comentarios y mantenlas.",
    basis: "reviews", caveat: "Es una percepción expresada en reseñas, no una medida de todos los clientes.",
  });
  return findings;
}
