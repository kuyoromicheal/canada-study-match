import { matchPrograms } from "@/lib/matching/engine";
import {
  analyzeProgramSupervisorRequirement,
  getDefaultChecklistItems,
  scoreSupervisorCompatibility,
} from "@/lib/matching/supervisor-detection";
import { buildChecklistFromProgram } from "@/lib/applications/checklist-from-program";
import { getSessionUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getSeedDeadlines,
  getSeedProgramSupervisors,
  getSeedPrograms,
  getSeedRequirements,
  getSeedSchools,
  getSeedSupervisors,
  getSeedTuition,
} from "./seed-helpers";
import type {
  ApplicationChecklistItem,
  ApplicationDeadline,
  ApplicationStatus,
  ApplicationTracker,
  MatchResult,
  Program,
  ProgramFilters,
  ProgramRequirement,
  ProgramRequiredDocument,
  ProgramWithDetails,
  SavedProgram,
  School,
  StudentProfile,
  StudentProfileInput,
  Supervisor,
  SupervisorMatchResult,
  Tuition,
} from "@/types/database";
import { calculateProfileCompleteness } from "@/types/database";

export { getProvinces, getFields, getCities, getIntakes } from "./catalog-filters";

function useSeedFallback(): boolean {
  return !isSupabaseConfigured();
}

function enrichProgramFromSeed(program: Program): ProgramWithDetails {
  const school = getSeedSchools().find((s) => s.id === program.school_id);
  const requirements = getSeedRequirements().filter((r) => r.program_id === program.id);
  const deadlines = getSeedDeadlines().filter((d) => d.program_id === program.id);
  const tuition = getSeedTuition().filter((t) => t.program_id === program.id);
  const psLinks = getSeedProgramSupervisors().filter((ps) => ps.program_id === program.id);
  const supervisors = psLinks
    .map((ps) => {
      const sup = getSeedSupervisors().find((s) => s.id === ps.supervisor_id);
      return sup ? { ...sup, is_primary: ps.is_primary } : null;
    })
    .filter(Boolean) as (Supervisor & { is_primary?: boolean })[];

  return { ...program, school, requirements, deadlines, tuition, supervisors };
}

async function enrichProgramFromSupabase(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  program: Program
): Promise<ProgramWithDetails> {
  const [
    { data: school },
    { data: requirements },
    { data: requiredDocuments },
    { data: deadlines },
    { data: tuition },
    { data: psLinks },
  ] = await Promise.all([
    supabase.from("schools").select("*").eq("id", program.school_id).maybeSingle(),
    supabase.from("program_requirements").select("*").eq("program_id", program.id),
    supabase.from("program_required_documents").select("*").eq("program_id", program.id).order("sort_order"),
    supabase.from("application_deadlines").select("*").eq("program_id", program.id),
    supabase.from("tuition").select("*").eq("program_id", program.id),
    supabase.from("program_supervisors").select("*").eq("program_id", program.id),
  ]);

  const supervisorIds = (psLinks || []).map((ps) => ps.supervisor_id);
  const { data: supervisorRows } = supervisorIds.length
    ? await supabase.from("supervisors").select("*").in("id", supervisorIds)
    : { data: [] as Supervisor[] };

  const supervisors = (psLinks || [])
    .map((ps) => {
      const sup = (supervisorRows || []).find((s) => s.id === ps.supervisor_id);
      return sup ? { ...sup, is_primary: ps.is_primary } : null;
    })
    .filter(Boolean) as (Supervisor & { is_primary?: boolean })[];

  return {
    ...program,
    school: (school as School) || undefined,
    requirements: (requirements as ProgramRequirement[]) || [],
    required_documents: (requiredDocuments as ProgramRequiredDocument[]) || [],
    deadlines: (deadlines as ApplicationDeadline[]) || [],
    tuition: (tuition as Tuition[]) || [],
    supervisors,
  };
}

