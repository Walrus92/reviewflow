import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadOverview } from "@/lib/intelligence";
import { hasFreshCapture, weeklyDigest } from "@/lib/digest";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !token) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (process.env.WEEKLY_EMAIL_ENABLED !== "true") {
    return NextResponse.json({ enabled: false, sent: 0 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: "EMAIL_NOT_CONFIGURED" }, { status: 503 });
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - (now.getUTCDay() + 6) % 7);
  weekStart.setUTCHours(0, 0, 0, 0);
  const cutoff = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const { data: profiles, error } = await supabaseAdmin.from("profiles")
    .select("id,email,weekly_email_last_sent_at")
    .eq("weekly_email_enabled", true)
    .or(`weekly_email_last_sent_at.is.null,weekly_email_last_sent_at.lt.${cutoff}`)
    .order("id")
    .limit(100);
  if (error) return NextResponse.json({ error: "PROFILE_QUERY_FAILED" }, { status: 500 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;
  for (const profile of profiles ?? []) {
    try {
      if (!profile.email) continue;
      const overview = await loadOverview(profile.id, now, cutoff);
      if (!hasFreshCapture(overview, cutoff)) continue;
      const digest = weeklyDigest(overview, `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`);
      const week = weekStart.toISOString().slice(0, 10);
      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: profile.email,
        ...digest,
      }, { idempotencyKey: `weekly-${profile.id}-${week}` });
      if (sendError) throw sendError;
      const { error: updateError } = await supabaseAdmin.from("profiles")
        .update({ weekly_email_last_sent_at: now.toISOString() })
        .eq("id", profile.id);
      if (updateError) throw updateError;
      sent++;
    } catch (cause) {
      failed++;
      console.error("WEEKLY_EMAIL_PROFILE_FAILED", profile.id, cause);
    }
  }
  return NextResponse.json({ enabled: true, sent, failed, batchSize: profiles?.length ?? 0 }, {
    status: failed ? 500 : 200,
  });
}
