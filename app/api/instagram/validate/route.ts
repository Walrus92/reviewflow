import { NextRequest, NextResponse } from "next/server";
import { getEmailFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    if (!getEmailFromCookie(req)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ exists: false }, { status: 400 });
    }

    const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;

    const igRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0", // obligatorio o IG devuelve 403
      },
      cache: "no-store",
    });

    // Si Instagram devuelve 200 → existe
    if (igRes.ok) {
      return NextResponse.json({ exists: true });
    }

    // Si devuelve 404 → no existe
    if (igRes.status === 404) {
      return NextResponse.json({ exists: false });
    }

    // Otros códigos → error
    return NextResponse.json({ exists: false }, { status: 500 });
  } catch {
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
