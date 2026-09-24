import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function Header() {
  const cookieStore = await cookies();
  const token = cookieStore.get("reviewflow.session")?.value;

  let email: string | null = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
      email = typeof decoded !== "string" && typeof decoded.email === "string" ? decoded.email : null;
    } catch {
      // Una sesión inválida se presenta sin email.
    }
  }

  return (
    <header className="flex min-h-14 w-full items-center justify-between gap-3 border-b bg-white px-3 py-2 sm:px-6">
      <h1 className="shrink-0 text-base font-semibold sm:text-lg">ReviewFlow</h1>
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-4">
        <p className="min-w-0 truncate text-right text-xs text-slate-600 sm:text-sm" title={email ?? undefined}>{email ?? ""}</p>
        <form action="/api/auth/logout" method="post" className="shrink-0">
          <button type="submit" className="whitespace-nowrap text-sm underline">Salir</button>
        </form>
      </div>
    </header>
  );
}
