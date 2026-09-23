import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/requestAuth";
import { loadOverview } from "@/lib/intelligence";

export async function GET(req: NextRequest) {
  const auth = await requireProfile(req);
  if (auth.error) return auth.error;
  try {
    const overview = await loadOverview(auth.profile.id);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("OVERVIEW_ERROR", error);
    return NextResponse.json({ error: "OVERVIEW_FAILED" }, { status: 500 });
  }
}
