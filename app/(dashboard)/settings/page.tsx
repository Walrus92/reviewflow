"use client";

import { useEffect, useState } from "react";
import ManualCaptureForm from "@/components/intelligence/ManualCaptureForm";

// ----------------------
// ICONOS POR CATEGORÍA
// ----------------------
const ICONS: Record<string, string> = {
  restaurant: "🍽️",
  bar: "🍺",
  cafe: "☕",
  spa: "💆",
  beauty_salon: "💅",
  gym: "🏋️",
  store: "🛍️",
  hair_care: "✂️",
  tattoo: "🐍",
  lodging: "🏨",
  point_of_interest: "📍",
  establishment: "🏢",
};

type Profile = {
  id?: string; slug?: string; business_name?: string; google_review_url?: string;
  instagram_url?: string; place_id?: string; address?: string; rating?: number | null;
  reviews?: number | null; types?: string[]; weekly_email_enabled?: boolean;
};
type SearchResult = Profile & { place_id: string; name: string };
type GoogleInfo = SearchResult & { review_count?: number | null };

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");

  const [googleInfo, setGoogleInfo] = useState<GoogleInfo | null>(null);
  const [checkingGoogle, setCheckingGoogle] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // ----------------------
  // Instagram
  // ----------------------
  const [igUsername, setIgUsername] = useState("");
  const [igValid, setIgValid] = useState<boolean | null>(null);

  // ----------------------
  // Cargar perfil del usuario
  // ----------------------
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data || {});

        // rellenar username si ya existe una url guardada
        if (data?.instagram_url) {
          const extracted = data.instagram_url.replace("https://instagram.com/", "");
          setIgUsername(extracted);
        }

        setLoading(false);
      });
  }, []);

  // ----------------------
  // Guardar perfil
  // ----------------------
  const save = async () => {
    const method = profile?.id ? "PUT" : "POST";

    const response = await fetch("/api/profile", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    if (response.ok) {
      setProfile(await response.json());
      setSaveMessage("Configuración guardada.");
    } else {
      setSaveMessage("No se pudo guardar la configuración.");
    }
  };

  // ----------------------
  // Buscador Google Places
  // ----------------------
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (searchQuery.trim().length < 3) {
        setSearchResults([]);
        return;
      }

      setSearching(true);

      const res = await fetch("/api/maps/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();
      setSearchResults(data);
      setSearching(false);
    }, 400);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  // ----------------------
  // Obtener datos desde URL Google
  // ----------------------
  const checkGoogle = async () => {
    if (!profile?.google_review_url) {
      alert("Primero pon la URL de Google Reviews");
      return;
    }

    setCheckingGoogle(true);
    setGoogleInfo(null);

    try {
      const res = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_url: profile.google_review_url }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert("No se han podido obtener los datos.");
        return;
      }

      setGoogleInfo(data);
    } finally {
      setCheckingGoogle(false);
    }
  };

  // ----------------------
  // VALIDAR INSTAGRAM USERNAME
  // ----------------------
  const validateInstagram = async (username: string) => {
    if (!username) {
      setIgValid(null);
      return;
    }

    try {
      const res = await fetch("/api/instagram/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      setIgValid(data.exists);
    } catch {
      setIgValid(false);
    }
  };


  // validar automáticamente al escribir
  useEffect(() => {
    const delay = setTimeout(() => {
      validateInstagram(igUsername);
    }, 400);

    return () => clearTimeout(delay);
  }, [igUsername]);

  // sincronizar con profile
  useEffect(() => {
    setProfile((p) => ({
      ...p,
      instagram_url: igUsername
        ? `https://instagram.com/${igUsername}`
        : "",
    }));
  }, [igUsername]);

  // ----------------------
  // RENDER
  // ----------------------
  if (loading) return <p className="p-6">Cargando…</p>;

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-2xl font-semibold">Configuración del negocio</h1>

      {/* URL pública */}
      {profile?.id && (
        <p className="text-sm text-gray-600">
          URL pública:{" "}
          <a
            href={`/b/${profile.slug}`}
            target="_blank"
            className="underline text-blue-600"
          >
            /b/{profile.slug}
          </a>
        </p>
      )}

      {/* TARJETA DEL NEGOCIO */}
      {profile?.place_id && (
        <div className="mt-4 p-4 border rounded bg-gray-50 space-y-2 text-sm">
          {(() => {
            const category = profile.types?.[0] ?? "establishment";
            const icon = ICONS[category] ?? "🏢";
            return <div className="text-4xl mb-2">{icon}</div>;
          })()}

          <p className="text-lg font-semibold">{profile.business_name}</p>

          {profile.address && (
            <p className="text-gray-700">{profile.address}</p>
          )}

          {(profile.rating || profile.reviews) && (
            <p>
              ⭐ {profile.rating ?? "–"}{" "}
              {profile.reviews && (
                <span className="text-gray-600">
                  ({profile.reviews} reseñas)
                </span>
              )}
            </p>
          )}

          <p className="text-xs text-gray-500">Place ID: {profile.place_id}</p>
        </div>
      )}

      {/* CONTENIDO */}
      <div className="bg-white border rounded p-6 space-y-4">

        {/* Nombre */}
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Nombre del negocio"
          value={profile.business_name || ""}
          onChange={(e) =>
            setProfile({ ...profile, business_name: e.target.value })
          }
        />

        <label className="block text-sm">Place ID del negocio
          <input
            className="mt-1 w-full border px-3 py-2 rounded"
            placeholder="ID de Google Maps; opcional en desarrollo local"
            value={profile.place_id || ""}
            onChange={(e) => setProfile({ ...profile, place_id: e.target.value })}
          />
        </label>

        {/* URL Google Reviews */}
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="URL Google Reviews"
          value={profile.google_review_url || ""}
          onChange={(e) =>
            setProfile({ ...profile, google_review_url: e.target.value })
          }
        />

        {/* BUSCADOR GOOGLE */}
        <div className="space-y-2">
          <label className="font-medium text-sm block">Buscar tu negocio</label>

          <input
            className="w-full border px-3 py-2 rounded"
            placeholder="Ej: Walrus Tattoo Madrid"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searching && (
            <p className="text-sm text-gray-500">Buscando…</p>
          )}

          {searchResults.length > 0 && (
            <div className="border rounded bg-white max-h-64 overflow-auto divide-y">
              {searchResults.map((r) => {
                const category = r.types?.[0] ?? "establishment";
                const icon = ICONS[category] ?? "🏢";

                return (
                  <button
                    key={r.place_id}
                    className="flex gap-3 w-full text-left p-3 hover:bg-gray-100"
                    onClick={() => {
                      setProfile({
                        ...profile,
                        business_name: r.name,
                        google_review_url: `https://maps.google.com/?cid=${r.place_id}`,
                        place_id: r.place_id,
                        address: r.address,
                        rating: r.rating,
                        reviews: r.reviews,
                        types: r.types ?? [],
                      });

                      setSearchResults([]);
                      setSearchQuery("");
                    }}
                  >
                    <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-xl">{icon}</div>

                    <div className="flex-1">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-sm text-gray-600">
                        {r.address}
                      </div>
                      <div className="text-xs text-gray-500">
                        ⭐ {r.rating ?? "–"} ({r.reviews ?? "–"} reseñas)
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* GOOGLE - RESOLVE */}
        <button
          type="button"
          onClick={checkGoogle}
          className="text-sm underline text-blue-600"
          disabled={checkingGoogle}
        >
          {checkingGoogle
            ? "Consultando Google…"
            : "Obtener datos desde URL"}
        </button>

        {googleInfo && (
          <div className="mt-2 p-3 border rounded bg-gray-50 text-sm space-y-1 text-left">
            <p className="font-semibold">{googleInfo.name}</p>
            {googleInfo.address && <p>{googleInfo.address}</p>}
            <p>
              ⭐ {googleInfo.rating ?? "–"}{" "}
              {googleInfo.reviews != null &&
                `(${googleInfo.reviews} reseñas)`}
            </p>
            <p className="text-xs text-gray-500">
              Place ID: {googleInfo.place_id}
            </p>
          </div>
        )}

        {/* INSTAGRAM */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Instagram</label>

          <div className="flex gap-2 items-center">
            <span className="text-gray-600 text-sm">
              https://instagram.com/
            </span>

            <input
              className="border px-3 py-2 rounded w-full"
              placeholder="nombre_de_usuario"
              value={igUsername}
              onChange={(e) => setIgUsername(e.target.value)}
            />
          </div>

          {/* Estado de validación */}
          {igValid === true && (
            <p className="text-green-600 text-sm">
              ✓ Cuenta encontrada
            </p>
          )}
          {igValid === false && (
            <p className="text-red-600 text-sm">
              ✗ No existe esta cuenta
            </p>
          )}

          {igValid && (
            <a
              href={`https://instagram.com/${igUsername}`}
              target="_blank"
              className="underline text-blue-600 text-sm"
            >
              Ver Instagram →
            </a>
          )}
        </div>

        {/* GUARDAR */}
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(profile.weekly_email_enabled)}
            onChange={(e) => setProfile({ ...profile, weekly_email_enabled: e.target.checked })}
          />
          <span>Quiero recibir un resumen semanal por email cuando el envío esté configurado.</span>
        </label>
        <button
          onClick={save}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Guardar
        </button>
        {saveMessage && <p role="status" className="text-sm">{saveMessage}</p>}

      </div>

      {profile?.id && <ManualCaptureForm />}
    </div>
  );
}
