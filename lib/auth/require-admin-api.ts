import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export type AdminApiResult =
  | { ok: true; admin: AdminClient; userId: string }
  | { ok: false; response: NextResponse };

/** Authenticate caller and confirm users.role = 'admin'. Service role only after this passes. */
export async function requireAdminApi(): Promise<AdminApiResult> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Server configuration error" }, { status: 500 }),
    };
  }

  return { ok: true, admin, userId: user.id };
}

/** For server components / middleware-style checks (no service role). */
export async function getAuthenticatedUserRole(): Promise<{
  userId: string | null;
  role: "student" | "admin" | null;
}> {
  const supabase = await createClient();
  if (!supabase) return { userId: null, role: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null };

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    role: (data?.role as "student" | "admin") ?? "student",
  };
}

export async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("users").select("role").eq("id", userId).single();
  return data?.role === "admin";
}
