import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getProgramById, getStudentProfile } from "@/lib/data/repository";
import { generateResearchProposal } from "@/lib/ai/document-generator";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { program_id, supervisor_research_areas } = await request.json();
  if (!program_id) return NextResponse.json({ error: "program_id required" }, { status: 400 });

  const profile = await getStudentProfile(userId);
  const program = await getProgramById(program_id);
  if (!profile || !program) {
    return NextResponse.json({ error: "Profile or program not found" }, { status: 404 });
  }

  const result = await generateResearchProposal({
    userId,
    profile,
    program,
    supervisorResearchAreas: supervisor_research_areas,
  });

  return NextResponse.json(result);
}
