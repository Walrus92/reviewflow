"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const path = usePathname();

  const links = [
    { href: "/dashboard", label: "Qué ha cambiado" },
    { href: "/competitors", label: "Competidores" },
    { href: "/history", label: "Histórico" },
    { href: "/reviews", label: "Reseñas propias" },
    { href: "/alerts", label: "Alertas" },
    { href: "/settings", label: "Configuración" },
  ];

  return (
    <nav aria-label="Navegación principal"
      className="grid grid-cols-3 gap-1 border-b border-slate-200 bg-white p-2 md:sticky md:top-14 md:flex md:h-[calc(100vh-3.5rem)] md:w-52 md:flex-none md:flex-col md:gap-2 md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={path === l.href ? "page" : undefined}
          className={`flex min-h-10 items-center justify-center rounded-md px-2 py-2 text-center text-xs leading-tight transition-colors md:justify-start md:px-3 md:text-left md:text-sm ${
            path === l.href ? "bg-blue-50 font-semibold text-blue-900" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