function filterEnrichedPrograms(
  programs: ProgramWithDetails[],
  filters?: ProgramFilters
): ProgramWithDetails[] {
  if (!filters) return programs;

  return programs.filter((p) => {
    if (filters.province && p.province !== filters.province) return false;
    if (filters.city && p.city !== filters.city) return false;
    if (filters.field && !p.field.toLowerCase().includes(filters.field.toLowerCase())) return false;
    if (filters.degree && p.degree_level !== filters.degree) return false;
    if (filters.programType && p.program_type !== filters.programType) return false;
    if (filters.supervisorRequirement && p.supervisor_status !== filters.supervisorRequirement) return false;
    if (filters.internationalEligible !== undefined && p.international_eligible !== filters.internationalEligible) return false;
    if (filters.intake && !p.intakes?.some((i) => i.toLowerCase().includes(filters.intake!.toLowerCase()))) return false;
    if (filters.maxFee && p.application_fee && p.application_fee > filters.maxFee) return false;
    if (filters.institutionType && p.school?.institution_type !== filters.institutionType) return false;
    if (filters.feeFilter === "free") {
      const fee = p.application_fee ?? 0;
      if (fee > 0 && !p.fee_waiver_available) return false;
    }
    if (filters.feeFilter === "paid") {
      const fee = p.application_fee ?? 0;
      if (fee === 0 && !p.fee_waiver_available) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${p.name} ${p.field} ${p.school?.name || ""} ${p.city}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.maxTuition) {
      const tuition = p.tuition?.find((t) => t.period === "year");
      if (tuition && tuition.amount > filters.maxTuition) return false;
    }
    return true;
  });
}

export async function getSchools(): Promise<School[]> {
  if (!useSeedFallback()) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.from("schools").select("*").order("name");
      return (data as School[]) || [];
    }
  }
  return getSeedSchools();
}

export async function getPrograms(filters?: ProgramFilters): Promise<ProgramWithDetails[]> {
  if (!useSeedFallback()) {
    const supabase = await createClient();
    if (supabase) {
      let query = supabase.from("programs").select("*");
      if (filters?.province) query = query.eq("province", filters.province);
      if (filters?.field) query = query.ilike("field", `%${filters.field}%`);
      if (filters?.degree) query = query.eq("degree_level", filters.degree);
      const { data } = await query.order("name");
      const enriched = await Promise.all(
        ((data as Program[]) || []).map((p) => enrichProgramFromSupabase(supabase, p))
      );
      return filterEnrichedPrograms(enriched, filters);
    }
    return [];
  }
  return filterEnrichedPrograms(
    getSeedPrograms().map(enrichProgramFromSeed),
    filters
  );
}

export async function getProgramById(id: string): Promise<ProgramWithDetails | null> {
  if (!useSeedFallback()) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.from("programs").select("*").eq("id", id).maybeSingle();
      if (data) return enrichProgramFromSupabase(supabase, data as Program);
      return null;
    }
    return null;
  }
  const program = getSeedPrograms().find((p) => p.id === id);
  return program ? enrichProgramFromSeed(program) : null;
}

export async function getProgramMatches(
  profile: StudentProfile,
  filters?: ProgramFilters
): Promise<(ProgramWithDetails & { matchResult?: MatchResult })[]> {
  const programs = await getPrograms(filters);
  const includeDemo = filters?.includeDemo ?? false;
  const includeUnverified = filters?.includeUnverified ?? false;

  const scorable = programs.filter((p) => {
    if (p.is_demo_record && !includeDemo) return false;
    if (!p.is_demo_record && p.verification_status === "needs_verification" && !includeUnverified) return false;
    return true;
  });

  const inputs = scorable.map((p) => ({
    program: p,
    requirements: p.requirements,
    tuition: p.tuition,
    deadlines: p.deadlines,
  }));

  const matchMap = new Map(
    matchPrograms(profile, inputs).map((m) => [m.programId, m])
  );

  return programs.map((program) => ({
    ...program,
    matchResult: matchMap.get(program.id),
  }));
}

export async function getSupervisorMatches(
  profile: StudentProfile,
  programId: string
): Promise<SupervisorMatchResult[]> {
  const program = await getProgramById(programId);
  if (!program?.supervisors?.length) return [];

  return program.supervisors
    .map((supervisor) => {
      const { score, reasoning, sharedInterests } = scoreSupervisorCompatibility(
        profile.research_interests,
        supervisor.research_areas,
        supervisor.accepting_students
      );
      return { supervisor, compatibilityScore: score, reasoning, sharedInterests };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

export async function getStudentProfile(explicitUserId?: string): Promise<StudentProfile | null> {
  const userId = explicitUserId ?? (await getSessionUserId());

  if (userId && isSupabaseConfigured()) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) return data as StudentProfile;
      return null;
    }
  }

  return null;
}

