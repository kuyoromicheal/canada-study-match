import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  getSavedPrograms,
  saveProgramForUser,
  unsaveProgramForUser,
} from "@/lib/data/repository";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saved = await getSavedPrograms(userId);
  return NextResponse.json({ saved });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { program_id, match_score } = await request.json();
  if (!program_id) {
    return NextResponse.json({ error: "program_id required" }, { status: 400 });
  }

  const saved = await saveProgramForUser(userId, program_id, match_score);
  if (!saved) {
    return NextResponse.json({ error: "Failed to save program" }, { status: 500 });
  }
  return NextResponse.json({ saved });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const programId = searchParams.get("program_id");
  if (!programId) {
    return NextResponse.json({ error: "program_id required" }, { status: 400 });
  }

  const ok = await unsaveProgramForUser(userId, programId);
  if (!ok) {
    return NextResponse.json({ error: "Failed to unsave program" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
