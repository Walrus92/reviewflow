"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const send = async () => {
    const response = await fetch("/api/auth/magic/send", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    setDevLink(typeof data.devLink === "string" ? data.devLink : "");
    setMessage(response.ok ? data.devLink ? "Acceso local listo." : "Enlace enviado. Revisa tu correo." : "No se pudo enviar el enlace.");
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white border rounded p-6 w-full max-w-sm space-y-4 shadow">
        <h1 className="text-xl font-semibold text-center">Entrar en ReviewFlow</h1>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
        />

        <button
          onClick={send}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
        >
          Entrar
        </button>

        {message && <p role="status" className="text-sm text-center">{message}</p>}
        {devLink && <a className="block text-center text-blue-600 underline" href={devLink}>Abrir acceso local</a>}

        <p className="text-center text-sm text-gray-600">
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className="text-blue-600 underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
