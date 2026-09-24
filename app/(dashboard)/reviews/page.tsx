"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { parseReviewCsv, type CsvReview } from "@/lib/reviewCsv";
import LiveGoogleReviews from "@/components/intelligence/LiveGoogleReviews";

type SavedReview = {
  id: number; rating: number; review_text: string; published_at: string;
  source_label: string; source_review_id: string | null; imported_at: string;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<SavedReview[]>([]);
  const [parsed, setParsed] = useState<CsvReview[]>([]);
  const [sourceLabel, setSourceLabel] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadReviews() {
    const response = await fetch("/api/reviews/own");
    if (!response.ok) throw new Error("No se pudieron cargar las reseñas.");
    const data = await response.json();
    setReviews(data.reviews ?? []);
  }

  useEffect(() => { void loadReviews().catch((cause) => setMessage(cause.message)); }, []);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setParsed([]);
    setConfirmed(false);
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
        "Comprueba el origen, fechas de los últimos 90 días, estrellas (1–5), textos (5–2000 caracteres) e IDs únicos." :
        "No se pudo importar el archivo.");
      setMessage(`${result.imported} nuevas, ${result.updated} corregidas y ${result.duplicates} sin cambios.`);
      setParsed([]);
      setConfirmed(false);
      if (fileInput.current) fileInput.current.value = "";
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

  async function deleteReview(review: SavedReview) {
    if (!window.confirm(`¿Eliminar definitivamente la reseña del ${review.published_at}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/reviews/own?id=${review.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setReviews((previous) => previous.filter((item) => item.id !== review.id));
      setMessage("Reseña eliminada.");
    } catch { setMessage("No se pudo eliminar la reseña."); }
    finally { setBusy(false); }
  }

  return <div className="max-w-4xl space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Reseñas propias</h1>
      <p className="text-gray-600">Conecta la ficha que gestionas en Google para consultar reseñas reales y detectar temas repetidos sin descargar archivos. Las señales describen lo que dicen las reseñas y no prueban causas.</p>
    </div>
    <LiveGoogleReviews businessName="Tu negocio" detailed />
    <details className="rounded-lg border bg-white p-6">
      <summary className="cursor-pointer font-semibold">Importación manual opcional</summary>
      <div className="mt-4 space-y-4">
      <p className="text-sm text-gray-600">Formato: <code>fecha,estrellas,texto,id</code> (<code>id</code> opcional; también admite punto y coma). Fecha AAAA-MM-DD de los últimos 90 días y 1–5 estrellas. Hasta 100 reseñas por archivo. Entrecomilla textos con separadores o saltos de línea. Conserva el mismo origen y el mismo ID al corregir una reseña para actualizarla sin duplicarla.</p>
      <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">{`fecha,estrellas,texto,id\n2026-09-20,2,"Esperé media hora y salí tarde",r-101\n2026-09-21,5,"Atención amable y rápida",r-102`}</pre>
      <p className="text-sm text-gray-600">Aporta solo textos que tengas derecho a analizar y conservar. No importes resultados de Places sin comprobar sus condiciones. Los textos anteriores a la ventana de 90 días se eliminan de la tabla activa mediante una tarea diaria; también puedes borrar uno o todos ahora.</p>
      <label className="block text-sm">Origen del archivo
        <input className="mt-1 w-full rounded border px-3 py-2" value={sourceLabel}
          onChange={(event) => setSourceLabel(event.target.value)} placeholder="Ej.: exportación autorizada de mi negocio" maxLength={120} />
      </label>
      <label className="block text-sm">Archivo CSV
        <input ref={fileInput} className="mt-1 block w-full" type="file" accept=".csv,text/csv" onChange={chooseFile} />
      </label>
      {parsed.length > 0 && <div className="rounded border bg-gray-50 p-3 text-sm">
        <p className="font-medium">{parsed.length} filas listas para validar e importar</p>
        <ul className="mt-2 space-y-1 text-gray-600">
          {parsed.slice(0, 3).map((review, index) => <li key={`${review.id ?? review.date}-${index}`} className="truncate">
            {review.date} · {review.rating} ★ · {review.text}{review.id ? ` · ID ${review.id}` : ""}
          </li>)}
        </ul>
        {parsed.length > 3 && <p className="mt-2 text-xs text-gray-500">Y {parsed.length - 3} filas más.</p>}
      </div>}
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>Confirmo que puedo aportar estos textos para su análisis y conservación en ReviewFlow.</span>
      </label>
      <button type="button" disabled={busy || !confirmed || !parsed.length || sourceLabel.trim().length < 3}
        onClick={importReviews} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {busy ? "Guardando…" : "Importar reseñas"}
      </button>
      {message && <p role="status" className="text-sm">{message}</p>}
      </div>
    </details>
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Reseñas importadas manualmente</h2>
        {reviews.length > 0 && <button type="button" disabled={busy} onClick={deleteReviews}
          className="text-sm text-red-700 underline disabled:opacity-50">Eliminar todas</button>}
      </div>
      {reviews.length === 0 ? <p className="text-gray-600">Aún no hay reseñas importadas.</p> : <>
        <p className="text-sm text-gray-600">Mostramos hasta 200 reseñas de los últimos 90 días, con origen declarado sin verificar. <Link className="underline" href="/dashboard">Ver señales en el panel</Link>.</p>
        {reviews.map((review) => <article key={review.id} className="rounded border bg-white p-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-medium">{"★".repeat(review.rating)} · {review.published_at}</p>
            <button type="button" disabled={busy} onClick={() => deleteReview(review)}
              className="text-sm text-red-700 underline disabled:opacity-50">Eliminar</button>
          </div>
          <p className="whitespace-pre-wrap">{review.review_text}</p>
          <p className="text-xs text-gray-500">Origen declarado: {review.source_label}{review.source_review_id ? ` · ID ${review.source_review_id}` : ""} · importada el {new Date(review.imported_at).toLocaleDateString("es-ES")}</p>
        </article>)}
      </>}
    </section>
  </div>;
}
