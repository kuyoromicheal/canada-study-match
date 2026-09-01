import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseConfigError,
  getSupabaseEnv,
  isSupabaseConfigured,
  validateSupabaseAnonKey,
} from "@/lib/supabase/env";

export { isSupabaseConfigured, getSupabaseConfigError };

export function createClient() {
  const env = getSupabaseEnv();
  if (!env || validateSupabaseAnonKey(env.anonKey)) return null;

  return createBrowserClient(env.url, env.anonKey);
}

export function getAuthConfigError(): string | null {
  return getSupabaseConfigError();
}
