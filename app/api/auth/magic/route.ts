import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("magic_links")
    .delete()
    .eq("token", tokenHash)
    .gte("created_at", cutoff)
    .select("email")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const email = data.email;
  const session = jwt.sign({ email }, process.env.NEXTAUTH_SECRET!, {
    subject: email,
    expiresIn: "7d",
  });
  const response = NextResponse.redirect(new URL("/dashboard", req.url));
  response.cookies.set("reviewflow.session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
