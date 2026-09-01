import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side Supabase client for public catalog reads (programs, schools, counts).
 * Uses the service role when available so catalog status and listings stay accurate
 * even if anon count queries fail or the anon key is misconfigured on a deployment.
 */
export async function createCatalogClient() {
  const admin = createAdminClient();
  if (admin) return admin;
  return createClient();
}
