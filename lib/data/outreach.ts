import { createClient } from "@/lib/supabase/server";
import type { OutreachStatus } from "@/lib/gmail/config";

export interface SupervisorOutreachRecord {
  id: string;
  user_id: string;
  supervisor_id: string;
  program_id: string | null;
  status: OutreachStatus;
  email_draft: string | null;
  subject: string | null;
  notes: string | null;
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
  sent_at: string | null;
  response_classification: string | null;
  response_snippet: string | null;
  follow_up_due: string | null;
  cv_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getOutreachForUser(userId: string): Promise<SupervisorOutreachRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("supervisor_outreach")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data as SupervisorOutreachRecord[]) || [];
}

export async function upsertOutreach(
  userId: string,
  input: {
    supervisor_id: string;
    program_id?: string;
    status?: OutreachStatus;
    email_draft?: string;
    subject?: string;
    notes?: string;
  }
): Promise<SupervisorOutreachRecord | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("supervisor_outreach")
    .upsert(
      {
        user_id: userId,
        supervisor_id: input.supervisor_id,
        program_id: input.program_id || null,
        status: input.status || "draft_ready",
        email_draft: input.email_draft || null,
        subject: input.subject || null,
        notes: input.notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,supervisor_id,program_id" }
    )
    .select()
    .single();

  if (error) return null;
  return data as SupervisorOutreachRecord;
}

export async function markOutreachSent(
  userId: string,
  outreachId: string,
  gmailMessageId: string,
  gmailThreadId: string
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("supervisor_outreach")
    .update({
      status: "sent",
      gmail_message_id: gmailMessageId,
      gmail_thread_id: gmailThreadId,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", outreachId)
    .eq("user_id", userId);

  return !error;
}

export async function createFollowUpTask(
  userId: string,
  params: {
    outreachId: string;
    programId?: string;
    supervisorId?: string;
    daysFromNow?: number;
  }
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const due = new Date();
  due.setDate(due.getDate() + (params.daysFromNow || 10));

  await supabase.from("follow_up_tasks").insert({
    user_id: userId,
    outreach_id: params.outreachId,
    program_id: params.programId || null,
    supervisor_id: params.supervisorId || null,
    due_date: due.toISOString().split("T")[0],
    status: "pending",
    notes: "No supervisor response received",
  });

  await supabase
    .from("supervisor_outreach")
    .update({
      status: "follow_up_due",
      follow_up_due: due.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.outreachId)
    .eq("user_id", userId);
}

export async function addTimelineEvent(
  userId: string,
  programId: string,
  eventType: string,
  title: string,
  description?: string,
  applicationId?: string
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  await supabase.from("application_timeline_events").insert({
    user_id: userId,
    program_id: programId,
    application_id: applicationId || null,
    event_type: eventType,
    title,
    description: description || null,
  });
}
