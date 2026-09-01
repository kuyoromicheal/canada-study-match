import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  createApplicationForUser,
  getApplications,
  updateApplicationStatus,
} from "@/lib/data/repository";
import type { ApplicationStatus } from "@/types/database";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await getApplications(userId);
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { program_id, match_score } = await request.json();
  if (!program_id) {
    return NextResponse.json({ error: "program_id required" }, { status: 400 });
  }

  const application = await createApplicationForUser(userId, program_id, match_score);
  if (!application) {
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
  return NextResponse.json({ application });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await request.json();
  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const ok = await updateApplicationStatus(userId, id, status as ApplicationStatus);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
