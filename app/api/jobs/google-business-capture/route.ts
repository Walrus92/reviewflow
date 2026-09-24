import { NextResponse } from "next/server";

// Historical persistence of Business Profile API content is disabled.
// Keep this URL inert even if an earlier deployment still invokes the cron.
export async function GET() {
  return NextResponse.json({ error: "GOOGLE_BUSINESS_CAPTURE_DISABLED" }, { status: 410 });
}
