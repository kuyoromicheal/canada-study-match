import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramById, getProgramMatches, getStudentProfile } from "@/lib/data/repository";
import { analyzeProgramSupervisorRequirement, getDefaultChecklistItems } from "@/lib/matching/supervisor-detection";
import { PreparationDisclaimer } from "@/components/applications/preparation-disclaimer";
import { FieldVerificationBadge, ProgramLevelBadge } from "@/components/programs/field-verification-badge";
import {
  getEnglishVerificationStatus,
  getGpaVerificationStatus,
  getPrerequisiteVerificationStatus,
  getSupervisorVerificationStatus,
} from "@/lib/verification/field-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";
import {
  MATCH_DISCLAIMER,
  SUPERVISOR_STATUS_LABELS,
  type VerificationStatus,
} from "@/types/database";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  XCircle,
} from "lucide-react";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgramById(id);
  if (!program) notFound();

  const profile = await getStudentProfile();
  const matches = profile ? await getProgramMatches(profile) : [];
  const matchResult = matches.find((m) => m.id === id)?.matchResult;
  const supervisorInfo = analyzeProgramSupervisorRequirement(program);
  const requiredDocuments = program.required_documents?.filter((d) => d.is_required) ?? [];
  const admissionsUrl = program.official_admissions_url || program.source_url || null;
  const tuition = program.tuition?.find((t) => t.period === "year");
  const gpaStatus = getGpaVerificationStatus(program);
  const englishStatus = getEnglishVerificationStatus(program);
  const supervisorStatus = getSupervisorVerificationStatus(program);

  return (
    <div className="space-y-6">
      <Link href="/programs" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to programs
      </Link>

      <div className="flex flex-wrap gap-2 mb-2">
        <ProgramLevelBadge
          isDemo={program.is_demo_record}
          verificationStatus={program.verification_status}
        />
      </div>
      <p className="text-xs text-slate-500 -mt-4 mb-2">
        Program badge reflects listing confirmation only (program exists; intake, type, and degree level match the source).
        Individual facts below show their own verification status.
      </p>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{program.name}</h1>
          <p className="text-slate-500 mt-1">
            {program.school?.name} · {program.city}, {program.province}
          </p>
        </div>
        {matchResult && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-[200px]">
            <p className="text-sm text-slate-500">Match Score</p>
            <p className="text-3xl font-bold text-red-700">{matchResult.score}%</p>
            <p className="text-sm font-medium text-slate-700">{matchResult.tierLabel}</p>
            <Progress value={matchResult.score} className="mt-2" />
          </div>
        )}
      </div>

      <Alert variant="warning" title="Not Guaranteed Admission">
        {MATCH_DISCLAIMER}
      </Alert>

      <PreparationDisclaimer admissionsUrl={admissionsUrl} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>{program.description}</p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <InfoRow label="Degree" value={program.degree_level} />
                <InfoRow label="Program type" value={program.program_type.replace("_", "-")} />
                <InfoRow label="Field" value={program.field} />
                <InfoRow label="Duration" value={program.duration_months ? `${program.duration_months} months` : "—"} />
                <InfoRow label="Intakes" value={program.intakes?.join(", ") || "—"} />
                <InfoRow label="International eligible" value={program.international_eligible ? "Yes" : "No"} />
                <InfoRow label="PGWP eligible" value={program.pgwp_eligible ? "Yes" : "No"} />
              </div>
            </CardContent>
          </Card>

          {matchResult && (
            <Card>
              <CardHeader><CardTitle>Why You Match</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">{matchResult.summary}</p>
                <div className="space-y-2">
                  {matchResult.scoreBreakdown.map((item) => (
                    <div key={item.factor} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.factor}</span>
                      <span className="text-slate-500">{Math.round((item.score / item.maxScore) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(matchResult?.requirementChecks || []).map((check) => (
                <RequirementRow key={check.id} check={check} />
              ))}

              {(program.min_gpa != null || getRequirementByCategory(program, "Academic", "gpa")) && (
                <FactBlock
                  title="Minimum GPA"
                  status={gpaStatus}
                  content={
                    program.min_gpa != null
                      ? `${program.min_gpa}/${program.gpa_scale ?? 4.0}`
                      : getRequirementByCategory(program, "Academic", "gpa")?.description || "—"
                  }
                />
              )}

              {program.english_requirement && (
                <FactBlock
                  title="English requirement"
                  status={englishStatus}
                  content={program.english_requirement}
                />
              )}

              {program.requirements
                ?.filter((r) => !["Academic", "Language", "Supervisor"].includes(r.category))
                .map((req) => (
                  <FactBlock
                    key={req.id}
                    title={req.title}
                    status={getPrerequisiteVerificationStatus(req)}
                    content={req.description || undefined}
                  />
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                Supervisor Requirement
                <FieldVerificationBadge status={supervisorStatus} />
                {supervisorInfo.priority === "high" && (
                  <Badge variant="danger">ACTION REQUIRED</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={program.supervisor_status === "required" ? "danger" : program.supervisor_status === "not_required" ? "success" : "warning"}>
                {SUPERVISOR_STATUS_LABELS[program.supervisor_status]}
              </Badge>
              <p className="text-sm text-slate-600">{supervisorInfo.actionLabel}</p>
              {program.supervisor_requirement_text && (
                <p className="text-sm text-slate-500 italic">&ldquo;{program.supervisor_requirement_text}&rdquo;</p>
              )}
              {(program.supervisor_status === "required" || program.supervisor_status === "recommended") && (
                <Link href={`/supervisors?program=${program.id}`}>
                  <Button size="sm">Find Compatible Supervisors</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                Funding & Fees
                {tuition && <FieldVerificationBadge status={tuition.verification_status} />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {tuition ? (
                <InfoRow label="Tuition (intl./year)" value={formatCurrency(tuition.amount)} />
              ) : (
                <p className="text-slate-500">Tuition not listed.</p>
              )}
              {program.application_fee != null && program.application_fee > 0 ? (
                <InfoRow label="Application fee" value={formatCurrency(program.application_fee)} />
              ) : (
                <InfoRow label="Application fee" value="Free" />
              )}
              {program.fee_waiver_available && (
                <div className="text-sm text-green-800 bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="font-medium">Fee waiver may be available</p>
                  {program.fee_waiver_notes && <p className="mt-1">{program.fee_waiver_notes}</p>}
                </div>
              )}
              <p className="text-xs text-slate-500 pt-1">
                Fees are charged by the school&apos;s application portal. This app displays verified fee information only — no payments are processed here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Deadlines</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {program.deadlines?.length ? program.deadlines.map((d) => (
                <div key={d.id} className="flex justify-between items-start gap-2 text-sm">
                  <div>
                    <span className="text-slate-600">{d.intake}</span>
                    <span className="font-medium ml-2">{formatDate(d.deadline_date)}</span>
                  </div>
                  <FieldVerificationBadge status={d.verification_status} />
                </div>
              )) : (
                <p className="text-sm text-slate-500">No deadlines listed.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Required application documents</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {requiredDocuments.length ? requiredDocuments.map((doc) => (
                <div key={doc.id} className="text-sm border border-slate-100 rounded-lg p-3">
                  <p className="font-medium text-slate-800">{doc.title}</p>
                  <p className="text-xs text-slate-500">{DOCUMENT_TYPE_LABELS[doc.doc_type]}</p>
                  {doc.description && <p className="text-slate-600 mt-1">{doc.description}</p>}
                </div>
              )) : (
                <p className="text-sm text-slate-500">Document requirements not yet catalogued for this program.</p>
              )}
              <p className="text-xs text-slate-500 pt-2">
                Add this program to your tracker to build a checklist and link documents from your vault.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Preparation checklist (reference)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {getDefaultChecklistItems(program, supervisorInfo.classification).map((item) => (
                <div key={item.title} className="flex gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5" disabled />
                  <div>
                    <p className={`font-medium ${item.is_required ? "text-red-800" : "text-slate-700"}`}>{item.title}</p>
                    <p className="text-slate-500 text-xs">{item.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {(program.official_admissions_url || program.source_url) && (
            <Card>
              <CardHeader><CardTitle>Official sources</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {program.official_admissions_url && (
                  <a
                    href={program.official_admissions_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-red-700 hover:underline font-medium"
                  >
                    Official admissions portal <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {program.source_url && program.source_url !== program.official_admissions_url && (
                  <a
                    href={program.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-red-700 hover:underline"
                  >
                    Program source page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function getRequirementByCategory(
  program: Awaited<ReturnType<typeof getProgramById>>,
  category: string,
  titleIncludes?: string
) {
  return program?.requirements?.find(
    (r) =>
      r.category === category &&
      (!titleIncludes || r.title.toLowerCase().includes(titleIncludes.toLowerCase()))
  );
}

function FactBlock({
  title,
  status,
  content,
}: {
  title: string;
  status: VerificationStatus;
  content?: string;
}) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-slate-50 text-sm">
      <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">{title}</p>
          <FieldVerificationBadge status={status} />
        </div>
        {content && <p className="text-slate-500">{content}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800 capitalize">{value}</p>
    </div>
  );
}

function RequirementRow({
  check,
}: {
  check: { id: string; title: string; status: string; message: string };
}) {
  const Icon = check.status === "green" ? CheckCircle2 : check.status === "red" ? XCircle : AlertTriangle;
  const color = check.status === "green" ? "text-green-600" : check.status === "red" ? "text-red-600" : "text-yellow-600";

  return (
    <div className="flex gap-3 p-3 rounded-lg border border-slate-100">
      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
      <div>
        <p className="font-medium text-sm text-slate-900">{check.title}</p>
        <p className="text-sm text-slate-500">{check.message}</p>
      </div>
    </div>
  );
}
