import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  addProgramsToPlan,
  createApplicationPlan,
  getApplicationPlansForUser,
} from "@/lib/data/application-plans";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await getApplicationPlansForUser(userId);
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, target_intake, program_ids, match_scores } = body;

  if (program_ids?.length) {
    const plan = await addProgramsToPlan(userId, {
      name: name || "My application plan",
      target_intake,
      program_ids,
      match_scores: match_scores || {},
    });
    if (!plan) return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    return NextResponse.json({ plan });
  }

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const plan = await createApplicationPlan(userId, name, target_intake);
  if (!plan) return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  return NextResponse.json({ plan });
}
