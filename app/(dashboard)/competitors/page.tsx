"use client";

import { useCallback, useEffect, useState } from "react";

type Competitor = { id: number; place_id: string; name: string | null };

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [placeId, setPlaceId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/competitors");
    if (!response.ok) throw new Error("No se pudieron cargar los competidores.");
    const data = await response.json();
    setCompetitors(data.competitors);
  }, []);

  useEffect(() => { void refresh().catch((cause) => setError(cause.message)); }, [refresh]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/competitors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId, name }),
      });
      if (!response.ok) throw new Error("No se pudo añadir el competidor.");
      setPlaceId(""); setName("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/competitors?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo quitar el competidor.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally { setBusy(false); }
  };

  return <div className="max-w-3xl space-y-6">
    <div><h1 className="text-2xl font-semibold">Competidores</h1>
      <p className="text-gray-600">Elige los negocios que quieres comparar. Quitar uno no borra su histórico.</p></div>
    <form onSubmit={add} className="rounded-lg border bg-white p-5 space-y-3">
      <h2 className="font-semibold">Añadir competidor</h2>
      <label className="block text-sm">Nombre para identificarlo
        <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full border rounded px-3 py-2" /></label>
      <label className="block text-sm">Google Place ID
        <input required maxLength={255} value={placeId} onChange={(event) => setPlaceId(event.target.value)} className="mt-1 w-full border rounded px-3 py-2" /></label>
      <button type="submit" disabled={busy} className="rounded bg-black text-white px-4 py-2 disabled:opacity-50">Añadir</button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <section className="rounded-lg border bg-white p-5 space-y-3">
      <h2 className="font-semibold">Seguidos ({competitors.length})</h2>
      {competitors.length === 0 ? <p className="text-gray-600">Todavía no sigues a ningún competidor.</p> :
        <ul className="divide-y">{competitors.map((competitor) => <li key={competitor.id} className="py-3 flex justify-between gap-4">
          <div><strong>{competitor.name || competitor.place_id}</strong><p className="text-xs text-gray-500">{competitor.place_id}</p></div>
          <button type="button" disabled={busy} onClick={() => void remove(competitor.id)} className="text-sm underline">Quitar</button>
        </li>)}</ul>}
    </section>
  </div>;
}
