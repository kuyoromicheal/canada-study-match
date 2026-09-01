import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedGmailClient } from "@/lib/gmail/connection";
import { APPLICATION_EMAIL_QUERY } from "@/lib/gmail/config";
import { categorizeEmail, classifySupervisorResponse, isApplicationRelatedEmail } from "@/lib/gmail/classify";

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function getHeader(headers: { name?: string | null; value?: string | null }[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function syncApplicationEmails(userId: string): Promise<{ synced: number; errors: string[] }> {
  const supabase = await createClient();
  if (!supabase) return { synced: 0, errors: ["Database unavailable"] };

  const errors: string[] = [];
  let synced = 0;

  try {
    const { gmail } = await getAuthenticatedGmailClient(userId);

    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: APPLICATION_EMAIL_QUERY,
      maxResults: 50,
    });

    const messages = listRes.data.messages || [];

    for (const msg of messages) {
      if (!msg.id) continue;

      try {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full",
        });

        const headers = full.data.payload?.headers;
        const subject = getHeader(headers, "Subject");
        const from = getHeader(headers, "From");
        const fromMatch = from.match(/<([^>]+)>/) || [null, from];
        const fromEmail = (fromMatch[1] || from).trim();
        const fromName = from.replace(/<[^>]+>/, "").trim();
        const snippet = full.data.snippet || "";

        if (!isApplicationRelatedEmail(fromEmail, subject)) continue;

        const category = categorizeEmail(subject, fromEmail, snippet);
        const threadId = full.data.threadId || msg.id;
        const receivedAt = full.data.internalDate
          ? new Date(parseInt(full.data.internalDate, 10)).toISOString()
          : new Date().toISOString();

        let bodyText = snippet;
        const parts = full.data.payload?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              bodyText = decodeBase64Url(part.body.data);
              break;
            }
          }
        } else if (full.data.payload?.body?.data) {
          bodyText = decodeBase64Url(full.data.payload.body.data);
        }

        const isOutbound = full.data.labelIds?.includes("SENT") ?? false;
        const classification = category === "supervisors" && !isOutbound
          ? classifySupervisorResponse(bodyText)
          : null;

        const { data: thread, error: threadError } = await supabase
          .from("gmail_threads")
          .upsert(
            {
              user_id: userId,
              gmail_thread_id: threadId,
              gmail_message_id: msg.id,
              subject,
              from_email: fromEmail,
              from_name: fromName,
              snippet,
              category,
              classification,
              is_outbound: isOutbound,
              received_at: receivedAt,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "user_id,gmail_thread_id" }
          )
          .select("id")
          .single();

        if (threadError || !thread) {
          errors.push(`Thread save failed: ${threadError?.message}`);
          continue;
        }

        await supabase.from("gmail_messages").upsert(
          {
            user_id: userId,
            thread_id: thread.id,
            gmail_message_id: msg.id,
            subject,
            from_email: fromEmail,
            to_email: getHeader(headers, "To"),
            body_text: bodyText.slice(0, 10000),
            is_outbound: isOutbound,
            received_at: receivedAt,
          },
          { onConflict: "user_id,gmail_message_id" }
        );

        // Match supervisor replies to outreach records
        if (category === "supervisors" && !isOutbound && classification) {
          await supabase
            .from("supervisor_outreach")
            .update({
              status: classification === "interested" ? "interested" : classification === "unavailable" ? "not_available" : "replied",
              response_classification: classification,
              response_snippet: snippet.slice(0, 500),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .ilike("email_draft", `%${fromEmail.split("@")[0]}%`);
        }

        synced++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Message sync error");
      }
    }

    await supabase
      .from("gmail_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Gmail sync failed");
  }

  return { synced, errors };
}

export async function getGmailThreadsForUser(
  userId: string,
  category?: string
): Promise<
  {
    id: string;
    subject: string | null;
    from_email: string | null;
    from_name: string | null;
    snippet: string | null;
    category: string;
    classification: string | null;
    is_read: boolean;
    received_at: string | null;
  }[]
> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from("gmail_threads")
    .select("id, subject, from_email, from_name, snippet, category, classification, is_read, received_at")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(100);

  if (category) query = query.eq("category", category);

  const { data } = await query;
  return data || [];
}
