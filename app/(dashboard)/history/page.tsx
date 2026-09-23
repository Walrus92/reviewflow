"use client";

import { useEffect, useState } from "react";

type Snapshot = { id: number; competitor_id?: number; rating: number | null; review_count: number | null; created_at: string };
type Competitor = { id: number; name: string | null; place_id: string };
type History = { own: Snapshot[]; competitors: Competitor[]; snapshots: Snapshot[] };

function HistoryTable({ title, rows }: { title: string; rows: Snapshot[] }) {
  return <section className="rounded-lg border bg-white p-5 space-y-3">
    <h2 className="font-semibold">{title}</h2>
    {rows.length === 0 ? <p className="text-gray-600">Aún no hay capturas.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="py-2">Fecha</th><th>Valoración</th><th>Reseñas</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="py-2">{new Date(row.created_at).toLocaleString("es-ES")}</td><td>{row.rating ?? "—"}</td><td>{row.review_count ?? "—"}</td></tr>)}</tbody>
      </table></div>}
  </section>;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/intelligence/history").then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el histórico.");
      setHistory(await response.json());
    }).catch((cause) => setError(cause.message));
  }, []);
  return <div className="max-w-4xl space-y-5">
    <div><h1 className="text-2xl font-semibold">Histórico de capturas</h1><p className="text-gray-600">Evolución registrada de valoración y volumen de reseñas.</p></div>
    {error && <p role="alert">{error}</p>}
    {!history && !error && <p>Cargando histórico…</p>}
    {history && <><HistoryTable title="Tu negocio" rows={history.own} />
      {history.competitors.map((competitor) => <HistoryTable key={competitor.id} title={competitor.name ?? competitor.place_id}
        rows={history.snapshots.filter((snapshot) => snapshot.competitor_id === competitor.id)} />)}</>}
  </div>;
}
