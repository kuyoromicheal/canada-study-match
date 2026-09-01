import { createCatalogClient } from "@/lib/supabase/catalog-client";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type CatalogMode = "seed" | "empty" | "mixed" | "live";

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

async function countRows(
  table: "schools" | "programs",
  filters?: { is_demo_record?: boolean; verification_status?: string }
): Promise<number> {
  const supabase = await createCatalogClient();
  if (!supabase) return 0;

  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filters?.is_demo_record !== undefined) {
    query = query.eq("is_demo_record", filters.is_demo_record);
  }
  if (filters?.verification_status) {
    query = query.eq("verification_status", filters.verification_status);
  }

  const { count, error } = await query;
  if (error || count == null) return 0;
  return count;
}

export async function getCatalogStatus(): Promise<CatalogStatus> {
  if (!isSupabaseConfigured()) return SEED_FALLBACK;

  const supabase = await createCatalogClient();
  if (!supabase) return SEED_FALLBACK;

  const [realSchoolCount, realProgramCount, verifiedProgramCount, demoProgramCount] =
    await Promise.all([
      countRows("schools", { is_demo_record: false }),
      countRows("programs", { is_demo_record: false }),
      countRows("programs", { is_demo_record: false, verification_status: "verified" }),
      countRows("programs", { is_demo_record: true }),
    ]);

  if (realProgramCount === 0) {
    return {
      mode: "empty",
      supabaseConfigured: true,
      realSchoolCount,
      realProgramCount: 0,
      verifiedProgramCount: 0,
      demoProgramCount,
    };
  }

  return {
    mode: demoProgramCount > 0 ? "mixed" : "live",
    supabaseConfigured: true,
    realSchoolCount,
    realProgramCount,
    verifiedProgramCount,
    demoProgramCount,
  };
}

export function catalogUsesSeedFallback(status: CatalogStatus): boolean {
  return status.mode === "seed" && !status.supabaseConfigured;
}
