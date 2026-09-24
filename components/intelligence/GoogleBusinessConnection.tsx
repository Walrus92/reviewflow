"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Connection = {
  place_id: string;
  connected_at: string;
  last_capture_at: string | null;
  last_error: string | null;
};
type ManagedLocation = {
  accountName: string;
  locationName: string;
  placeId: string;
  title: string | null;
};

const messages: Record<string, string> = {
  location_not_found: "La cuenta autorizada no gestiona esa ficha.",
  no_offline_access: "Google no concedió acceso continuado. Vuelve a conectar la cuenta.",
  connection_failed: "No se pudo completar la conexión. Comprueba los permisos de la API en Google Cloud.",
  session_expired: "La sesión caducó. Vuelve a iniciar sesión y a conectar Google.",
  invalid_state: "La autorización caducó o cambió la cuenta. Inicia la conexión de nuevo.",
  authorization_failed: "Google no completó la autorización.",
  not_configured: "La integración aún no está configurada.",
};

export default function GoogleBusinessConnection({ placeId, businessName, onConnected }: {
  placeId?: string;
  businessName: string;
  onConnected?: () => void | Promise<void>;
}) {
  const [configured, setConfigured] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [locations, setLocations] = useState<ManagedLocation[] | null>(null);
  const [confirmingLocation, setConfirmingLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadConnection = useCallback(async () => {
    const response = await fetch("/api/google-business/connection", { cache: "no-store" });
    if (!response.ok) throw new Error("CONNECTION_LOOKUP_FAILED");
    const data = await response.json();
    setConfigured(Boolean(data.configured));
    setConnection(data.connection ?? null);
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("google");
    if (code && code !== "choose_location") setMessage(messages[code] ?? "No se pudo completar la conexión.");
    void (async () => {
      try {
        await loadConnection();
        if (code === "choose_location") {
          const response = await fetch("/api/google-business/locations", { cache: "no-store" });
          if (!response.ok) throw new Error("GOOGLE_SELECTION_EXPIRED");
          const data = await response.json();
          setLocations(data.locations ?? []);
        }
      } catch (cause) {
        setMessage(cause instanceof Error && cause.message === "GOOGLE_SELECTION_EXPIRED" ?
          "La selección de ficha caducó. Vuelve a conectar Google." :
          "No se pudo consultar la conexión con Google.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadConnection]);

  async function chooseLocation(locationName: string, confirmExistingBusiness = false) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/google-business/locations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationName, confirmExistingBusiness }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "BUSINESS_BINDING_CONFIRMATION_REQUIRED") {
          setConfirmingLocation(locationName);
          return;
        }
        setMessage(data.error === "BUSINESS_IDENTITY_LOCKED" ?
          "Este perfil ya tiene datos de otro negocio. Utiliza una cuenta distinta para vincular esta ficha." :
          data.error === "GOOGLE_SELECTION_EXPIRED" ?
            "La selección ha caducado. Vuelve a conectar Google." :
            "No se pudo vincular esa ficha. Comprueba el acceso y vuelve a intentarlo.");
        return;
      }
      setLocations(null);
      setConfirmingLocation(null);
      await Promise.all([loadConnection(), onConnected?.()]);
      window.history.replaceState({}, "", "/settings");
      setMessage("Ficha conectada. Ya puedes consultar sus reseñas reales en el panel.");
    } catch {
      setMessage("No se pudo completar la selección. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const response = await fetch("/api/google-business/connection", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setConnection(null);
      setMessage("Conexión eliminada. Puedes volver a autorizar esta ficha cuando quieras.");
    } catch { setMessage("No se pudo desconectar Google."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div>
      <h2 className="text-lg font-semibold">2. Autorizar Google Business Profile</h2>
      <p className="mt-1 text-sm text-slate-600">Inicia sesión en Google, revisa los permisos y elige una ficha que administras. No pedimos tu contraseña ni una API key personal.</p>
    </div>
    {loading ? <p className="text-sm text-slate-600" role="status">Comprobando conexión…</p> : locations ? <>
      <p className="text-sm font-medium">Elige la ficha de tu negocio</p>
      {locations.length === 0 ? <p className="text-sm text-slate-700">Esta cuenta de Google no devuelve fichas administradas. Comprueba que eres propietario o gestor de una ficha verificada.</p> :
        <ul className="space-y-2">{locations.map((location) => <li key={location.locationName} className="rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-medium">{location.title || "Ficha sin título"}</p><p className="text-xs text-slate-500">Place ID: {location.placeId}</p></div>
            <button type="button" disabled={busy} onClick={() => void chooseLocation(location.locationName)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Vincular esta ficha</button>
          </div>
          {confirmingLocation === location.locationName && <div className="mt-3 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p>Este perfil ya tiene datos anteriores de <strong>{businessName}</strong> sin una ficha de Google vinculada. Confirma que <strong>{location.title || location.placeId}</strong> es el mismo negocio antes de asociarlos. Sus capturas anteriores conservarán su procedencia.</p>
            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={() => void chooseLocation(location.locationName, true)} className="font-medium underline disabled:opacity-50">Sí, es el mismo negocio</button>
              <button type="button" disabled={busy} onClick={() => setConfirmingLocation(null)} className="underline disabled:opacity-50">Cancelar</button>
            </div>
          </div>}
        </li>)}</ul>}
      <p className="text-xs text-slate-500">El título se muestra para ayudarte a elegir; el nombre guardado en ReviewFlow sigue siendo el que tú escribiste.</p>
    </> : connection ? <>
      <p className="text-sm text-slate-800">Conectado al Place ID <strong>{connection.place_id}</strong> desde el {new Date(connection.connected_at).toLocaleDateString("es-ES")}.</p>
      {placeId && placeId !== connection.place_id && <p className="text-sm text-amber-800">La ficha conectada no coincide con el negocio guardado.</p>}
      <p className="text-sm text-slate-600">Las reseñas se consultan en directo al abrir el panel. Los textos de Google no se guardan en ReviewFlow.</p>
      <div className="flex flex-wrap items-center gap-4"><Link href="/reviews" className="text-sm font-medium text-blue-700 underline">Ver reseñas reales</Link>
        <button type="button" disabled={busy} onClick={disconnect} className="text-sm text-red-700 underline disabled:opacity-60">Desconectar Google</button></div>
    </> : configured ? <a href="/api/google-business/start" className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Conectar con Google</a> :
      <p className="text-sm text-slate-700">La aplicación necesita la aprobación de Google Business Profile y credenciales OAuth de ReviewFlow para activar esta conexión. Una API key de Places no sirve para acceder a tus reseñas completas.</p>}
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
  </section>;
}
