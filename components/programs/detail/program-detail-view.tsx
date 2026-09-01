import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { PreparationDisclaimer } from "@/components/applications/preparation-disclaimer";
import { FieldVerificationBadge, ProgramLevelBadge } from "@/components/programs/field-verification-badge";
import { EligibilityList } from "@/components/programs/detail/eligibility-list";
import { ConfirmQuestionsPanel } from "@/components/programs/detail/interactive-panels";
import { ProgramHeaderActions } from "@/components/programs/detail/program-header-actions";
import { ProgramDocumentGenerator } from "@/components/programs/detail/program-document-generator";
import { AssistantChatPanel } from "@/components/assistant/assistant-chat-panel";
import { SupervisorEmailSendPanel } from "@/components/gmail/supervisor-email-send";
import { StickyApplyBar } from "@/components/programs/detail/sticky-apply-bar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { analyzeProgramSupervisorRequirement } from "@/lib/matching/supervisor-detection";
import { urgencyLabel } from "@/lib/matching/deadlines";
import type { ProgramDetailAnalysis } from "@/lib/matching/program-detail-analysis";
import { CROSS_DISCIPLINARY_LABELS } from "@/lib/matching/fit-assessment";
import {
  MATCH_DISCLAIMER,
  SUPERVISOR_STATUS_LABELS,
  type MatchResult,
  type ProgramWithDetails,
  type RequirementCheck,
  type SupervisorMatchResult,
} from "@/types/database";

interface Props {
  program: ProgramWithDetails;
  analysis: ProgramDetailAnalysis;
  matchResult?: MatchResult;
  supervisorMatches: SupervisorMatchResult[];
  admissionsUrl: string | null;
  hasProfile: boolean;
}

