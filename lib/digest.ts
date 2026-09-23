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

export function weeklyDigest(overview: Overview, dashboardUrl: string) {
  const own = overview.own;
  const business = escapeHtml(overview.businessName);
  const lines = [
    own.reviewChange === null ? "Aún no hay dos capturas comparables de tu negocio." :
      `Reseñas desde la captura anterior: ${own.reviewChange > 0 ? "+" : ""}${own.reviewChange}.`,
    own.ratingChange === null ? "Valoración sin periodo comparable." :
      `Cambio de valoración: ${own.ratingChange > 0 ? "+" : ""}${own.ratingChange.toFixed(1)}.`,
    ...overview.insights,
  ];
  const competitors = overview.competitors.slice(0, 3).map((item) =>
    `${item.name}: ${item.reviewCount ?? "sin dato"} reseñas, valoración ${item.rating ?? "sin dato"}.`
  );
  const recentChanges = overview.changes.slice(0, 5).map((item) =>
    `${item.subjectType === "own" ? "Tu negocio" : "Competidor"}: ${item.type.replaceAll("_", " ")}.`
  );
  const items = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const competitionItems = competitors.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const changeItems = recentChanges.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const url = escapeHtml(dashboardUrl);
  return {
    subject: `ReviewFlow · resumen semanal de ${overview.businessName}`,
    html: `<h1>Resumen semanal de ${business}</h1><ul>${items}</ul><h2>Competidores</h2><ul>${competitionItems || "<li>Aún no hay competidores con datos.</li>"}</ul><h2>Cambios registrados</h2><ul>${changeItems || "<li>No hay cambios nuevos.</li>"}</ul><p><a href="${url}">Ver qué ha cambiado</a></p><p>Gestiona este envío en Configuración.</p>`,
  };
}
