import { NextResponse } from "next/server";
import { Resend } from "resend";
import { v4 as uuid } from "uuid";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { email } = await req.json();
  const token = uuid();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("magic_links").insert({ email, token });

  const url = `${process.env.NEXTAUTH_URL}/api/auth/magic?token=${token}`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "ReviewFlow <onboarding@resend.dev>",
    to: email,
    subject: "Tu enlace de acceso a ReviewFlow",
    html: `<p>Accede: <a href="${url}">${url}</a></p>`,
  });

  return NextResponse.json({ ok: true });
}
