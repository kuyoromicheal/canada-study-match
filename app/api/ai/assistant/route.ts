import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getProgramById, getProgramMatches, getStudentProfile } from "@/lib/data/repository";
import { answerApplicationQuestion } from "@/lib/ai/assistant-chat";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, program_id } = await request.json();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const profile = await getStudentProfile(userId);
  let program;
  let matchResult;

  if (program_id) {
    program = await getProgramById(program_id);
    if (profile) {
      const matches = await getProgramMatches(profile);
      matchResult = matches.find((m) => m.id === program_id)?.matchResult;
    }
  }

  const answer = await answerApplicationQuestion({
    question,
    profile,
    program: program ?? undefined,
    matchResult,
  });

  return NextResponse.json({ answer });
}
