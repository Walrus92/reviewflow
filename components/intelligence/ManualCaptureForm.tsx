"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Competitor = { id: number; name: string | null; place_id: string };

export default function ManualCaptureForm() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [subject, setSubject] = useState("own");
  const [rating, setRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/competitors").then((response) => response.ok ? response.json() : null)
      .then((data) => setCompetitors(data?.competitors ?? []))
      .catch(() => setCompetitors([]));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/captures/manual", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_type: subject === "own" ? "own" : "competitor",
          competitor_id: subject === "own" ? null : Number(subject),
          rating: Number(rating), review_count: Number(reviewCount),
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setMessage(result.duplicate ? "Esa captura ya estaba guardada hoy." :
          "Captura guardada. Aparece en el histórico y sirve de nueva línea base.");
        if (!result.duplicate) { setRating(""); setReviewCount(""); }
      } else if (result.error === "CAPTURE_ALREADY_EXISTS_TODAY") {
        setMessage("Ya hay una captura para este negocio hoy. Podrás registrar otra mañana.");
      } else {
        setMessage("No se pudo guardar la captura. Comprueba los valores e inténtalo de nuevo.");
      }
    } catch {
      setMessage("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-lg border bg-white p-6 space-y-4">
    <div>
      <h2 className="font-semibold">Actualizar cifras durante el piloto</h2>
      <p className="text-sm text-gray-600">Introduce una valoración y un número de reseñas que hayas comprobado hoy. Guardaremos la fecha y marcaremos el origen como manual. Estas cifras no incluyen el texto de las reseñas.</p>
    </div>
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">Negocio
        <select className="mt-1 w-full rounded border px-3 py-2" value={subject} onChange={(event) => {
          setSubject(event.target.value); setMessage("");
        }}>
          <option value="own">Mi negocio</option>
          {competitors.map((competitor) => <option key={competitor.id} value={competitor.id}>
            {competitor.name ?? competitor.place_id}
          </option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">Valoración (0–5)
          <input required type="number" min="0" max="5" step="0.01" className="mt-1 w-full rounded border px-3 py-2"
            value={rating} onChange={(event) => setRating(event.target.value)} />
        </label>
        <label className="block text-sm">Número de reseñas
          <input required type="number" min="0" step="1" className="mt-1 w-full rounded border px-3 py-2"
            value={reviewCount} onChange={(event) => setReviewCount(event.target.value)} />
        </label>
      </div>
      <button disabled={busy} type="submit" className="rounded bg-black px-4 py-2 text-white disabled:opacity-60">
        {busy ? "Guardando…" : "Guardar captura de hoy"}
      </button>
    </form>
    {message && <p role="status" className="text-sm">{message} <Link href="/history" className="underline">Ver histórico</Link></p>}
  </section>;
}
