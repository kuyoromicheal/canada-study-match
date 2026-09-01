import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { disconnectGmail } from "@/lib/gmail/connection";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await disconnectGmail(userId);
  if (!ok) return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
