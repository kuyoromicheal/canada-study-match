"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssistantChatPanel({
  programId,
  programName,
}: {
  programId?: string;
  programName?: string;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = programId
    ? [
        "What am I missing for this application?",
        "Do I need a supervisor?",
        "Which documents are required?",
        "Why is my match score what it is?",
      ]
    : [
        "What deadlines are coming up?",
        "Which of my programs don't require supervisors?",
      ];

  async function ask(q?: string) {
    const text = q || question;
    if (!text.trim()) return;
    setLoading(true);
    setAnswer("");
    const res = await fetch("/api/ai/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text, program_id: programId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setAnswer(data.answer);
    else setAnswer(data.error || "Failed to get answer");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ask about this application</CardTitle>
        {programName && <p className="text-xs text-slate-500">{programName}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What am I missing?"
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <Button onClick={() => ask()} disabled={loading}>{loading ? "…" : "Ask"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" className="text-xs text-red-700 underline" onClick={() => { setQuestion(s); ask(s); }}>
              {s}
            </button>
          ))}
        </div>
        {answer && (
          <div className="text-sm text-slate-700 border border-slate-100 rounded-lg p-3 bg-slate-50 whitespace-pre-wrap">
            {answer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
