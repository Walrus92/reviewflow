"use client";

import { useEffect, useState } from "react";

type AlertRecord = {
  id: number;
  profile_id: string;
  subject_type?: string | null;
  subject_place_id?: string | null;
  type: string;
  payload: Record<string, string | number | null> | null;
  created_at: string;
};

interface AlertsResponse {
  ok: boolean;
  alerts: AlertRecord[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildLabel(alert: AlertRecord): string {
  const p = alert.payload || {};
  switch (alert.type) {
    case "review_increase": {
      const delta = p.delta_reviews ?? "?";
      return `+${delta} reseñas`;
    }
    case "rating_up": {
      const from = p.previous_rating ?? "?";
      const to = p.current_rating ?? "?";
      return `Rating ↑ ${from} → ${to}`;
    }
    case "rating_down": {
      const from = p.previous_rating ?? "?";
      const to = p.current_rating ?? "?";
      return `Rating ↓ ${from} → ${to}`;
    }
    default:
      return alert.type;
  }
}

function buildSubject(alert: AlertRecord): string {
  const p = alert.payload || {};
  const name = p.subject_name as string | undefined;
  const place = (alert.subject_place_id || p.subject_place_id) as
    | string
    | undefined;

  if (name && place) return `${name} (${place})`;
  if (name) return name;
  if (place) return place;
  return "Negocio";
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState<"7" | "30">("7");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("days", days);
        if (typeFilter) params.set("type", typeFilter);

        const res = await fetch(`/api/alerts?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          setError(`Error ${res.status}`);
          setAlerts([]);
          return;
        }

        const data = (await res.json()) as AlertsResponse;
        setAlerts(data.alerts || []);
      } catch (e) {
        console.error(e);
        setError("Error al cargar alertas");
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [days, typeFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold mb-2">Alertas</h1>

      <p className="text-gray-600">
        Aquí verás las alertas nuevas: reseñas, actividad en la competencia y
        cambios importantes en tu reputación.
      </p>

      {/* Filtros */}
      <div className="bg-white border rounded p-4 max-w-2xl flex flex-wrap gap-4 text-sm items-center">
        <div className="flex items-center gap-2">
          <span className="font-medium">Rango:</span>
          <button
            onClick={() => setDays("7")}
            className={`px-3 py-1 rounded border ${
              days === "7" ? "bg-blue-600 text-white" : "bg-transparent"
            }`}
          >
            Últimos 7 días
          </button>
          <button
            onClick={() => setDays("30")}
            className={`px-3 py-1 rounded border ${
              days === "30" ? "bg-blue-600 text-white" : "bg-transparent"
            }`}
          >
            Últimos 30 días
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Tipo:</span>
          <button
            onClick={() => setTypeFilter("")}
            className={`px-3 py-1 rounded border ${
              typeFilter === "" ? "bg-blue-600 text-white" : "bg-transparent"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter("review_increase")}
            className={`px-3 py-1 rounded border ${
              typeFilter === "review_increase"
                ? "bg-blue-600 text-white"
                : "bg-transparent"
            }`}
          >
            Nuevas reseñas
          </button>
          <button
            onClick={() => setTypeFilter("rating_up,rating_down")}
            className={`px-3 py-1 rounded border ${
              typeFilter === "rating_up,rating_down"
                ? "bg-blue-600 text-white"
                : "bg-transparent"
            }`}
          >
            Cambios de rating
          </button>
        </div>
      </div>

      <div className="bg-white border rounded p-4 space-y-4 max-w-2xl">
        {loading && (
          <p className="text-gray-500 text-sm">Cargando alertas…</p>
        )}

        {error && (
          <p className="text-red-500 text-sm">
            {error}
          </p>
        )}

        {!loading && !error && alerts.length === 0 && (
          <p className="text-gray-500 text-sm">
            No hay alertas en el rango seleccionado.
          </p>
        )}

        {!loading &&
          !error &&
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="border-b last:border-b-0 pb-3 last:pb-0"
            >
              <p className="font-medium">
                {buildLabel(alert)}
              </p>
              <p className="text-gray-600 text-sm">
                {buildSubject(alert)} — {formatDate(alert.created_at)}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
