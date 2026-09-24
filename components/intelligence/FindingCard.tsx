import type { Finding } from "@/lib/findings";

const basisLabel = {
  reviews: "Señal en reseñas aportadas",
  coverage: "Cobertura de datos",
  metrics: "Señal en capturas",
} as const;

const accent = {
  reviews: "border-l-amber-500",
  coverage: "border-l-slate-400",
  metrics: "border-l-blue-600",
} as const;

export default function FindingCard({ finding, reviewBasisLabel }: { finding: Finding; reviewBasisLabel?: string }) {
  return <article className={`h-full rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm sm:p-6 ${accent[finding.basis]}`}>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{finding.basis === "reviews" && reviewBasisLabel ? reviewBasisLabel : basisLabel[finding.basis]}</p>
    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{finding.title}</h3>
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qué observamos</p>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
        {finding.evidence.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="text-slate-400">•</span><span>{item}</span></li>)}
      </ul>
    </div>
    <div className="mt-5 rounded-xl bg-blue-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Siguiente paso</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-900">{finding.action}</p>
    </div>
    {finding.caveat && <p className="mt-4 text-xs leading-relaxed text-slate-500">{finding.caveat}</p>}
  </article>;
}
