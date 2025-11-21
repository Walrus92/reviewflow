export default function Card({
  title,
  value,
  delta,
}: {
  title: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="bg-white border rounded p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {delta && <p className="text-green-600 text-sm mt-1">{delta}</p>}
    </div>
  );
}
