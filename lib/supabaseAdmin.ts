import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

let client: ReturnType<typeof createAdminClient> | undefined;

export function getSupabaseAdmin() {
  if (client) return client;
  client = createAdminClient();
  return client;
}
