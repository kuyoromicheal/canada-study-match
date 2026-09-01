import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getStudentProfile, saveStudentProfile } from "@/lib/data/repository";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getStudentProfile(userId);
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const body = await request.json();
  const userId = await getSessionUserId();

  if (!userId) {
    if (isSupabaseConfigured()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const profile = await saveStudentProfile("demo-user", body);
    return NextResponse.json({ profile });
  }

  const profile = await saveStudentProfile(userId, body);
  if (!profile) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
  return NextResponse.json({ profile });
}
