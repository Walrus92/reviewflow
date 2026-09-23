"use client";

import { use, useEffect, useState } from "react";

// ICONOS
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

type PublicProfile = { types?: string[]; business_name?: string; rating?: number | null; reviews?: number | null; address?: string; google_review_url?: string; instagram_url?: string };

export default function BusinessLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use<{ slug: string }>(params);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profile-by-slug/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Cargando…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Negocio no encontrado
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white shadow p-6 rounded-lg space-y-6 text-center">

        {/* ICONO */}
        {(() => {
          const category = profile.types?.[0] ?? "establishment";
          const icon = ICONS[category] ?? "🏢";
          return <div className="text-6xl mb-3">{icon}</div>;
        })()}

        {/* NOMBRE */}
        <h1 className="text-3xl font-bold">
          {profile.business_name || "Negocio"}
        </h1>

        {/* RATING */}
        {(profile.rating || profile.reviews) && (
          <p className="text-lg font-semibold">
            ⭐ {profile.rating ?? "–"}{" "}
            {profile.reviews && (
              <span className="text-gray-600 text-sm">({profile.reviews})</span>
            )}
          </p>
        )}

        {/* DIRECCIÓN */}
        {profile.address && (
          <p className="text-gray-600 text-sm">{profile.address}</p>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-4 mt-6">

          {profile.google_review_url && (
            <a
              href={profile.google_review_url}
              className="bg-blue-600 text-white py-3 rounded-lg font-semibold"
              target="_blank"
            >
              ⭐ Dejar reseña
            </a>
          )}

          {profile.instagram_url && (
            <a
              href={profile.instagram_url}
              className="bg-pink-600 text-white py-3 rounded-lg font-semibold"
              target="_blank"
            >
              📸 Instagram
            </a>
          )}

        </div>
      </div>
    </div>
  );
}
