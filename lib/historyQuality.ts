import type { MetricPoint } from "./metrics";

export type HistoryQuality = {
  title: string;
  evidence: string[];
  action: string;
  reliable: boolean;
};

export function assessHistory(points: MetricPoint[], now = new Date()): HistoryQuality {
  if (!points.length) return {
    title: "Aún no hay histórico utilizable", evidence: ["No hay capturas de una fuente habilitada para el histórico."],
    action: "Conecta una fuente autorizada o registra una primera captura comprobada en Configuración.", reliable: false,
  };
  const all = [...points].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const latestSource = all.at(-1)?.source_kind;
  const ordered = latestSource ? all.filter((point) => point.source_kind === latestSource) : all;
  const dates = [...new Set(ordered.map((point) => point.created_at.slice(0, 10)))];
  const latest = ordered.at(-1)!;
  const ageDays = Math.floor((now.getTime() - Date.parse(latest.created_at)) / 86_400_000);
  const suspiciousDates = dates.filter((date) => {
    const counts = ordered
    .filter((point) => point.created_at.startsWith(date))
    .map((point) => point.review_count)
    .filter((count): count is number => count !== null);
    return counts.length > 1 && Math.max(...counts) - Math.min(...counts) >=
      Math.max(5, Math.ceil(Math.max(...counts) * 0.1));
  });
  const evidence = [
    `${ordered.length} ${ordered.length === 1 ? "captura" : "capturas"} en ${dates.length} ${dates.length === 1 ? "día" : "días"} ${dates.length === 1 ? "distinto" : "distintos"}.`,
    `Última captura: ${new Date(latest.created_at).toLocaleDateString("es-ES")}.`,
  ];
  if (ordered.length < all.length) evidence.push(`${all.length - ordered.length} capturas de otro origen quedan fuera de esta evaluación.`);
  if (ageDays > 14) evidence.push(`Sin actualización desde hace ${ageDays} días.`);
  if (suspiciousDates.length) evidence.push(`Hay variaciones bruscas del volumen entre capturas del mismo día (${suspiciousDates.join(", ")}); conviene comprobarlas.`);
  const reliable = dates.length >= 3 && ageDays <= 14 && !suspiciousDates.length;
  return {
    title: reliable ? "Hay una serie de capturas para analizar" : "Este histórico aún no permite explicar una tendencia",
    evidence,
    action: reliable
      ? "Compara periodos equivalentes y revisa el texto de reseñas antes de atribuir motivos."
      : "Registra capturas comprobadas en días distintos; revisa cualquier cifra incoherente.",
    reliable,
  };
}
