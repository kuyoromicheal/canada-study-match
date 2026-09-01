import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getSeedPrograms } from "./seed-helpers";

async function getProgramRowsForFilters() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from("programs")
        .select("province, field, city, intakes")
        .eq("is_demo_record", false);
      if (data?.length) return data;
    }
  }
  return getSeedPrograms().map((p) => ({
    province: p.province,
    field: p.field,
    city: p.city,
    intakes: p.intakes,
  }));
}

export async function getProvinces(): Promise<string[]> {
  const rows = await getProgramRowsForFilters();
  return [...new Set(rows.map((p) => p.province))].sort();
}

export async function getFields(): Promise<string[]> {
  const rows = await getProgramRowsForFilters();
  return [...new Set(rows.map((p) => p.field))].sort();
}

export async function getCities(): Promise<string[]> {
  const rows = await getProgramRowsForFilters();
  return [...new Set(rows.map((p) => p.city))].sort();
}

export async function getIntakes(): Promise<string[]> {
  const rows = await getProgramRowsForFilters();
  const intakes = rows.flatMap((p) => p.intakes || []);
  return [...new Set(intakes)].sort();
}
