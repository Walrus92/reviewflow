import type { Finding } from "@/lib/findings";

export default function FindingCard({ finding }: { finding: Finding }) {
  return <article className="rounded-lg border bg-white p-5 space-y-3">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{finding.basis === "reviews" ? "Señal en reseñas" : finding.basis === "coverage" ? "Cobertura de datos" : "Señal en métricas"}</p>
      <h3 className="text-lg font-semibold mt-1">{finding.title}</h3>
    </div>
    <div className="space-y-1 text-sm text-gray-700">
      <p className="font-medium text-gray-900">Qué observamos</p>
      <ul className="list-disc pl-5 space-y-1">{finding.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
    <p className="text-sm"><strong>Qué haría ahora:</strong> {finding.action}</p>
    {finding.caveat && <p className="text-xs text-gray-500">{finding.caveat}</p>}
  </article>;
}
