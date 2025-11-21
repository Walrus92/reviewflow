import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request, context: any) {
  const resolved = await context.params;
  const { slug } = resolved;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return Response.json(null, { status: 404 });
  }

  return Response.json(data);
}