export async function saveStudentProfile(
  userId: string,
  input: StudentProfileInput
): Promise<StudentProfile | null> {
  const completeness = calculateProfileCompleteness(input);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (supabase) {
      const { data: existing } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const payload = {
        ...input,
        user_id: userId,
        profile_completeness: completeness,
        onboarding_completed: completeness >= 60,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { data } = await supabase
          .from("student_profiles")
          .update(payload)
          .eq("user_id", userId)
          .select()
          .single();
        return data as StudentProfile | null;
      }

      const { data } = await supabase
        .from("student_profiles")
        .insert(payload)
        .select()
        .single();
      return data as StudentProfile | null;
    }
  }

  return null;
}

export async function getUpcomingDeadlines(
  limit = 5
): Promise<(ApplicationDeadline & { program?: Program; school?: School })[]> {
  const today = new Date().toISOString().slice(0, 10);

  if (!useSeedFallback()) {
    const supabase = await createClient();
    if (supabase) {
      const { data: deadlines } = await supabase
        .from("application_deadlines")
        .select("*")
        .gte("deadline_date", today)
        .order("deadline_date")
        .limit(limit * 3);

      if (deadlines?.length) {
        const programIds = [...new Set(deadlines.map((d) => d.program_id))];
        const { data: programs } = await supabase
          .from("programs")
          .select("*")
          .in("id", programIds)
          .eq("is_demo_record", false);

        const programMap = new Map((programs || []).map((p) => [p.id, p as Program]));
        const schoolIds = [...new Set((programs || []).map((p) => p.school_id))];
        const { data: schools } = await supabase.from("schools").select("*").in("id", schoolIds);
        const schoolMap = new Map((schools || []).map((s) => [s.id, s as School]));

        return deadlines
          .filter((d) => programMap.has(d.program_id))
          .slice(0, limit)
          .map((d) => {
            const program = programMap.get(d.program_id);
            const school = program ? schoolMap.get(program.school_id) : undefined;
            return { ...(d as ApplicationDeadline), program, school };
          });
      }
      return [];
    }
  }

  const deadlines = getSeedDeadlines()
    .filter((d) => new Date(d.deadline_date) >= new Date())
    .sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime())
    .slice(0, limit);

  return deadlines.map((d) => {
    const program = getSeedPrograms().find((p) => p.id === d.program_id);
    const school = program ? getSeedSchools().find((s) => s.id === program.school_id) : undefined;
    return { ...d, program, school };
  });
}

export async function getSavedPrograms(
  userId: string
): Promise<(SavedProgram & { program: ProgramWithDetails })[]> {
  if (useSeedFallback()) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data: rows } = await supabase
    .from("saved_programs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!rows?.length) return [];

  const results: (SavedProgram & { program: ProgramWithDetails })[] = [];
  for (const row of rows) {
    const program = await getProgramById(row.program_id);
    if (program) results.push({ ...(row as SavedProgram), program });
  }
  return results;
}

export async function saveProgramForUser(
  userId: string,
  programId: string,
  matchScore?: number
): Promise<SavedProgram | null> {
  if (useSeedFallback()) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("saved_programs")
    .upsert(
      {
        user_id: userId,
        program_id: programId,
        match_score: matchScore ?? null,
      },
      { onConflict: "user_id,program_id" }
    )
    .select()
    .single();

  if (error) return null;
  return data as SavedProgram;
}

export async function unsaveProgramForUser(userId: string, programId: string): Promise<boolean> {
  if (useSeedFallback()) return false;

  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("saved_programs")
    .delete()
    .eq("user_id", userId)
    .eq("program_id", programId);

  return !error;
}

export async function getApplications(
  userId: string
): Promise<(ApplicationTracker & { program: ProgramWithDetails; checklist: ApplicationChecklistItem[] })[]> {
  if (useSeedFallback()) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data: apps } = await supabase
    .from("application_tracker")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!apps?.length) return [];

  const results: (ApplicationTracker & { program: ProgramWithDetails; checklist: ApplicationChecklistItem[] })[] = [];

  for (const app of apps) {
    const program = await getProgramById(app.program_id);
    if (!program) continue;

    const { data: checklist } = await supabase
      .from("application_checklist_items")
      .select("*")
      .eq("application_id", app.id)
      .order("sort_order");

    results.push({
      ...(app as ApplicationTracker),
      program,
      checklist: (checklist as ApplicationChecklistItem[]) || [],
    });
  }

  return results;
}

