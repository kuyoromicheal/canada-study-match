"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Tabs } from "@/components/ui/tabs";
import { VERIFIABLE_FIELD_OPTIONS, type VerifiableFieldId } from "@/lib/verification/field-status";
import {
  DEGREE_LEVEL_OPTIONS,
  INSTITUTION_TYPE_OPTIONS,
  PROGRAM_TYPE_OPTIONS,
} from "@/lib/constants/form-options";
import { VERIFICATION_STATUS_LABELS, CANADIAN_PROVINCES } from "@/types/database";
import { ExternalLink, Plus, Sparkles, CheckCircle } from "lucide-react";

interface School {
  id: string;
  name: string;
  slug: string;
  province: string;
  city: string;
  website_url: string | null;
  institution_type: string | null;
  is_demo_record: boolean;
  verification_status: string;
  source_url: string | null;
}

interface ProgramRow {
  id: string;
  name: string;
  field: string;
  province: string;
  city: string;
  school_id: string;
  verification_status: string;
  is_demo_record: boolean;
  source_url: string | null;
  source_type: string | null;
  demandScore?: number;
  schoolName?: string;
}

interface ProgramRequest {
  id: string;
  school_name: string;
  program_name: string;
  field: string | null;
  province: string | null;
  request_count: number;
}

interface SkippedInstitution {
  id: string;
  external_id: string | null;
  raw_name: string | null;
  institution_name: string | null;
  province: string | null;
  raw_city: string | null;
  raw_url: string | null;
  source_url: string;
  reason: string | null;
  institution_type: string | null;
  suggested_institution_type: string | null;
  quebec_category: string | null;
  created_at: string;
}

const DEFAULT_VERIFY_FIELDS: VerifiableFieldId[] = ["program_listing"];

