export default function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-gray-300"
    />
  );
}
