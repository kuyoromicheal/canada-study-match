import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { sendGmailMessage } from "@/lib/gmail/send";
import { getGmailConnectionStatus } from "@/lib/gmail/connection";
import { markOutreachSent, createFollowUpTask, addTimelineEvent, upsertOutreach } from "@/lib/data/outreach";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    to,
    subject,
    body: emailBody,
    outreach_id,
    program_id,
    supervisor_id,
    user_approved,
    reply_to_message_id,
  } = body;

  if (!user_approved) {
    return NextResponse.json(
      { error: "You must explicitly approve sending by setting user_approved: true" },
      { status: 400 }
    );
  }

  if (!to || !subject || !emailBody) {
    return NextResponse.json({ error: "to, subject, and body required" }, { status: 400 });
  }

  const conn = await getGmailConnectionStatus(userId);
  if (conn.status !== "connected") {
    return NextResponse.json({ error: "Connect Gmail first" }, { status: 400 });
  }

  try {
    const result = await sendGmailMessage(userId, {
      to,
      subject,
      body: emailBody + "\n\n---\nSent via Canada Study Match (user-approved draft).",
      replyToMessageId: reply_to_message_id,
    });

    if (outreach_id) {
      await markOutreachSent(userId, outreach_id, result.messageId, result.threadId);
      await createFollowUpTask(userId, {
        outreachId: outreach_id,
        programId: program_id,
        supervisorId: supervisor_id,
        daysFromNow: 10,
      });
    } else if (supervisor_id && program_id) {
      const record = await upsertOutreach(userId, {
        supervisor_id,
        program_id,
        status: "sent",
        email_draft: emailBody,
        subject,
      });
      if (record) {
        await markOutreachSent(userId, record.id, result.messageId, result.threadId);
      }
    }

    if (program_id) {
      await addTimelineEvent(userId, program_id, "supervisor_contacted", "Supervisor email sent", subject);
    }

    const supabase = await createClient();
    if (supabase) {
      await supabase.from("gmail_threads").upsert(
        {
          user_id: userId,
          gmail_thread_id: result.threadId,
          gmail_message_id: result.messageId,
          subject,
          from_email: conn.email,
          snippet: emailBody.slice(0, 200),
          category: "supervisors",
          is_outbound: true,
          received_at: new Date().toISOString(),
          synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,gmail_thread_id" }
      );
    }

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      threadId: result.threadId,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 500 }
    );
  }
}
