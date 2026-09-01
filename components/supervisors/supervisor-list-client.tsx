"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import type { ProgramWithDetails, SupervisorMatchResult } from "@/types/database";
import { Mail, User } from "lucide-react";

interface Props {
  programs: ProgramWithDetails[];
  selectedProgramId?: string;
  selectedProgram: ProgramWithDetails | null;
  matches: SupervisorMatchResult[];
  studentName: string;
  researchInterests: string[];
}

export function SupervisorListClient({
  programs,
  selectedProgramId,
  selectedProgram,
  matches,
  studentName,
  researchInterests,
}: Props) {
  const router = useRouter();
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string | null>(null);

  async function generateEmail(supervisor: SupervisorMatchResult) {
    setLoadingEmail(true);
    setSelectedSupervisor(supervisor.supervisor.id);
    try {
      const res = await fetch("/api/ai/supervisor-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          programName: selectedProgram?.name,
          schoolName: selectedProgram?.school?.name,
          supervisorName: supervisor.supervisor.name,
          researchInterests,
          sharedInterests: supervisor.sharedInterests,
        }),
      });
      const data = await res.json();
      setEmailDraft(data.content);
    } catch {
      setEmailDraft("Failed to generate email draft.");
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 max-w-md">
        <Label>Select program</Label>
        <Select
          value={selectedProgramId || ""}
          onChange={(e) => router.push(`/supervisors?program=${e.target.value}`)}
        >
          <option value="">Choose a program...</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      {selectedProgram && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selectedProgram.name}</CardTitle>
            <p className="text-sm text-slate-500">{selectedProgram.school?.name}</p>
          </CardHeader>
        </Card>
      )}

      {matches.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {matches.map((match) => (
            <Card key={match.supervisor.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-red-700" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{match.supervisor.name}</CardTitle>
                      <p className="text-xs text-slate-500">{match.supervisor.title} · {match.supervisor.department}</p>
                    </div>
                  </div>
                  <Badge variant={match.compatibilityScore >= 70 ? "success" : match.compatibilityScore >= 40 ? "warning" : "default"}>
                    {match.compatibilityScore}% fit
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {match.supervisor.is_demo_record && <Badge variant="demo">DEMO</Badge>}
                {!match.supervisor.accepting_students && (
                  <Badge variant="danger">Not accepting students</Badge>
                )}
                <div className="flex flex-wrap gap-1">
                  {match.supervisor.research_areas?.map((area) => (
                    <Badge key={area} variant="default">{area}</Badge>
                  ))}
                </div>
                <ul className="text-sm text-slate-600 space-y-1">
                  {match.reasoning.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateEmail(match)}
                  disabled={loadingEmail || !match.supervisor.accepting_students}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {loadingEmail && selectedSupervisor === match.supervisor.id ? "Generating..." : "Generate supervisor email"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : selectedProgramId ? (
        <div className="text-center py-12 text-slate-500">
          No supervisors listed for this program in demo data.
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          Select a program to see compatible supervisors.
        </div>
      )}

      {emailDraft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert variant="warning">
              This is an AI-generated draft. Sending this email does NOT imply the professor has agreed to supervise you.
            </Alert>
            <Textarea value={emailDraft} readOnly rows={16} className="font-mono text-xs" />
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(emailDraft)}>
              Copy to clipboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
