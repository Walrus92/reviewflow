import Link from "next/link";
import { demoOverview, demoReviewAnalysis } from "@/lib/demo";

export default async function DemoPage() {
  const { own, competitors, insights } = demoOverview();
  const reviewAnalysis = await demoReviewAnalysis();
  return <main className="min-h-screen bg-gray-50 p-6 md:p-10">
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="flex justify-between items-center gap-4">
        <div><p className="text-sm font-medium text-blue-700">DEMO · DATOS FICTICIOS</p>
          <h1 className="text-3xl font-bold">ReviewFlow</h1>
          <p className="text-gray-600">Qué ha cambiado en la reputación de tu negocio y su entorno.</p></div>
        <Link href="/login" className="underline">Entrar</Link>
      </header>
      <section className="rounded-lg bg-white border p-5">
        <h2 className="font-semibold text-lg">Mi negocio</h2>
        <p className="mt-2 text-2xl">⭐ {own.rating} · {own.reviewCount} reseñas</p>
        <p className="text-red-700">Valoración: {own.ratingChange?.toFixed(1)} desde la captura anterior</p>
        <p>Reseñas en 7 días: +{own.reviewsGained7d}</p>
      </section>
      <section className="space-y-3"><h2 className="font-semibold text-lg">Competidores</h2>
        <div className="grid gap-3 md:grid-cols-2">{competitors.map((competitor) => <div key={competitor.id} className="rounded-lg bg-white border p-5">
          <h3 className="font-medium">{competitor.name}</h3>
          <p>⭐ {competitor.rating} · {competitor.reviewCount} reseñas</p>
          <p>Reseñas en 7 días: +{competitor.reviewsGained7d}</p>
        </div>)}</div>
      </section>
      <section className="rounded-lg bg-white border p-5 space-y-2"><h2 className="font-semibold text-lg">Insights automáticos</h2>
        <ul className="list-disc pl-5">{insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>
      </section>
      <section className="rounded-lg bg-white border p-5 space-y-3"><h2 className="font-semibold text-lg">Análisis de reseñas · muestra ficticia</h2>
        <p>Negocio propio: {reviewAnalysis.own.total} textos; {reviewAnalysis.own.negativeCount} con 1–2 estrellas.
          {reviewAnalysis.own.negativeTopics.length > 0 && ` Temas en reseñas negativas: ${reviewAnalysis.own.negativeTopics.join(", ")}.`}</p>
        <p>Competidor: {reviewAnalysis.competitor.total} textos; {reviewAnalysis.competitor.negativeCount} con 1–2 estrellas.
          {reviewAnalysis.competitor.negativeTopics.length > 0 && ` Temas en reseñas negativas: ${reviewAnalysis.competitor.negativeTopics.join(", ")}.`}</p>
        <ul className="space-y-2">{reviewAnalysis.reviews.map((review) => <li key={review.id} className="border-t pt-2 text-sm">
          <strong>{review.businessName}</strong> · {review.rating}/5 · {review.text}
        </li>)}</ul>
        <p className="text-xs text-gray-500">Este ejemplo prueba el análisis y la interfaz. No utiliza reseñas reales ni afirma cubrir todas las reseñas de ningún negocio.</p>
      </section>
    </div>
  </main>;
}
