"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { CvProfile, CvSectionItem } from "@/lib/data/cv-profile";

const SECTION_LABELS: Record<string, string> = {
  professional_summary: "Professional Summary",
  education: "Education",
  research_experience: "Research Experience",
  work_experience: "Work Experience",
  projects: "Projects",
  laboratory_experience: "Laboratory Experience",
  technical_skills: "Technical Skills",
  research_interests: "Research Interests",
  publications: "Publications",
  certifications: "Certifications",
  awards: "Awards",
  leadership: "Leadership",
  volunteer_experience: "Volunteer Experience",
};

export function CvBuilderClient() {
  const [cv, setCv] = useState<CvProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [generateProgramId, setGenerateProgramId] = useState("");
  const [generatedCv, setGeneratedCv] = useState<{ content: string; optimizationNotes: string; documentId?: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/cv-profile")
      .then((r) => r.json())
      .then((d) => {
        setCv(d.cv);
        setLoading(false);
      });
  }, []);

  async function save() {
    if (!cv) return;
    setSaving(true);
    const res = await fetch("/api/cv-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cv),
    });
    setSaving(false);
    if (res.ok) setMessage("Saved");
  }

  async function generateForProgram() {
    if (!generateProgramId) return;
    setGenerating(true);
    const res = await fetch("/api/ai/cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: generateProgramId }),
    });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) setGeneratedCv(data);
  }

  function updateSummary(value: string) {
    setCv((c) => c ? { ...c, professional_summary: value } : c);
  }

  function addItem(section: keyof CvProfile, item: CvSectionItem) {
    setCv((c) => {
      if (!c) return c;
      const arr = (c[section] as CvSectionItem[]) || [];
      return { ...c, [section]: [...arr, item] };
    });
  }

  if (loading) return <p className="text-slate-500">Loading CV profile…</p>;
  if (!cv) return <p className="text-slate-500">Unable to load CV profile.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CV / Resume Builder</h1>
          <p className="text-slate-500">Master profile — AI generates program-specific versions without inventing facts</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}

      <Alert variant="warning" title="No fabrication">
        AI only reorganizes and emphasizes information you provide. It never invents experience, publications, or skills.
      </Alert>

      <Card>
        <CardHeader><CardTitle className="text-base">Personal information</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div><Label>Full name</Label><Input value={cv.personal_info?.full_name || ""} onChange={(e) => setCv({ ...cv, personal_info: { ...cv.personal_info, full_name: e.target.value } })} /></div>
          <div><Label>Email</Label><Input value={cv.personal_info?.email || ""} onChange={(e) => setCv({ ...cv, personal_info: { ...cv.personal_info, email: e.target.value } })} /></div>
          <div><Label>Phone</Label><Input value={cv.personal_info?.phone || ""} onChange={(e) => setCv({ ...cv, personal_info: { ...cv.personal_info, phone: e.target.value } })} /></div>
          <div><Label>City</Label><Input value={cv.personal_info?.city || ""} onChange={(e) => setCv({ ...cv, personal_info: { ...cv.personal_info, city: e.target.value } })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Professional summary</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={4} value={cv.professional_summary || ""} onChange={(e) => updateSummary(e.target.value)} placeholder="Brief academic/professional summary" />
        </CardContent>
      </Card>

      {(["education", "research_experience", "work_experience", "projects"] as const).map((section) => (
        <SectionEditor
          key={section}
          title={SECTION_LABELS[section]}
          items={(cv[section] as CvSectionItem[]) || []}
          onChange={(items) => setCv({ ...cv, [section]: items })}
          onAdd={() => addItem(section, { id: crypto.randomUUID(), title: "", description: "" })}
        />
      ))}

      <Card>
        <CardHeader><CardTitle className="text-base">Technical skills</CardTitle></CardHeader>
        <CardContent>
          <Input
            value={(cv.technical_skills || []).join(", ")}
            onChange={(e) => setCv({ ...cv, technical_skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="Python, R, laboratory techniques, …"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Generate program-specific CV</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Program ID (from program URL)</Label>
            <Input value={generateProgramId} onChange={(e) => setGenerateProgramId(e.target.value)} placeholder="Paste program ID from /programs/[id]" />
            <p className="text-xs text-slate-500 mt-1">Or open a program and use Generate from the program hub.</p>
          </div>
          <Button onClick={generateForProgram} disabled={generating || !generateProgramId}>
            {generating ? "Generating…" : "Generate program-specific CV"}
          </Button>
          {generatedCv && (
            <div className="space-y-3">
              <Textarea rows={12} value={generatedCv.content} readOnly className="font-mono text-sm" />
              {generatedCv.optimizationNotes && (
                <div className="text-sm text-slate-600 border-l-4 border-slate-200 pl-3">
                  <p className="font-medium">Optimization notes</p>
                  <p>{generatedCv.optimizationNotes}</p>
                </div>
              )}
              {generatedCv.documentId && (
                <div className="flex gap-2">
                  <a href={`/api/generated-documents/${generatedCv.documentId}/export?format=docx`} className="text-sm text-red-700 underline">Download DOCX</a>
                  <a href={`/api/generated-documents/${generatedCv.documentId}/export?format=pdf`} className="text-sm text-red-700 underline">Download PDF</a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Link href="/profile/documents" className="text-sm text-red-700 underline">Document vault →</Link>
    </div>
  );
}

function SectionEditor({
  title,
  items,
  onChange,
  onAdd,
}: {
  title: string;
  items: CvSectionItem[];
  onChange: (items: CvSectionItem[]) => void;
  onAdd: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={onAdd}>Add</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="border border-slate-100 rounded-lg p-3 space-y-2">
            <Input value={item.title} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Title" />
            <Input value={item.subtitle || ""} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, subtitle: e.target.value } : x))} placeholder="Institution / employer" />
            <Textarea rows={2} value={item.description || ""} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Description" />
            <Button variant="outline" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</Button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">No entries yet.</p>}
      </CardContent>
    </Card>
  );
}
