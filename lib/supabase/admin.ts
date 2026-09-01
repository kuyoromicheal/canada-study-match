import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export function createAdminClient() {
  const env = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!env?.url || !key) return null;

  return createClient(env.url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
