import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOAuth2Client, saveGmailTokens } from "@/lib/gmail/connection";
import { google } from "googleapis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/gmail?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/gmail?error=missing_code`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("gmail_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${baseUrl}/gmail?error=invalid_state`);
  }

  const [userId] = state.split(":");
  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/gmail?error=invalid_user`);
  }

  cookieStore.delete("gmail_oauth_state");

  try {
    const oauth2 = createOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const userInfo = await oauth2Api.userinfo.get();
    const googleEmail = userInfo.data.email;

    if (!googleEmail || !tokens.refresh_token) {
      return NextResponse.redirect(`${baseUrl}/gmail?error=no_refresh_token`);
    }

    const saved = await saveGmailTokens(userId, tokens, googleEmail);
    if (!saved) {
      return NextResponse.redirect(`${baseUrl}/gmail?error=save_failed`);
    }

    return NextResponse.redirect(`${baseUrl}/gmail?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(`${baseUrl}/gmail?error=${encodeURIComponent(msg)}`);
  }
}
