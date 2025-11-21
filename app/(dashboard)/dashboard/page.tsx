"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  // 1) Cargar el perfil del usuario autenticado
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data));
  }, []);

  // 2) Cuando el perfil esté listo, cargar el summary del dashboard
  useEffect(() => {
    if (!profile?.id) return;

    fetch(`/api/analytics/summary?profile_id=${profile.id}`)
      .then((res) => res.json())
      .then((data) => setSummary(data));
  }, [profile]);

  if (!summary) return <p>Cargando métricas...</p>;

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="p-4 bg-white shadow rounded">
          <p className="text-sm text-gray-500">Visitas hoy</p>
          <p className="text-2xl font-bold">{summary.visits_today}</p>
        </div>

        <div className="p-4 bg-white shadow rounded">
          <p className="text-sm text-gray-500">Clics hoy</p>
          <p className="text-2xl font-bold">{summary.clicks_today}</p>
        </div>

        <div className="p-4 bg-white shadow rounded">
          <p className="text-sm text-gray-500">Visitas últimos 7 días</p>
          <p className="text-2xl font-bold">{summary.visits_7d}</p>
        </div>

        <div className="p-4 bg-white shadow rounded">
          <p className="text-sm text-gray-500">CTR total</p>
          <p className="text-2xl font-bold">
            {(summary.ctr_total * 100).toFixed(1)}%
          </p>
        </div>

      </div>

      {/* Desglose por plataforma */}
      <div className="p-6 bg-white shadow rounded">
        <h2 className="text-lg font-semibold mb-4">Clics por plataforma</h2>

        <div className="flex gap-6">
          <div>
            <p>⭐ Google</p>
            <p className="text-2xl font-bold">{summary.google}</p>
          </div>
          <div>
            <p>📸 Instagram</p>
            <p className="text-2xl font-bold">{summary.instagram}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
