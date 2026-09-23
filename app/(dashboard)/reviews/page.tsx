"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { parseReviewCsv, type CsvReview } from "@/lib/reviewCsv";

type SavedReview = {
  id: number; rating: number; review_text: string; published_at: string;
  source_label: string; imported_at: string;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<SavedReview[]>([]);
  const [parsed, setParsed] = useState<CsvReview[]>([]);
  const [sourceLabel, setSourceLabel] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReviews() {
    const response = await fetch("/api/reviews/own");
    if (!response.ok) throw new Error("No se pudieron cargar las reseñas.");
    const data = await response.json();
    setReviews(data.reviews ?? []);
  }

  useEffect(() => { void loadReviews().catch((cause) => setMessage(cause.message)); }, []);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setParsed([]);
    setMessage("");
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 256_000) { setMessage("El archivo supera 256 KB."); return; }
    try { setParsed(parseReviewCsv(await file.text())); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "CSV inválido."); }
  }

  async function importReviews() {
    if (!parsed.length || !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/reviews/own", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_label: sourceLabel, rights_confirmed: confirmed, reviews: parsed }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === "INVALID_REVIEWS" ?
        "Comprueba el origen, las fechas, las estrellas (1–5) y los textos (5–2000 caracteres)." :
        "No se pudo importar el archivo.");
      setMessage(`${result.imported} reseñas nuevas guardadas; ${result.duplicates} ya estaban importadas.`);
      setParsed([]);
      setConfirmed(false);
      await loadReviews();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No se pudo importar."); }
    finally { setBusy(false); }
  }

  async function deleteReviews() {
    if (!window.confirm("¿Eliminar definitivamente todas las reseñas propias importadas de esta cuenta?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/reviews/own", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setReviews([]);
      setMessage("Reseñas importadas eliminadas.");
    } catch { setMessage("No se pudieron eliminar las reseñas."); }
    finally { setBusy(false); }
  }

  return <div className="max-w-4xl space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Reseñas propias</h1>
      <p className="text-gray-600">Usamos textos autorizados para detectar temas repetidos y mostrar ejemplos. Las menciones son pistas para investigar, no causas probadas.</p>
    </div>
    <section className="rounded-lg border bg-white p-6 space-y-4">
      <h2 className="font-semibold">Importar CSV</h2>
      <p className="text-sm text-gray-600">Formato: <code>fecha,estrellas,texto</code> (también admite punto y coma), con fecha AAAA-MM-DD y 1–5 estrellas. Hasta 100 reseñas por archivo. Pon entre comillas los textos con separadores o saltos de línea. Este archivo debe proceder de una fuente que te permita usar y conservar las reseñas; no copies resultados de Places sin comprobar sus condiciones.</p>
      <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">{`fecha,estrellas,texto\n2026-09-20,2,"Esperé media hora y salí tarde"\n2026-09-21,5,"Atención amable y rápida"`}</pre>
      <label className="block text-sm">Origen del archivo
        <input className="mt-1 w-full rounded border px-3 py-2" value={sourceLabel}
          onChange={(event) => setSourceLabel(event.target.value)} placeholder="Ej.: exportación autorizada de mi negocio" maxLength={120} />
      </label>
      <label className="block text-sm">Archivo CSV
        <input className="mt-1 block w-full" type="file" accept=".csv,text/csv" onChange={chooseFile} />
      </label>
      {parsed.length > 0 && <p className="text-sm">{parsed.length} filas listas para validar e importar.</p>}
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>Confirmo que puedo aportar estos textos para su análisis y conservación en ReviewFlow.</span>
      </label>
      <button type="button" disabled={busy || !confirmed || !parsed.length || sourceLabel.trim().length < 3}
        onClick={importReviews} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {busy ? "Guardando…" : "Importar reseñas"}
      </button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Reseñas guardadas</h2>
        {reviews.length > 0 && <button type="button" disabled={busy} onClick={deleteReviews}
          className="text-sm text-red-700 underline disabled:opacity-50">Eliminar todas</button>}
      </div>
      {reviews.length === 0 ? <p className="text-gray-600">Aún no hay reseñas importadas.</p> : <>
        <p className="text-sm text-gray-600">Mostramos las 200 más recientes. <Link className="underline" href="/dashboard">Ver señales en el panel</Link>.</p>
        {reviews.map((review) => <article key={review.id} className="rounded border bg-white p-4 space-y-2">
          <p className="text-sm font-medium">{"★".repeat(review.rating)} · {review.published_at}</p>
          <p className="whitespace-pre-wrap">{review.review_text}</p>
          <p className="text-xs text-gray-500">Origen: {review.source_label} · importada el {new Date(review.imported_at).toLocaleDateString("es-ES")}</p>
        </article>)}
      </>}
    </section>
  </div>;
}
