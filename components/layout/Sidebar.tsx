"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const path = usePathname();

  const links = [
    { href: "/dashboard", label: "Qué ha cambiado" },
    { href: "/competitors", label: "Competidores" },
    { href: "/history", label: "Histórico" },
    { href: "/alerts", label: "Alertas" },
    { href: "/settings", label: "Configuración" },
  ];

  return (
    <div className="w-52 bg-white border-r h-screen p-4 space-y-3">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`block py-2 px-3 rounded hover:bg-gray-100 ${
            path === l.href ? "bg-gray-100 font-medium" : ""
          }`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
