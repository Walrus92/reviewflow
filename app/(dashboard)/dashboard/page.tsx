"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Overview, MetricSummary, ChangeItem } from "@/lib/intelligence";
import FindingCard from "@/components/intelligence/FindingCard";

function metric(value: number | null, digits = 0) {
  return value === null ? "—" : value.toLocaleString("es-ES", { maximumFractionDigits: digits });
}

function delta(value: number | null, digits = 0) {
  if (value === null) return "Sin comparación";
  return `${value > 0 ? "+" : ""}${metric(value, digits)}`;
}

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "ninguna";
}

function sourceLabel(value: string | null) {
  if (value === "manual_owner") return "Introducida por el propietario";
  if (value === "google_business_profile") return "Google Business Profile";
  if (value === "legacy_google_places") return "Dato heredado";
  return "Origen no indicado";
}

function changeText(change: ChangeItem) {
  const payload = change.payload;
  const name = typeof payload.subject_name === "string" ? payload.subject_name :
    change.subjectType === "own" ? "Tu negocio" : "Competidor";
  if (change.type === "review_increase") return `${name} ganó ${payload.delta_reviews ?? "?"} reseñas`;
  if (change.type === "rating_up" || change.type === "rating_down") {
    return `${name}: valoración ${change.type === "rating_up" ? "subió" : "bajó"} de ${payload.previous_rating ?? "?"} a ${payload.current_rating ?? "?"}`;
  }
  return `${name}: ${change.type}`;
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-medium text-slate-600">{label}</p>
    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 tabular-nums">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </div>;
}

