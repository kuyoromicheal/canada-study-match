import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getProgramById, getStudentProfile, getSupervisorMatches } from "@/lib/data/repository";
import { generateSupervisorEmail } from "@/lib/ai/email-generator";
import { findSharedInterests } from "@/lib/matching/supervisor-detection";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { supervisor_id, program_id } = body;

  if (!supervisor_id || !program_id) {
    return NextResponse.json({ error: "supervisor_id and program_id required" }, { status: 400 });
  }

  const [profile, program] = await Promise.all([
    getStudentProfile(userId),
    getProgramById(program_id),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data: supervisor } = await supabase
    .from("supervisors")
    .select("*")
    .eq("id", supervisor_id)
    .maybeSingle();

  if (!supervisor) {
    return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
  }

  const matches = await getSupervisorMatches(profile, program_id);
  const match = matches.find((m) => m.supervisor.id === supervisor_id);
  const sharedInterests = match?.sharedInterests || findSharedInterests(
    profile.research_interests,
    supervisor.research_areas
  );

  const researchInterests = [
    ...(profile.research_interests || []),
    ...(profile.research_keywords as string[] || []),
    profile.final_year_project || "",
  ].filter(Boolean);

  const email = await generateSupervisorEmail({
    studentName: profile.full_name || "Prospective student",
    programName: program.name,
    schoolName: program.school?.name || "University",
    supervisorName: supervisor.name,
    researchInterests,
    sharedInterests,
    degree: profile.degree_name || profile.highest_qualification || undefined,
    university: profile.university || undefined,
    finalYearProject: profile.final_year_project || undefined,
  });

  return NextResponse.json({ email });
}
