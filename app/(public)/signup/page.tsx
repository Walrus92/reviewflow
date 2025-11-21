"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white border rounded p-6 w-full max-w-sm space-y-4 shadow">
        <h1 className="text-xl font-semibold text-center">Crear cuenta</h1>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
        />

        <button
          onClick={() => signIn("email", { email })}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
        >
          Continuar
        </button>

        <p className="text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-blue-600 underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
