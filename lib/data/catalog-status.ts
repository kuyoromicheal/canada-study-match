import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type CatalogMode = "seed" | "mixed" | "live";

export interface CatalogStatus {
  mode: CatalogMode;
  supabaseConfigured: boolean;
  realSchoolCount: number;
  realProgramCount: number;
  verifiedProgramCount: number;
  demoProgramCount: number;
}

const SEED_FALLBACK: CatalogStatus = {
  mode: "seed",
  supabaseConfigured: false,
  realSchoolCount: 0,
  realProgramCount: 0,
  verifiedProgramCount: 0,
  demoProgramCount: 0,
};

export async function getCatalogStatus(): Promise<CatalogStatus> {
  if (!isSupabaseConfigured()) return SEED_FALLBACK;

  const supabase = await createClient();
  if (!supabase) return SEED_FALLBACK;

  const [
    { count: realSchoolCount },
    { count: realProgramCount },
    { count: verifiedProgramCount },
    { count: demoProgramCount },
  ] = await Promise.all([
    supabase
      .from("schools")
      .select("*", { count: "exact", head: true })
      .eq("is_demo_record", false),
    supabase
      .from("programs")
      .select("*", { count: "exact", head: true })
      .eq("is_demo_record", false),
    supabase
      .from("programs")
      .select("*", { count: "exact", head: true })
      .eq("is_demo_record", false)
      .eq("verification_status", "verified"),
    supabase
      .from("programs")
      .select("*", { count: "exact", head: true })
      .eq("is_demo_record", true),
  ]);

  const realPrograms = realProgramCount ?? 0;
  const demoPrograms = demoProgramCount ?? 0;

  if (realPrograms === 0) {
    return {
      mode: "seed",
      supabaseConfigured: true,
      realSchoolCount: realSchoolCount ?? 0,
      realProgramCount: 0,
      verifiedProgramCount: 0,
      demoProgramCount: demoPrograms,
    };
  }

  return {
    mode: demoPrograms > 0 ? "mixed" : "live",
    supabaseConfigured: true,
    realSchoolCount: realSchoolCount ?? 0,
    realProgramCount: realPrograms,
    verifiedProgramCount: verifiedProgramCount ?? 0,
    demoProgramCount: demoPrograms,
  };
}

export function catalogUsesSeedFallback(status: CatalogStatus): boolean {
  return status.mode === "seed";
}
