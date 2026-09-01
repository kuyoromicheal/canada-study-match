import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getProgramById } from "@/lib/data/repository";
import { scoreToFitCategory } from "@/lib/matching/fit-assessment";
import type { ProgramWithDetails } from "@/types/database";

export interface ApplicationPlanItem {
  id: string;
  plan_id: string;
  program_id: string;
  match_score: number | null;
  fit_category: string | null;
  sort_order: number;
  notes: string | null;
  program?: ProgramWithDetails;
}

export interface ApplicationPlan {
  id: string;
  user_id: string;
  name: string;
  target_intake: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: ApplicationPlanItem[];
}

function hasSupabaseDatabase(): boolean {
  return isSupabaseConfigured();
}

export async function getApplicationPlansForUser(userId: string): Promise<ApplicationPlan[]> {
  if (!hasSupabaseDatabase()) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data: plans } = await supabase
    .from("application_plans")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!plans?.length) return [];

  const results: ApplicationPlan[] = [];
  for (const plan of plans) {
    const { data: items } = await supabase
      .from("application_plan_items")
      .select("*")
      .eq("plan_id", plan.id)
      .order("sort_order");

    const enriched: ApplicationPlanItem[] = [];
    for (const item of items || []) {
      const program = await getProgramById(item.program_id);
      enriched.push({ ...item, program: program || undefined });
    }

    results.push({ ...plan, items: enriched });
  }

  return results;
}

export async function createApplicationPlan(
  userId: string,
  name: string,
  targetIntake?: string
): Promise<ApplicationPlan | null> {
  if (!hasSupabaseDatabase()) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("application_plans")
    .insert({
      user_id: userId,
      name,
      target_intake: targetIntake || null,
    })
    .select()
    .single();

  if (error || !data) return null;
  return data as ApplicationPlan;
}

export async function addProgramsToPlan(
  userId: string,
  input: {
    name: string;
    target_intake?: string;
    program_ids: string[];
    match_scores?: Record<string, number>;
  }
): Promise<ApplicationPlan | null> {
  if (!hasSupabaseDatabase()) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const plan = await createApplicationPlan(userId, input.name, input.target_intake);
  if (!plan) return null;

  const rows = input.program_ids.map((programId, index) => {
    const score = input.match_scores?.[programId] ?? null;
    const fit = score != null ? scoreToFitCategory(score, false) : null;
    return {
      plan_id: plan.id,
      program_id: programId,
      match_score: score,
      fit_category: fit,
      sort_order: index,
    };
  });

  const { error } = await supabase.from("application_plan_items").upsert(rows, {
    onConflict: "plan_id,program_id",
  });

  if (error) return null;

  await supabase
    .from("application_plans")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", plan.id);

  return getApplicationPlansForUser(userId).then((plans) => plans.find((p) => p.id === plan.id) || plan);
}
