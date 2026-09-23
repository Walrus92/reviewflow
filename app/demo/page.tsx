import Link from "next/link";
import FindingCard from "@/components/intelligence/FindingCard";
import { demoOverview, demoReviewAnalysis } from "@/lib/demo";
import { reviewFindings } from "@/lib/findings";

export default async function DemoPage() {
  const { own, competitors } = demoOverview();
  const { reviews } = await demoReviewAnalysis();
  const findings = reviewFindings(reviews);
  return <main className="min-h-screen bg-gray-50 p-6 md:p-10">
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex justify-between items-start gap-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-blue-700">CASO SIMULADO · RESEÑAS FICTICIAS</p>
          <h1 className="text-3xl font-bold">Lo que un dueño necesita saber</h1>
          <p className="text-gray-600">Las cifras avisan. Las palabras de los clientes ayudan a decidir qué investigar y cambiar.</p>
        </div>
        <Link href="/login" className="underline whitespace-nowrap">Entrar</Link>
      </header>

      <section className="rounded-lg border bg-white p-5 space-y-2">
        <h2 className="font-semibold">El cambio detectado</h2>
        <p>Tu negocio: <strong>{own.rating?.toFixed(1)} estrellas</strong> ({own.ratingChange?.toFixed(1)} desde la captura anterior), {own.reviewsGained7d} reseñas nuevas en 7 días.</p>
        <p>{competitors[0].name}: <strong>{competitors[0].rating?.toFixed(1)} estrellas</strong>, {competitors[0].reviewsGained7d} reseñas nuevas en 7 días.</p>
        <p className="text-sm text-gray-600">Esto revela una brecha, pero no explica su causa. Estas son las señales extraídas de {reviews.length} reseñas ficticias:</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Tres decisiones que podrías tomar</h2>
        <div className="grid gap-3">{findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div>
      </section>

      <section className="rounded-lg border bg-white p-5 space-y-2">
        <h2 className="font-semibold">Qué falta para hacerlo con tu negocio</h2>
        <p className="text-sm text-gray-700">Este caso es una demostración: no usa reseñas reales. La cuenta actual solo dispone de valoración y número de reseñas. Para generar estas señales con datos tuyos necesitamos conectar una fuente autorizada de textos y conservar su procedencia.</p>
        <p className="text-sm text-gray-500">Las menciones son pistas para investigar, no pruebas de que un horario, una persona o un plazo hayan causado el cambio de valoración o ventas.</p>
      </section>
    </div>
  </main>;
}
