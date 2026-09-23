import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
  const resolved = await context.params;
  const { slug } = resolved;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("business_name,slug,types,rating,reviews,address,google_review_url,instagram_url")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return Response.json(null, { status: 404 });
  }

  return Response.json(data);
}
