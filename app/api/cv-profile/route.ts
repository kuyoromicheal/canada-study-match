import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/data/repository";
import { getCvProfile, upsertCvProfile, profileToCvSeed } from "@/lib/data/cv-profile";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let cv = await getCvProfile(userId);
  if (!cv) {
    const profile = await getStudentProfile(userId);
    if (profile) {
      cv = await upsertCvProfile(userId, profileToCvSeed(profile) as Parameters<typeof upsertCvProfile>[1]);
    }
  }

  return NextResponse.json({ cv });
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const cv = await upsertCvProfile(userId, body);
  if (!cv) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  return NextResponse.json({ cv });
}
