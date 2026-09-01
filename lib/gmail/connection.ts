import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { encryptToken, decryptToken, isEncryptionConfigured } from "@/lib/gmail/crypto";
import { getGoogleOAuthConfig, GMAIL_SCOPES, type GmailConnectionStatus } from "@/lib/gmail/config";

export interface GmailConnection {
  id: string;
  user_id: string;
  google_email: string;
  status: GmailConnectionStatus;
  scopes: string[];
  last_sync_at: string | null;
  token_expires_at: string | null;
}

export async function getGmailConnection(userId: string): Promise<GmailConnection | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("gmail_connections")
    .select("id, user_id, google_email, status, scopes, last_sync_at, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  return data as GmailConnection | null;
}

export async function getGmailConnectionStatus(userId: string): Promise<{
  status: GmailConnectionStatus;
  email: string | null;
  configured: boolean;
}> {
  const configured = Boolean(getGoogleOAuthConfig() && isEncryptionConfigured());
  if (!configured) {
    return { status: "not_connected", email: null, configured: false };
  }

  const conn = await getGmailConnection(userId);
  if (!conn) {
    return { status: "not_connected", email: null, configured: true };
  }

  return {
    status: conn.status as GmailConnectionStatus,
    email: conn.google_email,
    configured: true,
  };
}

export function createOAuth2Client() {
  const config = getGoogleOAuthConfig();
  if (!config) throw new Error("Google OAuth not configured");
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function getAuthorizationUrl(state: string): string {
  const oauth2 = createOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GMAIL_SCOPES],
    state,
  });
}

export async function saveGmailTokens(
  userId: string,
  tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
  googleEmail: string
): Promise<boolean> {
  if (!isEncryptionConfigured() || !tokens.refresh_token) return false;

  const supabase = await createClient();
  if (!supabase) return false;

  const payload = {
    user_id: userId,
    google_email: googleEmail,
    access_token_encrypted: tokens.access_token ? encryptToken(tokens.access_token) : null,
    refresh_token_encrypted: encryptToken(tokens.refresh_token),
    token_expires_at: tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null,
    scopes: [...GMAIL_SCOPES],
    status: "connected" as const,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("gmail_connections").upsert(payload, { onConflict: "user_id" });
  if (error) return false;

  await supabase
    .from("student_profiles")
    .update({ gmail_connected: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return true;
}

export async function disconnectGmail(userId: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase.from("gmail_connections").delete().eq("user_id", userId);
  if (error) return false;

  await supabase
    .from("gmail_threads")
    .delete()
    .eq("user_id", userId);

  await supabase
    .from("student_profiles")
    .update({ gmail_connected: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return true;
}

export async function getAuthenticatedGmailClient(userId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable");

  const { data: conn } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!conn?.refresh_token_encrypted) {
    throw new Error("Gmail not connected");
  }

  const oauth2 = createOAuth2Client();
  const refreshToken = decryptToken(conn.refresh_token_encrypted);
  oauth2.setCredentials({
    refresh_token: refreshToken,
    access_token: conn.access_token_encrypted ? decryptToken(conn.access_token_encrypted) : undefined,
    expiry_date: conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : undefined,
  });

  oauth2.on("tokens", async (tokens) => {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (tokens.access_token) {
      update.access_token_encrypted = encryptToken(tokens.access_token);
    }
    if (tokens.expiry_date) {
      update.token_expires_at = new Date(tokens.expiry_date).toISOString();
    }
    if (tokens.refresh_token) {
      update.refresh_token_encrypted = encryptToken(tokens.refresh_token);
    }
    await supabase.from("gmail_connections").update(update).eq("user_id", userId);
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  return { gmail, googleEmail: conn.google_email as string };
}
