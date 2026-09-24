"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FindingCard from "./FindingCard";
import { ownReviewFindings } from "@/lib/findings";
import { buildReviewPulse, reviewTrendFindings } from "@/lib/reviewPulse";
import { dedupeLiveGoogleReviews, toLiveReviewObservations, type GoogleLiveReview, type GoogleLiveReviewPage } from "@/lib/liveGoogleReviews";

type LiveResult = {
  reviews: GoogleLiveReview[];
  averageRating: number;
  totalReviewCount: number;
  complete: boolean;
  fetchedAt: string;
};

type Status = "loading" | "ready" | "not_connected" | "not_configured" | "mismatch" | "error";

const starCount: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function googleAvatar(url: string | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && /(^|\.)googleusercontent\.com$/.test(parsed.hostname) ? url : null;
  } catch { return null; }
}

export default function LiveGoogleReviews({ businessName, previousVisitAt = null, detailed = false }: {
  businessName: string;
  previousVisitAt?: string | null;
  detailed?: boolean;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<LiveResult | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setStatus("loading");
      try {
        const reviews: GoogleLiveReview[] = [];
        let pageToken: string | null = null;
        let averageRating = 0;
        let totalReviewCount = 0;
        for (let page = 0; page < 4; page++) {
          const url = new URL("/api/google-business/reviews", window.location.origin);
          if (pageToken) url.searchParams.set("pageToken", pageToken);
          const response = await fetch(url, { cache: "no-store", signal: controller.signal });
          if (response.status === 404) { setStatus("not_connected"); return; }
          if (response.status === 503) { setStatus("not_configured"); return; }
          if (response.status === 409) { setStatus("mismatch"); return; }
          if (!response.ok) throw new Error("GOOGLE_REVIEWS_UNAVAILABLE");
          const data = await response.json() as GoogleLiveReviewPage;
          if (data.source !== "google_business_profile" || !Array.isArray(data.reviews)) throw new Error("INVALID_GOOGLE_REVIEWS");
          reviews.push(...data.reviews);
          averageRating = data.averageRating;
          totalReviewCount = data.totalReviewCount;
          pageToken = data.nextPageToken;
          if (!pageToken) break;
        }
        if (controller.signal.aborted) return;
        setResult({ reviews: dedupeLiveGoogleReviews(reviews), averageRating, totalReviewCount,
          complete: !pageToken, fetchedAt: new Date().toISOString() });
        setStatus("ready");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    })();
    return () => controller.abort();
  }, [refresh]);

  const observations = result ? toLiveReviewObservations(result.reviews, businessName) : [];
  const today = new Date();
  const recentStart = new Date(today.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const recent = observations.filter((review) => review.publishedAt >= recentStart);
  const trendFindings = result ? reviewTrendFindings(observations, today, !result.complete) : [];
  const repeatedFindings = ownReviewFindings(recent).filter((finding) => !trendFindings.some((trend) =>
    (trend.id === "review-trend-hours" && finding.id === "opening-hours") ||
    (trend.id === "review-trend-waiting" && finding.id === "own-waiting") ||
    (trend.id === "review-trend-service" && finding.id === "own-service-praise")));
  const findings = [...trendFindings, ...repeatedFindings].slice(0, detailed ? 3 : 2);
  const pulse = buildReviewPulse(observations, today, previousVisitAt);
  const withText = result?.reviews.filter((review) => Boolean(review.comment?.trim())).length ?? 0;
  const shownReviews = result?.reviews.filter((review) => Boolean(review.comment?.trim()))
    .sort((a, b) => Date.parse(b.createTime ?? "") - Date.parse(a.createTime ?? ""))
    .slice(0, 10) ?? [];

  return <section aria-labelledby="live-google-title" className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{status === "ready" ? "Fuente conectada · consulta en directo" : "Automatización de reseñas propias"}</p>
        <h2 id="live-google-title" className="mt-1 text-xl font-semibold text-slate-950">Reseñas de tu ficha de Google</h2>
      </div>
      {status === "ready" && <button type="button" onClick={() => setRefresh((value) => value + 1)}
        className="text-sm font-medium text-blue-700 underline underline-offset-2">Actualizar consulta</button>}
    </div>
    {status === "loading" && <p role="status" className="text-sm text-slate-600">Consultando la ficha autorizada…</p>}
    {status === "not_connected" && <p className="text-sm text-slate-700">Conecta la ficha de tu negocio en <Link href="/settings" className="font-medium text-blue-700 underline">Configuración</Link> para cargar sus reseñas automáticamente.</p>}
    {status === "not_configured" && <p className="text-sm text-slate-700">La conexión con Google Business Profile está pendiente de aprobación y configuración. En cuanto esté lista, el propietario podrá autorizar su ficha aquí.</p>}
    {status === "mismatch" && <p role="alert" className="text-sm text-amber-900">La ficha conectada ya no coincide con el negocio de la cuenta. Revísala en <Link href="/settings" className="underline">Configuración</Link>.</p>}
    {status === "error" && <div className="space-y-2 text-sm text-slate-700"><p role="alert">No se pudieron consultar las reseñas ahora.</p><button type="button" className="text-blue-700 underline" onClick={() => setRefresh((value) => value + 1)}>Reintentar</button></div>}
    {status === "ready" && result && <>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-800">
        <p><strong>{result.averageRating.toFixed(1)} ★</strong> · {result.totalReviewCount.toLocaleString("es-ES")} reseñas en la ficha</p>
        <p><strong>{result.complete ? "" : "Al menos "}{pulse.countRecent7d}</strong> con texto leído y fecha de los últimos 7 días</p>
        {previousVisitAt && <p><strong>{result.complete ? "" : "Al menos "}{pulse.countSinceVisit ?? 0}</strong> con texto y fecha posterior a tu última visita</p>}
      </div>
      <p className="text-xs text-slate-600">Consulta: {new Date(result.fetchedAt).toLocaleString("es-ES")}. Leídas {result.reviews.length} reseñas distintas, {withText} con texto. {result.complete ? "Se consultaron todas las páginas disponibles." : "La consulta se limita a 4 páginas (hasta 200 reseñas); se omiten tendencias entre periodos."} El análisis se calcula durante esta visita y no guarda textos de Google.</p>
      {findings.length ? <div className="grid gap-3 md:grid-cols-2">
        {findings.map((finding) => <FindingCard key={finding.id} finding={finding} reviewBasisLabel="Reseñas de Google consultadas ahora" />)}
      </div> : <p className="rounded-xl bg-white p-4 text-sm text-slate-700">No hay menciones repetidas con evidencia suficiente en los textos recientes leídos. Esto no equivale a ausencia de problemas.</p>}
      {detailed && <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Textos recientes de la ficha</h3>
        {shownReviews.length === 0 ? <p className="text-sm text-slate-600">La ficha no ha devuelto reseñas con texto.</p> :
          <div className="space-y-3">{shownReviews.map((review, index) => <article key={review.reviewId ?? review.name ?? index} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              {googleAvatar(review.reviewer?.profilePhotoUrl) && !review.reviewer?.isAnonymous &&
                <Image unoptimized src={googleAvatar(review.reviewer?.profilePhotoUrl)!} alt="" width={28} height={28} className="rounded-full" />}
              <p className="text-sm font-medium text-slate-900">{review.reviewer?.isAnonymous ? "Usuario anónimo" : review.reviewer?.displayName ?? "Cliente de Google"} · {"★".repeat(starCount[review.starRating ?? ""] ?? 0)} · {review.createTime ? new Date(review.createTime).toLocaleDateString("es-ES") : "Fecha no disponible"}</p>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{review.comment}</p>
          </article>)}</div>}
      </div>}
      {!detailed && <Link href="/reviews" className="inline-block text-sm font-medium text-blue-700 underline">Ver reseñas y cobertura</Link>}
    </>}
  </section>;
}
