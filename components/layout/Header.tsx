import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function Header() {
  const cookieStore = await cookies();    // 👈 AQUÍ EL CAMBIO
  const token = cookieStore.get("reviewflow.session")?.value;

  let email = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
      email = typeof decoded === "string" ? null : decoded.email;
    } catch {
      // token inválido, expirado, etc
    }
  }

  return (
    <header className="w-full border-b bg-white h-14 flex items-center px-6 justify-between">
      <h1 className="text-lg font-semibold">ReviewFlow</h1>
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-700">{email ?? ""}</p>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="text-sm underline">Salir</button>
        </form>
      </div>
    </header>
  );
}
