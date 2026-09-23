"use client";

import { useEffect, useState } from "react";

type Connection = { place_id: string; connected_at: string; last_capture_at: string | null; last_error: string | null };
const messages: Record<string, string> = {
  connected: "Google Business Profile conectado. La primera captura automática se hará en la próxima ejecución diaria.",
  location_not_found: "La cuenta autorizada no gestiona la ficha cuyo Place ID has guardado. Revisa el negocio y el acceso a Google.",
  no_offline_access: "Google no concedió acceso continuado. Vuelve a conectar la cuenta.",
  connection_failed: "No se pudo completar la conexión. Comprueba los permisos de la API en Google Cloud.",
  session_expired: "La sesión caducó. Vuelve a iniciar sesión y a conectar Google.",
  invalid_state: "La autorización caducó o cambió el negocio. Inicia la conexión de nuevo.",
  authorization_failed: "Google no completó la autorización.",
  not_configured: "La integración aún no está configurada.",
};

export default function GoogleBusinessConnection({ placeId }: { placeId?: string }) {
  const [configured, setConfigured] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("google");
    if (code) setMessage(messages[code] ?? "No se pudo completar la conexión.");
    fetch("/api/google-business/connection")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        setConfigured(Boolean(data?.configured));
        setConnection(data?.connection ?? null);
      })
      .catch(() => setMessage("No se pudo consultar la conexión."))
      .finally(() => setLoading(false));
  }, []);

  async function disconnect() {
    setBusy(true);
    try {
      const response = await fetch("/api/google-business/connection", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setConnection(null);
      setMessage("Conexión eliminada. Las capturas históricas se conservan.");
    } catch { setMessage("No se pudo desconectar Google."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-lg border bg-white p-6 space-y-3">
    <h2 className="font-semibold">Datos automáticos de tu negocio</h2>
    <p className="text-sm text-gray-600">Conecta la ficha que gestionas en Google para guardar cada día su valoración y número de reseñas. Google solicitará tu autorización; nunca necesitamos tu clave de API personal.</p>
    {loading ? <p className="text-sm">Comprobando conexión…</p> : connection ? <>
      <p className="text-sm">Conectado al Place ID {connection.place_id} desde el {new Date(connection.connected_at).toLocaleDateString("es-ES")}.</p>
      <p className="text-sm text-gray-600">Última captura: {connection.last_capture_at ? new Date(connection.last_capture_at).toLocaleString("es-ES") : "pendiente"}.</p>
      {connection.last_error && <p className="text-sm text-red-700">La última captura falló: {connection.last_error}.</p>}
      <button type="button" disabled={busy} onClick={disconnect} className="text-sm underline disabled:opacity-60">Desconectar Google</button>
    </> : configured ? <>
      {!placeId && <p className="text-sm">Guarda primero el Place ID de tu negocio.</p>}
      <a aria-disabled={!placeId} href={placeId ? "/api/google-business/start" : undefined}
        className={`inline-block rounded px-4 py-2 text-sm text-white ${placeId ? "bg-black" : "bg-gray-400"}`}>
        Conectar Google Business Profile
      </a>
    </> : <p className="text-sm text-gray-600">La conexión automática está pendiente de configurar y aprobar el acceso a la API de Google Business Profile. Puedes seguir usando las capturas manuales.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
