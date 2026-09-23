"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Overview, MetricSummary, ChangeItem } from "@/lib/intelligence";
import FindingCard from "@/components/intelligence/FindingCard";

function metric(value: number | null, digits = 0) {
  return value === null ? "—" : value.toLocaleString("es-ES", { maximumFractionDigits: digits });
}

function delta(value: number | null, digits = 0) {
  if (value === null) return "Sin periodo comparable";
  return `${value > 0 ? "+" : ""}${metric(value, digits)}`;
}

function changeText(change: ChangeItem) {
  const payload = change.payload;
  const name = typeof payload.subject_name === "string" ? payload.subject_name :
    change.subjectType === "own" ? "Tu negocio" : "Competidor";
  if (change.type === "review_increase") {
    return `${name} ganó ${payload.delta_reviews ?? "?"} reseñas`;
  }
  if (change.type === "rating_up" || change.type === "rating_down") {
    return `${name}: valoración ${change.type === "rating_up" ? "subió" : "bajó"} de ${payload.previous_rating ?? "?"} a ${payload.current_rating ?? "?"}`;
  }
  return `${name}: ${change.type}`;
}

function MetricCard({ title, data }: { title: string; data: MetricSummary }) {
  return (
    <section className="rounded-lg border bg-white p-5 space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <p><span className="text-gray-500">Valoración</span><br /><strong className="text-2xl">{metric(data.rating, 1)}</strong> <span className="text-sm">({delta(data.ratingChange, 1)})</span></p>
        <p><span className="text-gray-500">Reseñas</span><br /><strong className="text-2xl">{metric(data.reviewCount)}</strong> <span className="text-sm">({delta(data.reviewChange)})</span></p>
        <p><span className="text-gray-500">Crecimiento 7 días</span><br /><strong className="text-2xl">{delta(data.reviewsGained7d)}</strong></p>
      </div>
      <p className="text-xs text-gray-500">Última captura: {data.capturedAt ? new Date(data.capturedAt).toLocaleString("es-ES") : "ninguna"}</p>
    </section>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/intelligence/overview");
        if (!response.ok) throw new Error(response.status === 404 ? "Configura tu negocio para empezar." : "No se pudo cargar el resumen.");
        const data = (await response.json()) as Overview;
        setOverview(data);
        await fetch("/api/intelligence/seen", { method: "POST" });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el resumen.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Cargando cambios…</p>;
  if (error) return <p role="alert">{error} <Link className="underline" href="/settings">Ir a configuración</Link></p>;
  if (!overview) return null;

  const importantChanges = [...overview.changes].sort((a, b) =>
    Number(b.subjectType === "own") - Number(a.subjectType === "own") ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  const competitors = [...overview.competitors].sort((a, b) =>
    (b.reviewsGained7d ?? -1) - (a.reviewsGained7d ?? -1)).slice(0, 3);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Qué ha cambiado</h1>
        <p className="text-gray-600">{overview.businessName} · {overview.previousVisitAt
          ? `desde tu visita del ${new Date(overview.previousVisitAt).toLocaleString("es-ES")}`
          : "cambios de los últimos 7 días"}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Lo que merece tu atención</h2>
        <p className="text-sm text-gray-600">Señales observadas, su evidencia y un siguiente paso. Las cifras no revelan por sí solas el motivo.</p>
        <div className="grid gap-3">{overview.findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div>
      </section>

      <MetricCard title="Tu negocio" data={overview.own} />

      <section className="rounded-lg border bg-white p-5 space-y-3">
        <h2 className="text-lg font-semibold">Desde tu última visita</h2>
        {importantChanges.length === 0 ? <p className="text-gray-600">No hay alertas nuevas desde tu última visita. Comprueba la fecha de la última captura antes de interpretarlo como estabilidad.</p> : (
          <ul className="space-y-2">
            {importantChanges.map((change) => (
              <li key={change.id} className="border-b pb-2 last:border-0">
                {changeText(change)} <span className="text-sm text-gray-500">· {new Date(change.createdAt).toLocaleString("es-ES")}</span>
              </li>
            ))}
          </ul>
        )}
        {overview.changes.length > importantChanges.length && <Link href="/alerts" className="text-sm underline">Ver todas las alertas</Link>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Competidores a vigilar</h2><Link href="/competitors" className="text-sm underline">Ver todos</Link></div>
        {overview.competitors.length === 0 ? <p className="text-gray-600">Aún no hay competidores vinculados.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {competitors.map((competitor) => <MetricCard key={competitor.id} title={competitor.name} data={competitor} />)}
          </div>
        )}
        <p className="text-sm text-gray-600">El panel destaca hasta tres. El volumen de reseñas no equivale a ventas ni explica por qué crecen.</p>
      </section>

      <section className="rounded-lg border bg-white p-5 space-y-3">
        <h2 className="text-lg font-semibold">Para entender los motivos</h2>
        <p className="text-gray-700">Todavía no hay una fuente autorizada de textos de reseñas conectada a este negocio. Por eso no atribuimos los cambios a entregas, horarios o personas sin evidencia.</p>
        <Link href="/demo" className="underline text-blue-700">Ver un ejemplo con reseñas ficticias</Link>
      </section>
      <p className="text-xs text-gray-500">Métricas procedentes de capturas existentes de Google Maps. Un periodo sin captura comparable se muestra como no disponible.</p>
    </div>
  );
}
