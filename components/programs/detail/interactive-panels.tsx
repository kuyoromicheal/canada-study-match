"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Copy, RefreshCw } from "lucide-react";

export function ConfirmQuestionsPanel({ questions }: { questions: string[] }) {
  const [copied, setCopied] = useState(false);

  if (!questions.length) return null;

  async function copyAll() {
    const text = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Things you should confirm with the university</CardTitle>
        <Button size="sm" variant="outline" onClick={copyAll}>
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy questions"}
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
          {questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function SupervisorEmailPanel({
  supervisorId,
  supervisorName,
  programId,
  programName,
  schoolName,
}: {
  supervisorId: string;
  supervisorName: string;
  programId: string;
  programName: string;
  schoolName: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/ai/supervisor-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supervisor_id: supervisorId, program_id: programId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to generate email");
      return;
    }
    setEmail(data.email);
  }

  async function copy() {
    if (email) await navigator.clipboard.writeText(email);
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{supervisorName}</CardTitle>
        <p className="text-xs text-slate-500">{programName} · {schoolName}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button size="sm" onClick={generate} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating…" : "Generate supervisor email"}
        </Button>
        {error && <Alert variant="error">{error}</Alert>}
        {email && (
          <>
            <textarea
              className="w-full min-h-[160px] text-sm border border-slate-200 rounded-lg p-3 font-mono"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Draft only — review before sending. Does not imply the professor has agreed to supervise you.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
