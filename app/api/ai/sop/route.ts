import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getProgramById, getStudentProfile } from "@/lib/data/repository";
import { getCvProfile, profileToCvSeed, upsertCvProfile } from "@/lib/data/cv-profile";
import { generateProgramSop } from "@/lib/ai/document-generator";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { program_id, tone, max_words, document_type } = body;

  if (!program_id) return NextResponse.json({ error: "program_id required" }, { status: 400 });

  const profile = await getStudentProfile(userId);
  const program = await getProgramById(program_id);
  if (!profile || !program) {
    return NextResponse.json({ error: "Profile or program not found" }, { status: 404 });
  }

  let cv = await getCvProfile(userId);
  if (!cv) {
    cv = await upsertCvProfile(userId, profileToCvSeed(profile) as Parameters<typeof upsertCvProfile>[1]);
  }
  if (!cv) return NextResponse.json({ error: "CV profile unavailable" }, { status: 500 });

  const result = await generateProgramSop({
    userId,
    profile,
    cv,
    program,
    options: {
      tone: tone === "natural" ? "natural" : "academic",
      maxWords: max_words || 1000,
      documentType: document_type === "personal_statement" ? "personal_statement" : "sop",
    },
  });

  return NextResponse.json(result);
}
