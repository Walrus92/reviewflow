"use client";

import { useCallback, useEffect, useState } from "react";
import GoogleBusinessConnection from "@/components/intelligence/GoogleBusinessConnection";
import ManualCaptureForm from "@/components/intelligence/ManualCaptureForm";

type Profile = {
  id?: string;
  slug?: string;
  business_name?: string;
  place_id?: string | null;
  weekly_email_enabled?: boolean;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadProfile = useCallback(async () => {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (!response.ok) throw new Error("PROFILE_LOOKUP_FAILED");
    const data = await response.json();
    setProfile(data ?? {});
  }, []);

  useEffect(() => {
    void loadProfile().catch(() => setMessage("No se pudo cargar el negocio."))
      .finally(() => setLoading(false));
  }, [loadProfile]);

  async function save() {
    if (!profile.business_name?.trim()) {
      setMessage("Escribe el nombre con el que identificas tu negocio.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: profile.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: profile.business_name.trim(),
          weekly_email_enabled: Boolean(profile.weekly_email_enabled),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error === "BUSINESS_IDENTITY_LOCKED" ?
          "Esta cuenta ya tiene histórico vinculado. Conserva la identidad del negocio; para otro negocio utiliza otra cuenta." :
          "No se pudo guardar el negocio.");
        return;
      }
      setProfile(data);
      setMessage("Negocio guardado. Ya puedes conectar la ficha que gestionas.");
    } catch {
      setMessage("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="p-6 text-slate-600" role="status">Cargando configuración…</p>;

  return <div className="mx-auto max-w-3xl space-y-6 pb-10 text-slate-900">
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Fuente de datos</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Conecta tu negocio</h1>
      <p className="mt-2 text-sm text-slate-600">Indica cómo llamas a tu negocio y autoriza la ficha de Google Business Profile que gestionas. ReviewFlow consulta sus reseñas automáticamente cuando visitas el panel.</p>
    </header>

    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">1. Identidad del negocio</h2>
        <p className="mt-1 text-sm text-slate-600">Este nombre lo introduces tú. Después elegirás una ficha entre las que administra tu cuenta de Google.</p>
      </div>
      <label className="block text-sm font-medium">Nombre del negocio
        <input value={profile.business_name ?? ""} onChange={(event) => setProfile((current) => ({ ...current, business_name: event.target.value }))}
          maxLength={120} placeholder="Ej.: mi estudio en Madrid" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      {profile.place_id && <p className="text-xs text-slate-500">Ficha vinculada: {profile.place_id}</p>}
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" checked={Boolean(profile.weekly_email_enabled)}
          onChange={(event) => setProfile((current) => ({ ...current, weekly_email_enabled: event.target.checked }))} />
        <span>Quiero recibir un resumen semanal cuando el envío esté disponible.</span>
      </label>
      <button type="button" onClick={save} disabled={busy}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "Guardando…" : profile.id ? "Guardar cambios" : "Guardar y continuar"}
      </button>
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </section>

    {profile.id ? <GoogleBusinessConnection placeId={profile.place_id ?? undefined} businessName={profile.business_name ?? "tu negocio"} onConnected={loadProfile} /> :
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">2. La conexión con Google estará disponible después de guardar el nombre del negocio.</section>}

    <details className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <summary className="cursor-pointer font-medium">Captura manual opcional</summary>
      <p className="mt-2 text-sm text-slate-600">Se conserva para comparar cifras facilitadas por el propietario mientras se habilitan otras fuentes. Indica siempre la fecha y el origen.</p>
      {profile.id && <div className="mt-4"><ManualCaptureForm /></div>}
    </details>
    {profile.slug && <p className="text-xs text-slate-500">Página pública existente: <a className="underline" href={`/b/${profile.slug}`}>/b/{profile.slug}</a></p>}
  </div>;
}
