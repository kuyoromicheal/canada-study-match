import { NextResponse } from "next/server";
import { getSupabaseEnv, validateSupabaseAnonKey } from "@/lib/supabase/env";

export async function GET() {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "missing_env" });
  }

  const keyError = validateSupabaseAnonKey(env.anonKey);
  if (keyError) {
    return NextResponse.json({ ok: false, error: "invalid_anon_key", message: keyError });
  }

  try {
    const res = await fetch(`${env.url}/auth/v1/settings`, {
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${env.anonKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: "supabase_rejected_key",
        message:
          "Supabase rejected the anon key. Re-copy it from Supabase → Settings → API, update Vercel env vars, then redeploy.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "network_error" });
  }
}
