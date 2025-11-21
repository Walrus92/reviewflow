export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold mb-2">Alertas</h1>

      <p className="text-gray-600">
        Aquí verás las alertas nuevas: reseñas, actividad en la competencia y avisos importantes.
      </p>

      <div className="bg-white border rounded p-4 space-y-4 max-w-2xl">

        <div className="border-b pb-3">
          <p className="font-medium">Nueva reseña 5★</p>
          <p className="text-gray-600 text-sm">"Excelente trabajo" — hace 1h</p>
        </div>

        <div className="border-b pb-3">
          <p className="font-medium">Nueva reseña 4★ de la competencia</p>
          <p className="text-gray-600 text-sm">InkZone Tattoo — hace 5h</p>
        </div>

        <div>
          <p className="font-medium">Sugerencia semanal</p>
          <p className="text-gray-600 text-sm">
            Publica un “antes/después” de un tatuaje pequeño para mejorar engagement.
          </p>
        </div>

      </div>
    </div>
  );
}
