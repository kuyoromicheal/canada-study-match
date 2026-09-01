export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function validateSupabaseAnonKey(anonKey: string): string | null {
  if (anonKey.startsWith("http://") || anonKey.startsWith("https://")) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is set to a URL — paste the anon JWT key from Supabase → Settings → API.";
  }
  if (!anonKey.startsWith("eyJ")) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a valid JWT. Copy the anon public key from Supabase → Settings → API.";
  }
  const parts = anonKey.split(".");
  if (parts.length !== 3) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is malformed. Copy the full anon key from Supabase.";
  }
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(base64, "base64").toString("utf8")
        : atob(base64);
    const payload = JSON.parse(json) as { role?: string };
    if (payload.role === "service_role") {
      return "NEXT_PUBLIC_SUPABASE_ANON_KEY is set to the service_role key. Use the anon public key instead.";
    }
  } catch {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY could not be parsed. Copy the anon key again from Supabase.";
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  const env = getSupabaseEnv();
  if (!env) return false;
  return validateSupabaseAnonKey(env.anonKey) === null;
}

export function getSupabaseConfigError(): string | null {
  const env = getSupabaseEnv();
  if (!env) {
    return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }
  return validateSupabaseAnonKey(env.anonKey);
}
