"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Overview, MetricSummary, ChangeItem } from "@/lib/intelligence";

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

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Qué ha cambiado</h1>
        <p className="text-gray-600">{overview.businessName} · {overview.previousVisitAt
          ? `desde tu visita del ${new Date(overview.previousVisitAt).toLocaleString("es-ES")}`
          : "cambios de los últimos 7 días"}</p>
      </div>

      <MetricCard title="Tu negocio" data={overview.own} />

      <section className="rounded-lg border bg-white p-5 space-y-3">
        <h2 className="text-lg font-semibold">Desde tu última visita</h2>
        {overview.changes.length === 0 ? <p className="text-gray-600">No hay cambios registrados en este periodo.</p> : (
          <ul className="space-y-2">
            {overview.changes.map((change) => (
              <li key={change.id} className="border-b pb-2 last:border-0">
                {changeText(change)} <span className="text-sm text-gray-500">· {new Date(change.createdAt).toLocaleString("es-ES")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Comparativa competitiva</h2>
        {overview.competitors.length === 0 ? <p className="text-gray-600">Aún no hay competidores vinculados.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {overview.competitors.map((competitor) => <MetricCard key={competitor.id} title={competitor.name} data={competitor} />)}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-white p-5 space-y-3">
        <h2 className="text-lg font-semibold">Insights</h2>
        {overview.insights.length === 0 ? <p className="text-gray-600">Necesitamos más capturas comparables para generar insights.</p> : (
          <ul className="list-disc pl-5 space-y-1">{overview.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>
        )}
      </section>
      <p className="text-xs text-gray-500">Métricas procedentes de capturas existentes de Google Maps. Un periodo sin captura comparable se muestra como no disponible.</p>
    </div>
  );
}
