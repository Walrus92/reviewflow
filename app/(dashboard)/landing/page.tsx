export default function LandingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Landing para clientes</h1>

      <p className="text-gray-600">
        Esta es la landing que verán tus clientes tras el tatuaje. Pronto podrás modificarla.
      </p>

      <div className="bg-white border rounded p-6 max-w-md space-y-4">
        <h2 className="text-lg font-semibold">@blackheart_tattoo</h2>
        <div className="space-y-3">
          <button className="w-full bg-blue-600 text-white py-2 rounded">
            Dejar reseña en Google ★
          </button>
          <button className="w-full bg-pink-600 text-white py-2 rounded">
            Seguir en Instagram
          </button>
          <button className="w-full bg-gray-900 text-white py-2 rounded">
            Enviar mensaje
          </button>
        </div>
      </div>
    </div>
  );
}
