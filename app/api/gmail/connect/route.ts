import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getGmailConnectionStatus, getAuthorizationUrl } from "@/lib/gmail/connection";
import { isGmailConfigured, GMAIL_SCOPE_DESCRIPTION } from "@/lib/gmail/config";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getGmailConnectionStatus(userId);
  return NextResponse.json({ ...status, scopeDescription: GMAIL_SCOPE_DESCRIPTION });
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isGmailConfigured()) {
    return NextResponse.json(
      { error: "Gmail integration not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_TOKEN_ENCRYPTION_KEY." },
      { status: 503 }
    );
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", `${userId}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = getAuthorizationUrl(`${userId}:${state}`);
  return NextResponse.json({ url });
}
