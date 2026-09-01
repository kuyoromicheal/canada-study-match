import type {
  ActionItem,
  ApplicationChecklistItem,
  MatchResult,
  ProgramRequiredDocument,
  ProgramWithDetails,
  RequirementCheck,
  StudentProfile,
} from "@/types/database";
import { isContactProfileComplete } from "@/lib/validation/contact";
import { enrichDeadlines, type DeadlineWithUrgency } from "@/lib/matching/deadlines";
import {
  admissionAssessmentLabel,
  classifyCrossDisciplinary,
  FIT_CATEGORY_LABELS,
  scoreToFitCategory,
  type CrossDisciplinaryClass,
  type FitCategory,
} from "@/lib/matching/fit-assessment";
import { matchPrerequisites, type PrerequisiteMatchResult } from "@/lib/matching/prerequisite-matcher";
import { analyzeProgramSupervisorRequirement } from "@/lib/matching/supervisor-detection";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";

export type EligibilityStatus = "green" | "yellow" | "red" | "grey";

export interface EligibilityItem {
  id: string;
  title: string;
  status: EligibilityStatus;
  summary: string;
  detail: string;
  sourceUrl?: string | null;
}

export interface DocumentTierItem {
  id: string;
  title: string;
  docType: string;
  tier: "required" | "recommended" | "if_applicable" | "not_required";
  description?: string | null;
  sourceUrl?: string | null;
}

export interface CostLineItem {
  label: string;
  amount: number | null;
  currency: string;
  note?: string;
  verificationStatus?: string;
  sourceUrl?: string | null;
}

export interface ApplicationStep {
  step: number;
  title: string;
  description: string;
}

export interface ReadinessItem {
  label: string;
  complete: boolean;
  required: boolean;
}

export interface ProgramDetailAnalysis {
  fitCategory: FitCategory;
  fitLabel: string;
  crossDisciplinary: CrossDisciplinaryClass;
  crossDisciplinaryExplanation: string;
  admissionAssessment: string;
  eligibilityItems: EligibilityItem[];
  prerequisiteMatch: PrerequisiteMatchResult;
  documentTiers: DocumentTierItem[];
  deadlines: DeadlineWithUrgency[];
  costLines: CostLineItem[];
  firstYearEstimate: number | null;
  actionItems: ActionItem[];
  confirmQuestions: string[];
  applicationSteps: ApplicationStep[];
  readinessPercent: number;
  readinessItems: ReadinessItem[];
  readinessLabel: string;
  whyMatches: string[];
  profileGaps: string[];
  programTypeExplanation: string;
}

function mapCheckStatus(status: RequirementCheck["status"]): EligibilityStatus {
  if (status === "green") return "green";
  if (status === "red") return "red";
  if (status === "yellow") return "yellow";
  return "grey";
}

function buildDocumentTiers(docs: ProgramRequiredDocument[]): DocumentTierItem[] {
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    docType: DOCUMENT_TYPE_LABELS[d.doc_type] || d.doc_type,
    tier: d.is_required ? "required" : "recommended",
    description: d.description,
    sourceUrl: null,
  }));
}

function buildWhyMatches(profile: StudentProfile | null, program: ProgramWithDetails): string[] {
  if (!profile) return ["Complete your profile to see personalized match explanations."];
  const reasons: string[] = [];
  if (profile.major && program.field.toLowerCase().includes(profile.major.toLowerCase())) {
    reasons.push(`Your ${profile.major} background is closely related to this program's ${program.field} field.`);
  }
  if (profile.final_year_project) {
    reasons.push(`Your final-year project ("${profile.final_year_project.slice(0, 80)}${profile.final_year_project.length > 80 ? "…" : ""}") may be relevant to this program's research areas.`);
  }
  if (profile.research_interests?.length) {
    reasons.push(`Your research interests (${profile.research_interests.slice(0, 3).join(", ")}) may align with this program.`);
  }
  if (profile.relevant_courses?.length) {
    reasons.push(`You have listed ${profile.relevant_courses.length} relevant course(s) that may support prerequisite requirements.`);
  }
  if (!reasons.length) {
    reasons.push("Review the requirements section to see how your profile compares to published criteria.");
  }
  return reasons;
}

