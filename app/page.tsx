import Link from "next/link";

export default function Home() {
  return <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <div className="max-w-2xl space-y-6">
      <p className="text-sm font-semibold text-blue-700">ReviewFlow</p>
      <h1 className="text-4xl font-bold">Entiende qué ha cambiado en tu reputación y la de tus competidores.</h1>
      <p className="text-lg text-gray-600">Compara valoración, volumen de reseñas y crecimiento a lo largo del tiempo. Revisa los cambios relevantes en un solo lugar.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/login" className="rounded bg-black px-5 py-3 text-white">Entrar</Link>
        <Link href="/demo" className="rounded border px-5 py-3">Ver demo con datos ficticios</Link>
      </div>
    </div>
  </main>;
}