export function AdminPanelClient() {
  const [schools, setSchools] = useState<School[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [demandQueue, setDemandQueue] = useState<ProgramRow[]>([]);
  const [requests, setRequests] = useState<ProgramRequest[]>([]);
  const [skippedInstitutions, setSkippedInstitutions] = useState<SkippedInstitution[]>([]);
  const [stats, setStats] = useState({
    totalSchools: 0,
    realSchools: 0,
    demoSchools: 0,
    needsVerification: 0,
    skippedInstitutions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [schoolForm, setSchoolForm] = useState({
    name: "", province: "", city: "", website_url: "", institution_type: "university", source_url: "",
  });

  const [programForm, setProgramForm] = useState({
    school_id: "", name: "", field: "", degree_level: "master", program_type: "course_based",
    province: "", city: "", source_url: "", description: "", min_gpa: "", english_requirement: "",
    supervisor_status: "unknown_verify", supervisor_requirement_text: "", verification_status: "needs_verification",
  });
  const [verifiedFields, setVerifiedFields] = useState<VerifiableFieldId[]>(["program_listing"]);
  const [queueVerifyFields, setQueueVerifyFields] = useState<Record<string, VerifiableFieldId[]>>({});
  const [extractUrl, setExtractUrl] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [extracting, setExtracting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/catalog");
    const data = await res.json();
    if (res.ok) {
      setSchools(data.schools);
      setPrograms(data.programs);
      setDemandQueue(data.demandQueue);
      setRequests(data.requests);
      setSkippedInstitutions(data.skippedInstitutions || []);
      setStats(data.stats);
    } else {
      setMessage(data.error || "Failed to load admin catalog");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleVerifiedField(
    field: VerifiableFieldId,
    current: VerifiableFieldId[],
    setter: (next: VerifiableFieldId[]) => void
  ) {
    if (current.includes(field)) {
      if (field === "program_listing" && current.length === 1) return;
      setter(current.filter((f) => f !== field));
    } else {
      setter([...current, field]);
    }
  }

  async function saveSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolForm.source_url) { setMessage("source_url is required"); return; }
    const res = await fetch("/api/admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...schoolForm,
        is_demo_record: false,
        verification_status: "needs_verification",
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "School saved" : data.error);
    if (res.ok) {
      setSchoolForm({ name: "", province: "", city: "", website_url: "", institution_type: "university", source_url: "" });
      load();
    }
  }

  async function extractProgram() {
    setExtracting(true);
    setMessage("");
    const res = await fetch("/api/admin/programs/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: extractUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      setDraft(data.draft);
      setProgramForm((f) => ({
        ...f,
        name: data.draft.name,
        field: data.draft.field,
        degree_level: data.draft.degree_level,
        program_type: data.draft.program_type,
        description: data.draft.description,
        source_url: data.draft.source_url,
        min_gpa: data.draft.min_gpa?.toString() || "",
        english_requirement: data.draft.english_requirement || "",
        supervisor_status: data.draft.supervisor_status,
        supervisor_requirement_text: data.draft.supervisor_requirement_text || "",
        verification_status: "needs_verification",
      }));
      setVerifiedFields(["program_listing"]);
      setMessage(`AI draft extracted. Supervisor suggestion: ${data.draft.supervisor_classification} — confirm fields checked against source before publishing.`);
    } else {
      setMessage(data.error);
    }
    setExtracting(false);
  }

  async function saveProgram(publish = false) {
    if (!programForm.source_url) { setMessage("source_url is required"); return; }
    if (publish && !verifiedFields.includes("program_listing")) {
      setMessage("Check at least 'Program listing' to publish");
      return;
    }
    const school = schools.find((s) => s.id === programForm.school_id);
    const fieldsToSend = publish ? verifiedFields : [];
    const res = await fetch("/api/admin/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...programForm,
        province: programForm.province || school?.province,
        city: programForm.city || school?.city,
        min_gpa: programForm.min_gpa ? parseFloat(programForm.min_gpa) : null,
        verification_status: publish && verifiedFields.includes("program_listing") ? "verified" : "needs_verification",
        verified_fields: fieldsToSend,
        source_type: publish ? "university_official" : (draft ? "ai_extracted_unverified" : "manual"),
        requirements: draft?.requirements || [],
        deadlines: draft?.deadlines || [],
        tuition_amount: draft?.tuition_amount || null,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? (publish ? "Program published with selected verified fields" : "Draft program saved") : data.error);
    if (res.ok) {
      setDraft(null);
      setExtractUrl("");
      setVerifiedFields(["program_listing"]);
      load();
    }
  }

  async function verifyProgram(id: string) {
    const prog = programs.find((p) => p.id === id) || demandQueue.find((p) => p.id === id);
    if (!prog?.source_url) { setMessage("Cannot verify without source_url"); return; }
    const fields = queueVerifyFields[id] || DEFAULT_VERIFY_FIELDS;
    if (!fields.includes("program_listing")) {
      setMessage("Check at least 'Program listing' to verify");
      return;
    }
    const res = await fetch("/api/admin/programs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        source_url: prog.source_url,
        verified_fields: fields,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Verified fields: ${fields.join(", ")}` : data.error || "Verification failed");
    load();
  }

  const realSchools = schools.filter((s) => !s.is_demo_record);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin — Verification Workflow</h1>
        <p className="text-slate-500">
          Manage real catalog data. Confirm each fact against the official source — program listing verification does not mark GPA, deadlines, or tuition as verified.
        </p>
      </div>

      {message && <Alert variant="info">{message}</Alert>}

      <div className="grid sm:grid-cols-5 gap-4">
        <StatCard label="Total Schools" value={stats.totalSchools} sub={`${stats.realSchools} real · ${stats.demoSchools} demo`} />
        <StatCard label="Needs Verification" value={stats.needsVerification} />
        <StatCard label="Pending Requests" value={requests.length} />
        <StatCard label="Real Institutions" value={realSchools.length} />
        <StatCard label="Skipped (review)" value={stats.skippedInstitutions ?? skippedInstitutions.length} />
      </div>

      <Tabs
        tabs={[
          { id: "queue", label: "Verification Queue" },
          { id: "requests", label: "Student Requests" },
          { id: "programs", label: "Add Program" },
          { id: "schools", label: "Add School" },
          { id: "catalog", label: "Catalog" },
        ]}
        panels={{
          queue: (
            <Card>
              <CardHeader><CardTitle>Needs Verification (by student demand)</CardTitle></CardHeader>
              <CardContent className="divide-y">
                {demandQueue.length ? demandQueue.map((p) => {
                  const fields = queueVerifyFields[p.id] || DEFAULT_VERIFY_FIELDS;
                  return (
                    <div key={p.id} className="py-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.schoolName} · {p.province} · demand score: {p.demandScore}</p>
                        </div>
                        <div className="flex gap-2 items-center shrink-0">
                          <Badge variant="warning">{VERIFICATION_STATUS_LABELS[p.verification_status as keyof typeof VERIFICATION_STATUS_LABELS]}</Badge>
                          {p.source_url && (
                            <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-red-700"><ExternalLink className="h-4 w-4" /></a>
                          )}
                        </div>
                      </div>
                      <VerificationChecklist
                        selected={fields}
                        onToggle={(field) =>
                          toggleVerifiedField(field, fields, (next) =>
                            setQueueVerifyFields((prev) => ({ ...prev, [p.id]: next }))
                          )
                        }
                      />
                      <Button size="sm" onClick={() => verifyProgram(p.id)}>Verify selected fields</Button>
                    </div>
                  );
                }) : <p className="text-sm text-slate-500 py-4">No programs awaiting verification.</p>}
              </CardContent>
            </Card>
          ),
          requests: (
            <Card>
              <CardHeader><CardTitle>Program Requests from Students</CardTitle></CardHeader>
              <CardContent className="divide-y">
                {requests.length ? requests.map((r) => (
                  <div key={r.id} className="py-3 flex justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.program_name}</p>
                      <p className="text-xs text-slate-500">{r.school_name} · {r.province || "—"} · {r.field || "—"}</p>
                    </div>
                    <Badge>{r.request_count} request{r.request_count > 1 ? "s" : ""}</Badge>
                  </div>
                )) : <p className="text-sm text-slate-500 py-4">No pending requests.</p>}
              </CardContent>
            </Card>
          ),
          programs: (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI-Assisted Extraction</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Alert variant="warning">AI-extracted data is never shown to students as verified until you confirm each field against the official source page.</Alert>
                  <div className="flex gap-2">
                    <Input placeholder="Official program URL" value={extractUrl} onChange={(e) => setExtractUrl(e.target.value)} />
                    <Button onClick={extractProgram} disabled={extracting}>{extracting ? "Extracting..." : "Extract"}</Button>
                  </div>
                  {draft && (
                    <div className="rounded-lg bg-slate-50 p-3 text-xs font-mono overflow-auto max-h-40">
                      Supervisor suggestion: {String(draft.supervisor_classification)} — admin must confirm
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Program Form</CardTitle></CardHeader>
                <CardContent>
                  <form className="grid sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); saveProgram(false); }}>
                    <FormField label="School *">
                      <Select required value={programForm.school_id} onChange={(e) => setProgramForm({ ...programForm, school_id: e.target.value })}>
                        <option value="">Select school...</option>
                        {realSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Program name *"><Input required value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} /></FormField>
                    <FormField label="Field *"><Input required value={programForm.field} onChange={(e) => setProgramForm({ ...programForm, field: e.target.value })} /></FormField>
                    <FormField label="Degree level *">
                      <Select value={programForm.degree_level} onChange={(e) => setProgramForm({ ...programForm, degree_level: e.target.value })}>
                        {DEGREE_LEVEL_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Program type">
                      <Select value={programForm.program_type} onChange={(e) => setProgramForm({ ...programForm, program_type: e.target.value })}>
                        {PROGRAM_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Source URL *"><Input required value={programForm.source_url} onChange={(e) => setProgramForm({ ...programForm, source_url: e.target.value })} /></FormField>
                    <FormField label="Supervisor status">
                      <Select value={programForm.supervisor_status} onChange={(e) => setProgramForm({ ...programForm, supervisor_status: e.target.value })}>
                        {["required","recommended","not_required","unknown_verify"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Min GPA"><Input value={programForm.min_gpa} onChange={(e) => setProgramForm({ ...programForm, min_gpa: e.target.value })} /></FormField>
                    <FormField label="English requirement"><Input value={programForm.english_requirement} onChange={(e) => setProgramForm({ ...programForm, english_requirement: e.target.value })} /></FormField>
                    <div className="sm:col-span-2">
                      <FormField label="Supervisor requirement text"><Textarea value={programForm.supervisor_requirement_text} onChange={(e) => setProgramForm({ ...programForm, supervisor_requirement_text: e.target.value })} /></FormField>
                    </div>
                    <div className="sm:col-span-2">
                      <VerificationChecklist
                        selected={verifiedFields}
                        onToggle={(field) => toggleVerifiedField(field, verifiedFields, setVerifiedFields)}
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-2">
                      <Button type="submit" variant="outline">Save Draft</Button>
                      <Button type="button" onClick={() => saveProgram(true)}><CheckCircle className="h-4 w-4" /> Verify &amp; Publish</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ),
          schools: (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add School</CardTitle></CardHeader>
              <CardContent>
                <form className="grid sm:grid-cols-2 gap-4" onSubmit={saveSchool}>
                  <FormField label="Name *"><Input required value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })} /></FormField>
                  <FormField label="Province *">
                    <Select required value={schoolForm.province} onChange={(e) => setSchoolForm({ ...schoolForm, province: e.target.value })}>
                      <option value="">Select province...</option>
                      {CANADIAN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="City *"><Input required value={schoolForm.city} onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })} /></FormField>
                  <FormField label="Website"><Input value={schoolForm.website_url} onChange={(e) => setSchoolForm({ ...schoolForm, website_url: e.target.value })} /></FormField>
                  <FormField label="Institution type">
                    <Select value={schoolForm.institution_type} onChange={(e) => setSchoolForm({ ...schoolForm, institution_type: e.target.value })}>
                      {INSTITUTION_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Source URL *"><Input required value={schoolForm.source_url} onChange={(e) => setSchoolForm({ ...schoolForm, source_url: e.target.value })} /></FormField>
                  <div className="sm:col-span-2"><Button type="submit">Save School</Button></div>
                </form>
              </CardContent>
            </Card>
          ),
          catalog: (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Skipped institutions — manual review ({skippedInstitutions.length})</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[28rem] overflow-y-auto divide-y text-sm">
                  {loading ? (
                    <p className="text-slate-500 py-4">Loading...</p>
                  ) : skippedInstitutions.length ? (
                    skippedInstitutions.map((row) => (
                      <div key={row.id} className="py-3 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{row.raw_name || row.institution_name}</p>
                          {row.province === "Quebec" && row.quebec_category && (
                            <Badge variant="info">{row.quebec_category.replace("_", " ")}</Badge>
                          )}
                          {row.suggested_institution_type && (
                            <Badge>suggested: {row.suggested_institution_type}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          external_id: {row.external_id || "—"} · province: {row.province || "—"} · city attempt: {row.raw_city || "—"}
                        </p>
                        <p className="text-xs text-slate-500 break-all">
                          URL attempt: {row.raw_url || row.source_url}
                        </p>
                        {row.reason && <p className="text-xs text-amber-700">{row.reason}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 py-4">
                      No skipped institutions logged yet. Re-run <code className="text-xs">npm run ingest:institutions</code> after applying migrations to populate this list.
                    </p>
                  )}
                </CardContent>
              </Card>
              <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Schools ({schools.length})</CardTitle></CardHeader>
                  <CardContent className="max-h-96 overflow-y-auto divide-y text-sm">
                    {schools.map((s) => (
                      <div key={s.id} className="py-2 flex justify-between gap-2">
                        <span className="truncate">{s.name}</span>
                        <div className="flex gap-1 shrink-0">
                          {s.is_demo_record ? <Badge variant="demo">DEMO</Badge> : <Badge variant="success">Real</Badge>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Programs ({programs.length})</CardTitle></CardHeader>
                  <CardContent className="max-h-96 overflow-y-auto divide-y text-sm">
                    {programs.map((p) => (
                      <div key={p.id} className="py-2 flex justify-between gap-2">
                        <span className="truncate">{p.name}</span>
                        <div className="flex gap-1 shrink-0">
                          {p.is_demo_record && <Badge variant="demo">DEMO</Badge>}
                          {!p.is_demo_record && p.verification_status === "needs_verification" && <Badge variant="warning">Needs verification</Badge>}
                          {p.verification_status === "verified" && !p.is_demo_record && <Badge variant="success">Verified</Badge>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ),
        }}
      />
    </div>
  );
}

function VerificationChecklist({
  selected,
  onToggle,
}: {
  selected: VerifiableFieldId[];
  onToggle: (field: VerifiableFieldId) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
      <p className="text-xs font-medium text-slate-700">Confirm verified against source page:</p>
      {VERIFIABLE_FIELD_OPTIONS.map((opt) => (
        <label key={opt.id} className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={selected.includes(opt.id)}
            onChange={() => onToggle(opt.id)}
          />
          <span className="text-slate-600">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </CardHeader>
    </Card>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