function buildProfileGaps(profile: StudentProfile | null, program: ProgramWithDetails): string[] {
  const gaps: string[] = [];
  if (!profile) {
    gaps.push("Profile not completed");
    return gaps;
  }
  if (!profile.gpa) gaps.push("GPA not provided");
  if (!profile.language_test_score && !profile.english_instruction_language) gaps.push("English test score missing");
  if (!profile.relevant_courses?.length && program.prerequisites?.length) gaps.push("Relevant courses not listed — prerequisite matching limited");
  if (program.supervisor_status === "required") gaps.push("Supervisor required — contact potential supervisors");
  if (!isContactProfileComplete(profile)) gaps.push("Contact information incomplete for application packages");
  if (profile.gpa && program.min_gpa && profile.gpa_scale) {
    const norm = (profile.gpa / profile.gpa_scale) * 4;
    const minNorm = (program.min_gpa / (program.gpa_scale || 4)) * 4;
    if (norm < minNorm) gaps.push("GPA may be below published minimum — verify international equivalency");
  }
  return gaps;
}

function buildConfirmQuestions(
  profile: StudentProfile | null,
  program: ProgramWithDetails,
  prereq: PrerequisiteMatchResult
): string[] {
  const q: string[] = [];
  if (profile?.citizenship_country && profile.citizenship_country !== "Canada") {
    q.push(`Does my ${profile.highest_qualification || "degree"} from ${profile.citizenship_country} satisfy the equivalent bachelor's requirement?`);
    q.push("Does my GPA meet the department's international-equivalent standard?");
  }
  if (profile?.english_instruction_language) {
    q.push("Does my previous degree satisfy the English-language requirement?");
  }
  if (program.supervisor_status === "required" || program.supervisor_status === "recommended") {
    q.push("Is supervisor approval required before I submit my application?");
    q.push("Must supervisor confirmation be uploaded with the application?");
  }
  if (prereq.missing.length) {
    q.push(`Are the following prerequisites flexible or can equivalent courses substitute: ${prereq.missing.join(", ")}?`);
  }
  if (program.funding_notes) {
    q.push("Is funding available for international students in this program?");
  }
  const nextIntake = program.intakes?.[0];
  if (nextIntake) q.push(`Are applications currently open for ${nextIntake}?`);
  return q;
}

function buildApplicationSteps(program: ProgramWithDetails): ApplicationStep[] {
  const sup = analyzeProgramSupervisorRequirement(program);
  const steps: ApplicationStep[] = [
    { step: 1, title: "Confirm eligibility", description: "Review published requirements and verify your qualifications with the department if needed." },
  ];
  let n = 2;
  if (sup.classification === "SUPERVISOR_REQUIRED" || sup.classification === "RECOMMENDED") {
    steps.push({ step: n++, title: "Identify potential supervisors", description: "Review faculty research areas and shortlist professors whose work aligns with yours." });
    steps.push({ step: n++, title: "Contact supervisors", description: "Send a professional inquiry email. Do not assume approval until confirmed in writing." });
  }
  steps.push(
    { step: n++, title: "Prepare documents", description: "Gather transcripts, CV, statements, test scores, and reference letters as required." },
    { step: n++, title: "Create university application account", description: "Register on the official admissions portal — link provided below." },
    { step: n++, title: "Complete application form", description: "Fill in all sections accurately using your prepared materials." },
    { step: n++, title: "Upload documents", description: "Upload required files in the formats specified by the university." },
  );
  if (program.application_fee != null && program.application_fee > 0) {
    steps.push({ step: n++, title: "Pay application fee", description: `Application fee: ${program.application_fee} CAD (paid on the university portal).` });
  }
  steps.push(
    { step: n++, title: "Submit application", description: "Review everything carefully before final submission on the official portal." },
    { step: n++, title: "Track application", description: "Monitor your email and the portal for updates. Use this app's tracker to stay organized." },
  );
  return steps;
}

function programTypeExplanation(program: ProgramWithDetails): string {
  switch (program.program_type) {
    case "thesis":
      return "A thesis-based program typically requires original research, a faculty supervisor, and a thesis defense. Supervisor matching is usually important.";
    case "course_based":
      return "A course-based program focuses on coursework and may include a capstone or project. A supervisor is often not required.";
    case "coop":
      return "A co-op program combines academic study with work placements. Check work permit and co-op eligibility separately.";
    case "mixed":
      return "This program combines coursework and research components. Review whether a supervisor is required for the research portion.";
    default:
      return "Review the official program page for structure details.";
  }
}

