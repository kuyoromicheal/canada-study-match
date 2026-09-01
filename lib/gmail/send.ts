import { getAuthenticatedGmailClient } from "@/lib/gmail/connection";

function buildRawEmail(params: {
  to: string;
  from: string;
  subject: string;
  body: string;
  replyToMessageId?: string;
}): string {
  const headers = [
    `To: ${params.to}`,
    `From: ${params.from}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];

  if (params.replyToMessageId) {
    headers.push(`In-Reply-To: ${params.replyToMessageId}`);
    headers.push(`References: ${params.replyToMessageId}`);
  }

  const message = [...headers, "", params.body].join("\r\n");
  return Buffer.from(message).toString("base64url");
}

export interface SendEmailResult {
  messageId: string;
  threadId: string;
}

export async function sendGmailMessage(
  userId: string,
  params: {
    to: string;
    subject: string;
    body: string;
    replyToMessageId?: string;
  }
): Promise<SendEmailResult> {
  const { gmail, googleEmail } = await getAuthenticatedGmailClient(userId);

  const raw = buildRawEmail({
    to: params.to,
    from: googleEmail,
    subject: params.subject,
    body: params.body,
    replyToMessageId: params.replyToMessageId,
  });

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  if (!res.data.id || !res.data.threadId) {
    throw new Error("Gmail send failed — no message ID returned");
  }

  return { messageId: res.data.id, threadId: res.data.threadId };
}