export async function createApplicationForUser(
  userId: string,
  programId: string,
  matchScore?: number
): Promise<ApplicationTracker | null> {
  if (useSeedFallback()) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const program = await getProgramById(programId);
  if (!program) return null;

  const supervisorInfo = analyzeProgramSupervisorRequirement(program);
  const nextDeadline = program.deadlines
    ?.slice()
    .sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime())[0];

  const { data: app, error } = await supabase
    .from("application_tracker")
    .upsert(
      {
        user_id: userId,
        program_id: programId,
        status: "researching" as ApplicationStatus,
        deadline_date: nextDeadline?.deadline_date ?? null,
        match_score: matchScore ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,program_id" }
    )
    .select()
    .single();

  if (error || !app) return null;

  const { count } = await supabase
    .from("application_checklist_items")
    .select("*", { count: "exact", head: true })
    .eq("application_id", app.id);

  if (!count) {
    const items = buildChecklistFromProgram(program, supervisorInfo.classification);
    await supabase.from("application_checklist_items").insert(
      items.map((item) => ({
        application_id: app.id,
        user_id: userId,
        title: item.title,
        description: item.description,
        is_required: item.is_required,
        sort_order: item.sort_order,
        doc_type: item.doc_type,
        required_document_id: item.required_document_id,
        is_completed: false,
      }))
    );
  }

  return app as ApplicationTracker;
}

export async function updateApplicationStatus(
  userId: string,
  applicationId: string,
  status: ApplicationStatus
): Promise<boolean> {
  if (useSeedFallback()) return false;

  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("application_tracker")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("user_id", userId);

  return !error;
}

export async function updateChecklistItem(
  userId: string,
  itemId: string,
  updates: { is_completed?: boolean; linked_document_id?: string | null }
): Promise<boolean> {
  if (useSeedFallback()) return false;

  const supabase = await createClient();
  if (!supabase) return false;

  const payload: Record<string, unknown> = {};
  if (typeof updates.is_completed === "boolean") payload.is_completed = updates.is_completed;
  if (updates.linked_document_id !== undefined) {
    payload.linked_document_id = updates.linked_document_id;
    if (updates.linked_document_id) payload.is_completed = true;
    else payload.is_completed = false;
  }

  const { error } = await supabase
    .from("application_checklist_items")
    .update(payload)
    .eq("id", itemId)
    .eq("user_id", userId);

  return !error;
}

export async function getApplicationForUser(userId: string, applicationId: string) {
  if (useSeedFallback()) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: app } = await supabase
    .from("application_tracker")
    .select("*")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!app) return null;

  const program = await getProgramById(app.program_id);
  if (!program) return null;

  const { data: checklist } = await supabase
    .from("application_checklist_items")
    .select("*")
    .eq("application_id", app.id)
    .order("sort_order");

  return {
    ...(app as ApplicationTracker),
    program,
    checklist: (checklist as ApplicationChecklistItem[]) || [],
  };
}

export async function getRecordsNeedingVerification(): Promise<{
  schools: School[];
  programs: Program[];
  supervisors: Supervisor[];
}> {
  if (!useSeedFallback()) {
    const admin = await import("@/lib/supabase/admin").then((m) => m.createAdminClient());
    const client = admin ?? (await createClient());
    if (client) {
      const [schools, programs, supervisors] = await Promise.all([
        client.from("schools").select("*").eq("verification_status", "needs_verification").eq("is_demo_record", false),
        client.from("programs").select("*").eq("verification_status", "needs_verification").eq("is_demo_record", false),
        client.from("supervisors").select("*").eq("verification_status", "needs_verification").eq("is_demo_record", false),
      ]);
      return {
        schools: (schools.data as School[]) || [],
        programs: (programs.data as Program[]) || [],
        supervisors: (supervisors.data as Supervisor[]) || [],
      };
    }
  }
  return {
    schools: getSeedSchools().filter((s) => s.verification_status === "needs_verification"),
    programs: getSeedPrograms().filter((p) => p.verification_status === "needs_verification"),
    supervisors: getSeedSupervisors().filter((s) => s.verification_status === "needs_verification"),
  };
}
