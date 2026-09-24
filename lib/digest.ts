import type { Overview } from "./intelligence";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]!);

export function hasFreshCapture(overview: Overview, since: string): boolean {
  const cutoff = Date.parse(since);
  const capturedAt = overview.own.capturedAt;
  return capturedAt !== null && Number.isFinite(Date.parse(capturedAt)) &&
    Date.parse(capturedAt) >= cutoff;
}

export function hasFreshEvidence(overview: Overview, since: string): boolean {
  return hasFreshCapture(overview, since) || (overview.reviewPulse?.countRecent7d ?? 0) > 0;
}

export function weeklyDigest(overview: Overview, dashboardUrl: string) {
  const own = overview.own;
  const business = escapeHtml(overview.businessName);
  const findings = (overview.findings ?? []).slice(0, 3);
  const findingsHtml = findings.map((finding) => {
    const evidence = finding.basis === "reviews" ?
      finding.evidence.find((item) => /^\d+ de \d+ reseñas/.test(item)) ??
        "Consulta el panel para revisar los ejemplos." : finding.evidence[0] ?? "";
    return `<li><strong>${escapeHtml(finding.title)}</strong><br>${escapeHtml(evidence)}` +
      `<br>Siguiente paso: ${escapeHtml(finding.action)}</li>`;
  }).join("");
  const metricLines = [
    own.reviewChange === null ? "Reseñas totales: sin dos capturas comparables." :
      `Reseñas desde la captura anterior: ${own.reviewChange > 0 ? "+" : ""}${own.reviewChange}.`,
    own.ratingChange === null ? "Valoración: sin periodo comparable." :
      `Cambio de valoración: ${own.ratingChange > 0 ? "+" : ""}${own.ratingChange.toFixed(1)}.`,
    overview.reviewPulse?.countRecent7d ?
      `${overview.ownReviewSampleCapped ? "Al menos " : ""}${overview.reviewPulse.countRecent7d} reseñas propias de la muestra tienen fecha de los últimos 7 días.` : null,
  ].filter((line): line is string => line !== null);
  const metricsHtml = metricLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const competitors = overview.competitors.filter((item) => item.reviewsGained7d !== null)
    .sort((a, b) => (b.reviewsGained7d ?? 0) - (a.reviewsGained7d ?? 0)).slice(0, 2)
    .map((item) => `${item.name}: ${item.reviewsGained7d! >= 0 ? "+" : ""}${item.reviewsGained7d} reseñas en unos 7 días observados.`);
  const competitionHtml = competitors.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const url = escapeHtml(dashboardUrl);
  return {
    subject: `ReviewFlow · resumen semanal de ${overview.businessName.replace(/[\r\n]/g, " ")}`,
    html: `<h1>Resumen semanal de ${business}</h1><h2>Lo que merece tu atención</h2>` +
      `<ul>${findingsHtml || "<li>Aún no hay hallazgos con suficiente evidencia.</li>"}</ul>` +
      `<h2>Tu negocio en cifras</h2><ul>${metricsHtml}</ul>` +
      (competitionHtml ? `<h2>Ritmo de competidores con datos comparables</h2><ul>${competitionHtml}</ul>` : "") +
      (findings.some((finding) => finding.basis === "reviews") ?
        "<p>Las reseñas son una muestra aportada por el propietario; su origen declarado no está verificado y las menciones no prueban una causa.</p>" : "") +
      `<p><a href="${url}">Ver evidencias, fechas y cambios en ReviewFlow</a></p>` +
      "<p>Gestiona este envío en Configuración.</p>",
  };
}
