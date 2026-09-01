"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function ProgramDocumentGenerator({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const [cv, setCv] = useState<{ content: string; documentId?: string } | null>(null);
  const [sop, setSop] = useState<{ content: string; documentId?: string; wordCount: number } | null>(null);
  const [proposal, setProposal] = useState<{ content: string; documentId?: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function generate(type: "cv" | "sop" | "proposal") {
    setLoading(type);
    setError("");
    const endpoint = type === "cv" ? "/api/ai/cv" : type === "sop" ? "/api/ai/sop" : "/api/ai/research-proposal";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: programId }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || "Generation failed");
      return;
    }
    if (type === "cv") setCv(data);
    else if (type === "sop") setSop(data);
    else setProposal(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI document generator</CardTitle>
        <p className="text-xs text-slate-500">Program-specific — uses only your profile data</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="warning" title="AI drafts">
          Review all generated content. AI never invents experience, publications, or achievements.
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => generate("cv")} disabled={loading === "cv"}>
            {loading === "cv" ? "Generating CV…" : "Generate CV"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => generate("sop")} disabled={loading === "sop"}>
            {loading === "sop" ? "Generating SOP…" : "Generate SOP"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => generate("proposal")} disabled={loading === "proposal"}>
            {loading === "proposal" ? "Generating…" : "Research proposal"}
          </Button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {cv && (
          <DocPreview title={`CV — ${programName}`} content={cv.content} documentId={cv.documentId} />
        )}
        {sop && (
          <DocPreview title={`SOP — ${programName}`} content={sop.content} documentId={sop.documentId} wordCount={sop.wordCount} />
        )}
        {proposal && (
          <DocPreview title={`Research proposal — ${programName}`} content={proposal.content} documentId={proposal.documentId} />
        )}
      </CardContent>
    </Card>
  );
}

function DocPreview({
  title,
  content,
  documentId,
  wordCount,
}: {
  title: string;
  content: string;
  documentId?: string;
  wordCount?: number;
}) {
  return (
    <div className="border border-slate-100 rounded-lg p-3 space-y-2">
      <p className="font-medium text-sm">{title}</p>
      {wordCount != null && <p className="text-xs text-slate-500">{wordCount} words</p>}
      <pre className="text-xs text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">{content.slice(0, 3000)}</pre>
      {documentId && (
        <div className="flex gap-3 text-sm">
          <a href={`/api/generated-documents/${documentId}/export?format=docx`} className="text-red-700 underline">DOCX</a>
          <a href={`/api/generated-documents/${documentId}/export?format=pdf`} className="text-red-700 underline">PDF</a>
        </div>
      )}
    </div>
  );
}
