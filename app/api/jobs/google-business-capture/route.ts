import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { googleBusinessConfigured } from "@/lib/googleBusiness";
import { captureGoogleBusiness } from "@/lib/captureGoogleBusiness";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !token || Buffer.byteLength(secret) !== Buffer.byteLength(token) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(token))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!googleBusinessConfigured()) return NextResponse.json({ enabled: false, captured: 0 });
  const { data: connections, error } = await supabaseAdmin.from("google_business_connections")
    .select("profile_id,place_id,location_name,refresh_token_encrypted")
    .order("profile_id").limit(50);
  if (error) return NextResponse.json({ error: "CONNECTION_QUERY_FAILED" }, { status: 500 });
  let captured = 0;
  let failed = 0;
  for (const connection of connections ?? []) {
    try {
      const result = await captureGoogleBusiness(connection);
      if (!result.duplicate) captured++;
      await supabaseAdmin.from("google_business_connections")
        .update({ last_capture_at: new Date().toISOString(), last_error: null })
        .eq("profile_id", connection.profile_id);
    } catch (cause) {
      failed++;
      const reason = cause instanceof Error ? cause.message.slice(0, 120) : "UNKNOWN";
      await supabaseAdmin.from("google_business_connections")
        .update({ last_error: reason }).eq("profile_id", connection.profile_id);
      console.error("GOOGLE_BUSINESS_CAPTURE_FAILED", connection.profile_id, reason);
    }
  }
  return NextResponse.json({ captured, failed, batchSize: connections?.length ?? 0 },
    { status: failed ? 500 : 200 });
}