function buildReadiness(
  profile: StudentProfile | null,
  docs: DocumentTierItem[],
  checklist: ApplicationChecklistItem[] | undefined,
  program: ProgramWithDetails
): { percent: number; items: ReadinessItem[]; label: string } {
  const items: ReadinessItem[] = [];
  const contactComplete = profile ? isContactProfileComplete(profile) : false;
  items.push({ label: "Contact profile complete", complete: contactComplete, required: true });

  if (profile?.gpa) items.push({ label: "GPA on profile", complete: true, required: false });
  else items.push({ label: "GPA on profile", complete: false, required: false });

  const requiredDocs = docs.filter((d) => d.tier === "required");
  for (const doc of requiredDocs.slice(0, 6)) {
    const linked = checklist?.some((c) => c.title === doc.title && c.linked_document_id);
    items.push({ label: doc.title, complete: Boolean(linked), required: true });
  }

  if (program.supervisor_status === "required") {
    items.push({ label: "Supervisor confirmation", complete: false, required: true });
  }

  const requiredItems = items.filter((i) => i.required);
  const done = requiredItems.filter((i) => i.complete).length;
  const percent = requiredItems.length ? Math.round((done / requiredItems.length) * 100) : 0;
  const label = percent >= 100 ? "READY TO PREPARE SUBMISSION" : "Not ready to submit yet";
  return { percent, items, label };
}

export function analyzeProgramDetail(
  program: ProgramWithDetails,
  profile: StudentProfile | null,
  matchResult?: MatchResult,
  checklist?: ApplicationChecklistItem[]
): ProgramDetailAnalysis {
  const checks = matchResult?.requirementChecks || [];
  const hasRed = checks.some((c) => c.status === "red");
  const score = matchResult?.score ?? 0;
  const fitCategory = scoreToFitCategory(score, hasRed);
  const cross = classifyCrossDisciplinary(profile, program);
  const prereq = matchPrerequisites(program, profile);
  const docs = buildDocumentTiers(program.required_documents || []);
  const deadlines = enrichDeadlines(program.deadlines || []);
  const supervisorInfo = analyzeProgramSupervisorRequirement(program);

  const eligibilityItems: EligibilityItem[] = checks.map((c) => ({
    id: c.id,
    title: c.title,
    status: mapCheckStatus(c.status),
    summary: c.message.split(".")[0] + ".",
    detail: c.message,
    sourceUrl: c.source_url,
  }));

  if (supervisorInfo.classification === "SUPERVISOR_REQUIRED") {
    eligibilityItems.push({
      id: "supervisor",
      title: "Supervisor",
      status: "red",
      summary: "Supervisor required before or during application.",
      detail: supervisorInfo.actionLabel,
      sourceUrl: program.source_url,
    });
  }

  const tuition = program.tuition?.find((t) => t.period === "year");
  const costLines: CostLineItem[] = [];
  if (program.application_fee != null) {
    costLines.push({
      label: "Application fee",
      amount: program.application_fee,
      currency: "CAD",
      note: program.fee_waiver_available ? `Fee waiver may be available: ${program.fee_waiver_notes || ""}` : undefined,
      sourceUrl: program.official_admissions_url || program.source_url,
    });
  }
  if (tuition) {
    costLines.push({
      label: "Tuition (international, per year)",
      amount: tuition.amount,
      currency: tuition.currency,
      verificationStatus: tuition.verification_status,
      sourceUrl: tuition.source_url,
    });
  }

  const firstYearEstimate =
    (program.application_fee ?? 0) + (tuition?.amount ?? 0);

  const readiness = buildReadiness(profile, docs, checklist, program);

  return {
    fitCategory,
    fitLabel: FIT_CATEGORY_LABELS[fitCategory],
    crossDisciplinary: cross.classification,
    crossDisciplinaryExplanation: cross.explanation,
    admissionAssessment: admissionAssessmentLabel(score),
    eligibilityItems,
    prerequisiteMatch: prereq,
    documentTiers: docs,
    deadlines,
    costLines,
    firstYearEstimate: firstYearEstimate || null,
    actionItems: matchResult?.actionItems || [],
    confirmQuestions: buildConfirmQuestions(profile, program, prereq),
    applicationSteps: buildApplicationSteps(program),
    readinessPercent: readiness.percent,
    readinessItems: readiness.items,
    readinessLabel: readiness.label,
    whyMatches: buildWhyMatches(profile, program),
    profileGaps: buildProfileGaps(profile, program),
    programTypeExplanation: programTypeExplanation(program),
  };
}
