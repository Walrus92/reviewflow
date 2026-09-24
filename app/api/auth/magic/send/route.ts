import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }

    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count, error: rateError } = await getSupabaseAdmin()
      .from("magic_links")
      .select("token", { head: true, count: "exact" })
      .eq("email", email)
      .gte("created_at", minuteAgo);
    if (rateError) throw rateError;
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "TRY_AGAIN_LATER" }, { status: 429 });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { error: insertError } = await getSupabaseAdmin()
      .from("magic_links")
      .insert({ email, token: tokenHash });
    if (insertError) throw insertError;

    const url = `${process.env.NEXTAUTH_URL}/api/auth/magic?token=${encodeURIComponent(token)}`;
    const databaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
    const requestHost = new URL(req.url).hostname;
    const localHosts = ["localhost", "127.0.0.1"];
    if (process.env.NODE_ENV === "development" && process.env.DEV_MAGIC_LINK_ENABLED === "true" &&
        localHosts.includes(requestHost) && localHosts.includes(databaseHost)) {
      return NextResponse.json({ ok: true, devLink: `${new URL(req.url).origin}/api/auth/magic?token=${encodeURIComponent(token)}` });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: mailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "ReviewFlow <onboarding@resend.dev>",
      to: email,
      subject: "Tu enlace de acceso a ReviewFlow",
      html: `<p>Accede a ReviewFlow: <a href="${url}">Abrir enlace</a></p><p>Caduca en 15 minutos y solo se puede usar una vez.</p>`,
    });
    if (mailError) {
      await getSupabaseAdmin().from("magic_links").delete().eq("token", tokenHash);
      throw mailError;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MAGIC_LINK_SEND_ERROR", error);
    return NextResponse.json({ error: "EMAIL_SEND_FAILED" }, { status: 500 });
  }
}
