import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { syncApplicationEmails, getGmailThreadsForUser } from "@/lib/gmail/sync";
import { getGmailConnectionStatus } from "@/lib/gmail/connection";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const threads = await getGmailThreadsForUser(userId, category);
  return NextResponse.json({ threads });
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await getGmailConnectionStatus(userId);
  if (conn.status !== "connected") {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  const result = await syncApplicationEmails(userId);
  return NextResponse.json(result);
}
