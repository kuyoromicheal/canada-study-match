import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getProgramById, getStudentProfile } from "@/lib/data/repository";
import { getCvProfile, profileToCvSeed, upsertCvProfile } from "@/lib/data/cv-profile";
import { generateProgramCv, rewriteCvSection } from "@/lib/ai/document-generator";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { program_id, action, section_name, section_content, instruction } = body;

  const profile = await getStudentProfile(userId);
  if (!profile) return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });

  let cv = await getCvProfile(userId);
  if (!cv) {
    cv = await upsertCvProfile(userId, profileToCvSeed(profile) as Parameters<typeof upsertCvProfile>[1]);
  }
  if (!cv) return NextResponse.json({ error: "CV profile unavailable" }, { status: 500 });

  if (action === "rewrite_section") {
    const content = await rewriteCvSection({
      userId,
      sectionName: section_name || "section",
      currentContent: section_content || "",
      programName: program_id ? (await getProgramById(program_id))?.name : undefined,
      instruction,
    });
    return NextResponse.json({ content });
  }

  if (!program_id) {
    return NextResponse.json({ error: "program_id required" }, { status: 400 });
  }

  const program = await getProgramById(program_id);
  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  const result = await generateProgramCv({ userId, profile, cv, program });
  return NextResponse.json(result);
}