export function ProgramDetailView({
  program,
  analysis,
  matchResult,
  supervisorMatches,
  admissionsUrl,
  hasProfile,
}: Props) {
  const supervisorInfo = analyzeProgramSupervisorRequirement(program);
  const requiredDocs = analysis.documentTiers.filter((d) => d.tier === "required");
  const recommendedDocs = analysis.documentTiers.filter((d) => d.tier === "recommended");

  const urgencyColors: Record<string, string> = {
    green: "text-green-700 bg-green-50 border-green-200",
    yellow: "text-yellow-800 bg-yellow-50 border-yellow-200",
    orange: "text-orange-800 bg-orange-50 border-orange-200",
    red: "text-red-800 bg-red-50 border-red-200",
    expired: "text-slate-600 bg-slate-100 border-slate-200",
    unknown: "text-slate-600 bg-slate-50 border-slate-200",
  };

  return (
    <>
      <div className="pb-20 lg:pb-0 space-y-6">
        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <ProgramLevelBadge isDemo={program.is_demo_record} verificationStatus={program.verification_status} />
                <Badge className="capitalize">{program.degree_level.replace("_", " ")}</Badge>
                <Badge className="capitalize">{program.program_type.replace("_", "-")}</Badge>
            {program.international_eligible && <Badge variant="success">International students accepted</Badge>}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">{program.school?.name}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{program.name}</h1>
              <p className="text-slate-600">
                {[program.city, program.province].filter(Boolean).join(", ")}
                {program.campus ? ` · ${program.campus}` : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 pt-1">
                {program.duration_months && <span>{program.duration_months} months</span>}
                {program.delivery_mode && <span className="capitalize">{program.delivery_mode}</span>}
                {program.study_mode && <span className="capitalize">{program.study_mode}</span>}
                {program.intakes?.length ? <span>Intake: {program.intakes.join(", ")}</span> : null}
              </div>
            </div>

            {matchResult && (
              <div className="rounded-xl border-2 border-red-100 bg-red-50/50 p-5 min-w-[220px] text-center lg:text-left">
                <p className="text-xs uppercase tracking-wide text-slate-500">Match score</p>
                <p className="text-4xl font-bold text-red-700">{matchResult.score}%</p>
                <p className="text-sm font-semibold text-slate-800">{matchResult.tierLabel}</p>
                <p className="text-xs text-slate-500 mt-1">Estimated compatibility based on published requirements.</p>
                <Progress value={matchResult.score} className="mt-3" />
              </div>
            )}
          </div>

          <ProgramHeaderActions
            programId={program.id}
            admissionsUrl={admissionsUrl}
            matchScore={matchResult?.score}
            programName={program.name}
          />
        </section>

        {!hasProfile && (
          <Alert variant="warning" title="Profile required">
            <Link href="/onboarding" className="text-red-700 underline font-medium">Complete your profile</Link>{" "}
            to unlock personalized eligibility, document checklists, and match analysis.
          </Alert>
        )}

        <Alert variant="warning" title="Not guaranteed admission">
          {MATCH_DISCLAIMER} Completing preparation checklists does not guarantee admission.
        </Alert>

        {analysis.profileGaps.length > 0 && hasProfile && (
          <Card className="border-yellow-200 bg-yellow-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-700" />
                Profile gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-slate-700">
                {analysis.profileGaps.map((g) => (
                  <li key={g}>⚠ {g}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {supervisorInfo.priority === "high" && (
          <Alert variant="error" title="Supervisor required before application">
            {supervisorInfo.actionLabel}
            {program.supervisor_requirement_text && (
              <p className="mt-2 text-sm italic">&ldquo;{program.supervisor_requirement_text}&rdquo;</p>
            )}
          </Alert>
        )}

        <PreparationDisclaimer admissionsUrl={admissionsUrl} />

        {/* Fit + eligibility row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Realistic admission assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{analysis.fitLabel}</Badge>
                <Badge>{CROSS_DISCIPLINARY_LABELS[analysis.crossDisciplinary]}</Badge>
              </div>
              <p className="text-sm font-medium text-slate-800">{analysis.admissionAssessment}</p>
              <p className="text-xs text-slate-500">Profile compatibility estimate — NOT a probability of admission.</p>
              <p className="text-sm text-slate-600">{analysis.crossDisciplinaryExplanation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-slate-900">{analysis.readinessPercent}%</p>
                <p className="text-sm text-slate-600 pb-1">{analysis.readinessLabel}</p>
              </div>
              <Progress value={analysis.readinessPercent} />
              <ul className="text-sm space-y-1">
                {analysis.readinessItems.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                    )}
                    <span className={item.complete ? "text-slate-700" : "text-slate-500"}>
                      {item.label}{item.required ? " (required)" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Eligibility */}
            <Card>
              <CardHeader><CardTitle className="text-base">Your eligibility</CardTitle></CardHeader>
              <CardContent>
                <EligibilityList items={analysis.eligibilityItems} />
              </CardContent>
            </Card>

            {/* Why you match */}
            {hasProfile && (
              <Card>
                <CardHeader><CardTitle className="text-base">Why this program matches you</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
                    {analysis.whyMatches.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Match breakdown */}
            {matchResult && (
              <Card>
                <CardHeader><CardTitle className="text-base">Match breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {matchResult.scoreBreakdown.map((item) => (
                    <div key={item.factor} className="flex items-center justify-between text-sm gap-4">
                      <span className="text-slate-700">{item.factor}</span>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={Math.round((item.score / item.maxScore) * 100)} className="flex-1 h-2" />
                        <span className="text-slate-500 w-10 text-right">{Math.round((item.score / item.maxScore) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader><CardTitle className="text-base">What you need to apply</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <DocumentTier title="Required" docs={requiredDocs} empty="No required documents catalogued yet — verify on the official application page." />
                {recommendedDocs.length > 0 && <DocumentTier title="Recommended" docs={recommendedDocs} />}
                <p className="text-xs text-slate-500">
                  Only documents listed in our verified catalog are shown. Always confirm the full list on the university application portal.
                </p>
              </CardContent>
            </Card>

            {/* Prerequisites */}
            {(program.prerequisites?.length || analysis.prerequisiteMatch.required.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Prerequisite course matching</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium">
                    {analysis.prerequisiteMatch.matchRatio} prerequisites matched
                  </p>
                  <p className="text-sm text-slate-600">{analysis.prerequisiteMatch.message}</p>
                  {analysis.prerequisiteMatch.matched.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Matched</p>
                      <ul className="text-sm space-y-1">
                        {analysis.prerequisiteMatch.matched.map((c) => (
                          <li key={c} className="text-green-700">✓ {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.prerequisiteMatch.missing.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Missing or unconfirmed</p>
                      <ul className="text-sm space-y-1">
                        {analysis.prerequisiteMatch.missing.map((c) => (
                          <li key={c} className="text-red-700">✗ {c}</li>
                        ))}
                      </ul>
                      <p className="text-sm text-slate-600 mt-2">
                        This may affect your eligibility. Confirm with the department before applying.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Supervisor */}
            <Card className={supervisorInfo.priority === "high" ? "border-red-200" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  Supervisor requirement
                  <Badge variant={program.supervisor_status === "required" ? "danger" : program.supervisor_status === "not_required" ? "success" : "warning"}>
                    {SUPERVISOR_STATUS_LABELS[program.supervisor_status]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-700">{supervisorInfo.actionLabel}</p>
                {program.supervisor_requirement_text && (
                  <blockquote className="text-sm text-slate-600 border-l-4 border-slate-200 pl-3 italic">
                    {program.supervisor_requirement_text}
                  </blockquote>
                )}
                {supervisorMatches.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-800">Find supervisors</p>
                    {supervisorMatches.slice(0, 5).map(({ supervisor, compatibilityScore, sharedInterests }) => (
                      <div key={supervisor.id} className="border border-slate-100 rounded-lg p-4 space-y-2">
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">{supervisor.name}</p>
                            {supervisor.department && <p className="text-xs text-slate-500">{supervisor.department}</p>}
                          </div>
                          <Badge>{compatibilityScore}% compatibility</Badge>
                        </div>
                        {supervisor.research_areas?.length ? (
                          <p className="text-sm text-slate-600">
                            Research: {supervisor.research_areas.slice(0, 4).join("; ")}
                          </p>
                        ) : null}
                        {sharedInterests.length > 0 && (
                          <p className="text-xs text-green-700">Shared interests: {sharedInterests.join(", ")}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {supervisor.profile_url && (
                            <a href={supervisor.profile_url} target="_blank" rel="noopener noreferrer" className="text-sm text-red-700 underline">
                              View profile
                            </a>
                          )}
                          {supervisor.email && (
                            <span className="text-sm text-slate-500">{supervisor.email}</span>
                          )}
                        </div>
                        <SupervisorEmailSendPanel
                          supervisorId={supervisor.id}
                          supervisorName={supervisor.name}
                          supervisorEmail={supervisor.email}
                          programId={program.id}
                          programName={program.name}
                          schoolName={program.school?.name || "University"}
                        />
                      </div>
                    ))}
                    <Link href={`/supervisors?program=${program.id}`} className="text-sm text-red-700 underline">
                      View all supervisors for this program
                    </Link>
                  </div>
                ) : (
                  <Link href={`/supervisors?program=${program.id}`}>
                    <span className="text-sm text-red-700 underline">Search supervisors</span>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Requirements table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Admission requirements</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-3">Requirement</th>
                      <th className="py-2 pr-3">University</th>
                      <th className="py-2 pr-3">Your profile</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchResult?.requirementChecks || []).map((check) => (
                      <RequirementTableRow key={check.id} check={check} />
                    ))}
                    {program.min_gpa != null && (
                      <tr className="border-b border-slate-50">
                        <td className="py-2 pr-3 font-medium">Minimum GPA</td>
                        <td className="py-2 pr-3">{program.min_gpa}/{program.gpa_scale ?? 4}</td>
                        <td className="py-2 pr-3">See profile</td>
                        <td className="py-2"><StatusDot status={matchResult?.requirementChecks.find((c) => c.title.toLowerCase().includes("gpa"))?.status || "yellow"} /></td>
                      </tr>
                    )}
                    {program.english_requirement && (
                      <tr className="border-b border-slate-50">
                        <td className="py-2 pr-3 font-medium">English</td>
                        <td className="py-2 pr-3">{program.english_requirement}</td>
                        <td className="py-2 pr-3">See profile</td>
                        <td className="py-2"><StatusDot status="yellow" /></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Application process */}
            <Card>
              <CardHeader><CardTitle className="text-base">Application process</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {analysis.applicationSteps.map((step) => (
                    <li key={step.step} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-800 text-sm font-bold">
                        {step.step}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{step.title}</p>
                        <p className="text-sm text-slate-600">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <ConfirmQuestionsPanel questions={analysis.confirmQuestions} />

            <ProgramDocumentGenerator programId={program.id} programName={program.name} />
            <AssistantChatPanel programId={program.id} programName={program.name} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Program type */}
            <Card>
              <CardHeader><CardTitle className="text-base">Program type</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <Badge className="capitalize">{program.program_type.replace("_", "-")}</Badge>
                <p className="text-slate-600">{analysis.programTypeExplanation}</p>
              </CardContent>
            </Card>

            {/* Deadlines */}
            <Card>
              <CardHeader><CardTitle className="text-base">Deadlines</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {program.application_opens && (
                  <DeadlineRow label="Application opens" date={program.application_opens} />
                )}
                {analysis.deadlines.length ? analysis.deadlines.map((d) => (
                  <div key={d.id} className={`rounded-lg border p-3 text-sm ${urgencyColors[d.urgency]}`}>
                    <p className="font-medium">{d.deadline_type || "Application deadline"} — {d.intake}</p>
                    <p>{formatDate(d.deadline_date)}</p>
                    {d.daysLeft != null ? (
                      <p className="font-semibold mt-1">
                        {d.urgency === "expired" ? "Expired" : `${d.daysLeft} days left`}
                      </p>
                    ) : (
                      <p className="text-xs mt-1">{urgencyLabel(d.urgency)}</p>
                    )}
                    <FieldVerificationBadge status={d.verification_status} />
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No deadlines catalogued — verify on official site.</p>
                )}
              </CardContent>
            </Card>

            {/* Costs */}
            <Card>
              <CardHeader><CardTitle className="text-base">Estimated application cost</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {analysis.costLines.map((line) => (
                  <div key={line.label} className="flex justify-between gap-2">
                    <span className="text-slate-600">{line.label}</span>
                    <span className="font-medium">
                      {line.amount != null ? formatCurrency(line.amount, line.currency) : "Unknown"}
                    </span>
                  </div>
                ))}
                {analysis.firstYearEstimate != null && (
                  <div className="flex justify-between gap-2 pt-2 border-t font-semibold">
                    <span>First-year estimate</span>
                    <span>{formatCurrency(analysis.firstYearEstimate)}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 pt-2">
                  Costs can change. Verify current fees on the official university website. Estimates only — not living expenses.
                </p>
              </CardContent>
            </Card>

            {/* Action center */}
            {analysis.actionItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">What you should do next</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {analysis.actionItems.map((item) => (
                    <div key={item.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <Badge variant={item.priority === "high" ? "danger" : item.priority === "medium" ? "warning" : "default"}>
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mt-1">{item.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* International student check */}
            <Card>
              <CardHeader><CardTitle className="text-base">International student check</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <InfoRow label="International students accepted" value={program.international_eligible ? "Yes" : program.international_eligible === false ? "No" : "Unknown — verify"} />
                <InfoRow label="PGWP (catalogued)" value={program.pgwp_eligible ? "Listed as eligible" : "Not listed / verify"} />
                {program.dli_number && <InfoRow label="DLI number" value={program.dli_number} />}
                {program.study_permit_info_url && (
                  <SourceLink href={program.study_permit_info_url} label="Study permit information" />
                )}
                {program.pgwp_info_url && (
                  <SourceLink href={program.pgwp_info_url} label="PGWP information" />
                )}
                {program.international_student_notes && (
                  <p className="text-slate-600 text-xs">{program.international_student_notes}</p>
                )}
                <p className="text-xs text-slate-500 pt-1">
                  Immigration outcomes are not guaranteed. Verify requirements with IRCC and the institution.
                </p>
              </CardContent>
            </Card>

            {/* Official sources */}
            <Card>
              <CardHeader><CardTitle className="text-base">Official sources</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {admissionsUrl && <SourceLink href={admissionsUrl} label="Application portal" />}
                {program.source_url && program.source_url !== admissionsUrl && (
                  <SourceLink href={program.source_url} label="Program page" />
                )}
                {program.school?.website_url && (
                  <SourceLink href={program.school.website_url} label="University website" />
                )}
                {program.last_verified_at && (
                  <p className="text-xs text-slate-500 pt-2">
                    Last verified: {formatDate(program.last_verified_at)}
                  </p>
                )}
                {program.verification_status === "needs_verification" && (
                  <p className="text-xs text-yellow-700">⚠ Some information needs verification before applying.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <StickyApplyBar admissionsUrl={admissionsUrl} programName={program.name} />
    </>
  );
}

function DocumentTier({
  title,
  docs,
  empty,
}: {
  title: string;
  docs: { id: string; title: string; docType: string; description?: string | null }[];
  empty?: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800 mb-2">{title}</p>
      {docs.length ? (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="text-sm border border-slate-100 rounded-lg p-3">
              <p className="font-medium">{d.title}</p>
              <p className="text-xs text-slate-500">{d.docType}</p>
              {d.description && <p className="text-slate-600 mt-1">{d.description}</p>}
            </li>
          ))}
        </ul>
      ) : empty ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : null}
    </div>
  );
}

function RequirementTableRow({ check }: { check: RequirementCheck }) {
  return (
    <tr className="border-b border-slate-50">
      <td className="py-2 pr-3 font-medium">{check.title}</td>
      <td className="py-2 pr-3 text-slate-600">{check.message.split(".")[0]}</td>
      <td className="py-2 pr-3 text-slate-500">—</td>
      <td className="py-2"><StatusDot status={check.status} /></td>
    </tr>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "green" ? "text-green-600" : status === "red" ? "text-red-600" : "text-yellow-600";
  const label = status === "green" ? "Match" : status === "red" ? "Action required" : "Verify";
  return <span className={`text-xs font-medium ${color}`}>{label}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}

function DeadlineRow({ label, date }: { label: string; date: string }) {
  return (
    <div className="text-sm">
      <p className="text-slate-500">{label}</p>
      <p className="font-medium">{formatDate(date)}</p>
    </div>
  );
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-red-700 hover:underline">
      {label} <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
