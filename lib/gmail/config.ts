export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "openid",
  "email",
  "profile",
] as const;

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/gmail/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

export function isGmailConfigured(): boolean {
  return Boolean(getGoogleOAuthConfig() && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY);
}

export const GMAIL_SCOPE_DESCRIPTION =
  "Canada Study Match requests permission to send emails you explicitly approve, and read application-related messages (universities, supervisors, admissions) to help you track responses. We never read unrelated personal email.";

export const APPLICATION_EMAIL_QUERY = [
  "(from:(*.edu OR *.ca) OR from:(admissions OR graduate OR professor OR faculty OR supervisor OR scholarship))",
  "subject:(admission OR application OR graduate OR supervisor OR offer OR scholarship OR interview OR document)",
].join(" ");

export type GmailConnectionStatus = "connected" | "not_connected" | "reauthorization_required";

export type EmailCategory =
  | "supervisors"
  | "universities"
  | "applications"
  | "offers"
  | "scholarships"
  | "action_required";

export type OutreachStatus =
  | "not_contacted"
  | "draft_ready"
  | "awaiting_approval"
  | "sent"
  | "replied"
  | "interested"
  | "not_available"
  | "no_response"
  | "follow_up_due"
  | "not_prepared";

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  not_contacted: "Not Contacted",
  draft_ready: "Draft Ready",
  awaiting_approval: "Awaiting Approval",
  sent: "Sent",
  replied: "Replied",
  interested: "Interested",
  not_available: "Not Available",
  no_response: "No Response",
  follow_up_due: "Follow-up Due",
  not_prepared: "Not Prepared",
};

export type ResponseClassification =
  | "interested"
  | "potentially_interested"
  | "requests_info"
  | "declined"
  | "unavailable"
  | "needs_follow_up"
  | "unclear";
