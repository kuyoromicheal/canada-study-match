import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { createApplicationsBulk } from "@/lib/data/repository";
import type { ApplicationStatus } from "@/types/database";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const programIds: string[] = body.program_ids || [];
  const matchScores: Record<string, number> | undefined = body.match_scores;
  const status = (body.status || "shortlisted") as ApplicationStatus;

  if (!Array.isArray(programIds) || programIds.length === 0) {
    return NextResponse.json({ error: "program_ids array required" }, { status: 400 });
  }

  const { created, failed } = await createApplicationsBulk(
    userId,
    programIds,
    matchScores,
    status
  );

  return NextResponse.json({
    created_count: created.length,
    failed_count: failed.length,
    created,
    failed,
  });
}
