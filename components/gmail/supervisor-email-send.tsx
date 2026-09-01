"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Send } from "lucide-react";

export function SupervisorEmailSendPanel({
  supervisorId,
  supervisorName,
  supervisorEmail,
  programId,
  programName,
  schoolName,
  initialDraft,
  initialSubject,
  outreachId,
}: {
  supervisorId: string;
  supervisorName: string;
  supervisorEmail: string | null;
  programId: string;
  programName: string;
  schoolName: string;
  initialDraft?: string;
  initialSubject?: string;
  outreachId?: string;
}) {
  const [subject, setSubject] = useState(
    initialSubject || `Prospective graduate student — ${programName}`
  );
  const [body, setBody] = useState(initialDraft || "");
  const [to, setTo] = useState(supervisorEmail || "");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function generate() {
    setGenerating(true);
    setError("");
    const res = await fetch("/api/ai/supervisor-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supervisor_id: supervisorId, program_id: programId }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error || "Failed to generate");
      return;
    }
    setBody(data.email);
    await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supervisor_id: supervisorId,
        program_id: programId,
        status: "awaiting_approval",
        email_draft: data.email,
        subject,
      }),
    });
  }

  async function sendEmail() {
    if (!to) {
      setError("Professor email required — use officially published email only.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        body,
        outreach_id: outreachId,
        program_id: programId,
        supervisor_id: supervisorId,
        user_approved: true,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Send failed. Connect Gmail first.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Alert variant="success" title="Email sent">
        Your message was sent via Gmail. Status updated to Sent. A follow-up reminder will be set if no response.
      </Alert>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Supervisor outreach — {supervisorName}</CardTitle>
        <p className="text-xs text-slate-500">{programName} · {schoolName}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button size="sm" onClick={generate} disabled={generating}>
          {generating ? "Generating…" : "Generate email draft"}
        </Button>

        {body && (
          <>
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 text-sm space-y-3">
              <p className="font-medium text-slate-800">Email preview</p>
              <div>
                <Label className="text-xs">To</Label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Official professor email" />
              </div>
              <div>
                <Label className="text-xs">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-sm bg-white" />
              <p className="text-xs text-slate-500">
                Attachments (CV, proposal): attach manually in Gmail after sending, or mention availability in the email.
              </p>
            </div>

            <Alert variant="warning" title="Review before sending">
              Never claim the professor has agreed to supervise or has funding. You must click Send Email to send.
            </Alert>

            <Button onClick={sendEmail} disabled={loading} className="gap-2">
              <Send className="h-4 w-4" />
              {loading ? "Sending…" : "Send email via Gmail"}
            </Button>
          </>
        )}

        {error && <Alert variant="error">{error}</Alert>}
      </CardContent>
    </Card>
  );
}