function OwnMetrics({ data }: { data: MetricSummary }) {
  return <section aria-labelledby="own-metrics-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="own-metrics-title" className="text-lg font-semibold text-slate-950">Tu negocio en cifras</h2>
        <p className="mt-1 text-sm text-slate-600">Última captura: {dateTime(data.capturedAt)} · {sourceLabel(data.sourceKind)}</p>
      </div>
      <Link href="/history" className="text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">Ver histórico</Link>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <MetricTile label="Valoración" value={metric(data.rating, 1)} detail={`${delta(data.ratingChange, 1)} frente a la captura anterior`} />
      <MetricTile label="Reseñas totales" value={metric(data.reviewCount)} detail={`${delta(data.reviewChange)} frente a la captura anterior`} />
      <MetricTile label="Variación en ≈7 días" value={delta(data.reviewsGained7d)} detail="Solo con dos capturas comparables" />
    </div>
  </section>;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [markingSeen, setMarkingSeen] = useState(false);
  const [markedSeen, setMarkedSeen] = useState(false);
  const [seenError, setSeenError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/intelligence/overview");
        if (!response.ok) throw new Error(response.status === 404 ? "Configura tu negocio para empezar." : "No se pudo cargar el resumen.");
        setOverview((await response.json()) as Overview);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el resumen.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function markSeen() {
    setMarkingSeen(true);
    setSeenError("");
    try {
      const response = await fetch("/api/intelligence/seen", { method: "POST" });
      if (!response.ok) throw new Error("No se pudieron marcar las novedades como vistas.");
      setMarkedSeen(true);
    } catch (cause) {
      setSeenError(cause instanceof Error ? cause.message : "No se pudieron marcar las novedades como vistas.");
    } finally {
      setMarkingSeen(false);
    }
  }

  if (loading) return <p className="max-w-6xl text-slate-600" role="status">Cargando cambios…</p>;
  if (error) return <p role="alert" className="max-w-6xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">{error} <Link className="font-medium underline" href="/settings">Ir a configuración</Link></p>;
  if (!overview) return null;

  const importantChanges = [...overview.changes].sort((a, b) =>
    Number(b.subjectType === "own") - Number(a.subjectType === "own") ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3);
  const competitors = [...overview.competitors].sort((a, b) =>
    (b.reviewsGained7d ?? -1) - (a.reviewsGained7d ?? -1)).slice(0, 3);
  const reviewPulse = overview.reviewPulse;

  return <div className="mx-auto max-w-6xl space-y-7 pb-10 text-slate-900">
    <header className="border-b border-slate-200 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">ReviewFlow · Tu situación</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Qué ha cambiado</h1>
      <p className="mt-2 text-sm text-slate-600">{overview.businessName} · {overview.previousVisitAt
        ? `desde tu visita del ${dateTime(overview.previousVisitAt)}`
        : "resumen de los últimos 7 días"}</p>
    </header>

    <section aria-labelledby="findings-title" className="space-y-4">
      <div>
        <h2 id="findings-title" className="text-xl font-semibold tracking-tight text-slate-950">Lo que merece tu atención</h2>
        <p className="mt-1 text-sm text-slate-600">Cada señal indica qué observamos y una comprobación concreta para tu negocio.</p>
      </div>
      {overview.findings.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Aún no hay señales evaluables. Añade una captura o reseñas propias aportadas por el propietario para empezar.</div> :
        <div className="grid gap-4 md:grid-cols-2">
          {overview.findings.map((finding, index) => <div key={finding.id} className={index === 0 ? "md:col-span-2" : ""}>
            <FindingCard finding={finding} />
          </div>)}
        </div>}
    </section>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
      <OwnMetrics data={overview.own} />
      <section aria-labelledby="review-pulse-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="review-pulse-title" className="text-lg font-semibold text-slate-950">La voz de tus clientes</h2>
        <p className="mt-1 text-sm text-slate-600">Muestra de reseñas propias aportadas por el propietario, publicadas en los últimos 90 días. Origen declarado sin verificar.</p>
        {overview.ownReviewSampleCount > 0 ? <>
          <div className="mt-5 flex items-baseline gap-2">
            <strong className="text-4xl font-semibold tracking-tight tabular-nums">{overview.ownReviewSampleCapped ? "≥" : ""}{metric(reviewPulse?.countRecent7d ?? 0)}</strong>
            <span className="text-sm text-slate-600">en esta muestra, con fecha de los últimos 7 días</span>
          </div>
          <p className="mt-3 text-sm text-slate-700">{reviewPulse?.countSinceVisit === null || reviewPulse?.countSinceVisit === undefined
            ? "Aún no hay visita anterior con la que comparar."
            : `${overview.ownReviewSampleCapped ? "Al menos " : ""}${metric(reviewPulse.countSinceVisit)} en esta muestra con fecha posterior a tu última visita.`}</p>
          <p className="mt-2 text-xs text-slate-500">Última reseña de la muestra: {reviewPulse?.lastPublishedAt
            ? new Date(reviewPulse.lastPublishedAt).toLocaleDateString("es-ES") : "sin fecha disponible"}</p>
          {overview.ownReviewSampleCapped && <p className="mt-2 text-xs text-amber-800">Hay más de 200 reseñas en el periodo. Los patrones temporales se omiten hasta procesar la muestra completa.</p>}
          <Link href="/reviews" className="mt-5 inline-block text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">Ver textos y procedencia</Link>
        </> : <>
          <p className="mt-5 text-sm text-slate-700">Todavía no hay textos propios aportados. Con cifras agregadas no podemos señalar motivos como horarios, esperas o atención.</p>
          <Link href="/reviews" className="mt-5 inline-block text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">Importar reseñas propias</Link>
          <span className="mx-2 text-slate-400">·</span>
          <Link href="/demo" className="text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">Ver ejemplo ficticio</Link>
        </>}
      </section>
    </div>

    <section aria-labelledby="competitors-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="competitors-title" className="text-lg font-semibold text-slate-950">Comparación competitiva</h2>
          <p className="mt-1 text-sm text-slate-600">Hasta tres negocios vigilados, ordenados por variación reciente de reseñas.</p>
        </div>
        <Link href="/competitors" className="text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">Ver todos</Link>
      </div>
      {overview.competitors.length === 0 ? <p className="mt-5 text-sm text-slate-600">Aún no hay competidores vinculados.</p> : <>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[35rem] border-collapse text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr><th scope="col" className="pb-3 pr-3">Negocio</th><th scope="col" className="pb-3 px-3 text-right">Valoración</th><th scope="col" className="pb-3 px-3 text-right">Reseñas</th><th scope="col" className="pb-3 px-3 text-right">≈7 días</th><th scope="col" className="pb-3 pl-3 text-right">Captura</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {competitors.map((competitor) => <tr key={competitor.id}>
                <th scope="row" className="py-3 pr-3 font-medium text-slate-900">{competitor.name}</th>
                <td className="px-3 py-3 text-right tabular-nums">{metric(competitor.rating, 1)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{metric(competitor.reviewCount)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{delta(competitor.reviewsGained7d)}</td>
                <td className="py-3 pl-3 text-right text-xs text-slate-500">{competitor.capturedAt ? new Date(competitor.capturedAt).toLocaleDateString("es-ES") : "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">La variación requiere capturas comparables. El volumen de reseñas no mide ventas ni explica sus causas.</p>
      </>}
    </section>

    <section aria-labelledby="changes-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="changes-title" className="text-lg font-semibold text-slate-950">Cambios registrados desde tu visita</h2>
          <p className="mt-1 text-sm text-slate-600">Movimientos de valoración y volumen; los motivos aparecen arriba solo si hay evidencia.</p>
        </div>
        <Link href="/alerts" className="text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">Ver alertas</Link>
      </div>
      {importantChanges.length === 0 ? <p className="mt-5 text-sm text-slate-600">No hay cambios nuevos registrados. Revisa la fecha de la última captura antes de interpretarlo como estabilidad.</p> :
        <ul className="mt-5 divide-y divide-slate-100">
          {importantChanges.map((change) => <li key={change.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm first:pt-0 last:pb-0">
            <span className="text-slate-800">{changeText(change)}</span>
            <time dateTime={change.createdAt} className="text-xs text-slate-500">{dateTime(change.createdAt)}</time>
          </li>)}
        </ul>}
      {overview.changes.length > importantChanges.length && <p className="mt-4 text-xs text-slate-500">Mostramos {importantChanges.length} de {overview.changes.length} cambios. El resto está en Alertas.</p>}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <button type="button" onClick={markSeen} disabled={markingSeen || markedSeen}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-default disabled:opacity-60">
          {markedSeen ? "Novedades marcadas como vistas" : markingSeen ? "Guardando…" : "Marcar novedades como vistas"}
        </button>
        {markedSeen && <p role="status" className="mt-2 text-xs text-slate-600">Las novedades actuales seguirán visibles aquí y dejarán de aparecer como nuevas al volver a abrir el panel.</p>}
        {seenError && <p role="alert" className="mt-2 text-sm text-red-700">{seenError}</p>}
      </div>
    </section>
    <p className="text-xs text-slate-500">Cada cifra conserva su fecha y procedencia. Si falta un periodo comparable, mostramos «Sin comparación».</p>
  </div>;
}
