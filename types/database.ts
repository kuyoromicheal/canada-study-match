export type VerificationStatus =
  | "verified"
  | "partially_verified"
  | "needs_verification";

export type SupervisorStatus =
  | "required"
  | "recommended"
  | "not_required"
  | "unknown_verify";

export type SupervisorClassification =
  | "SUPERVISOR_REQUIRED"
  | "RECOMMENDED"
  | "NOT_REQUIRED"
  | "UNKNOWN_VERIFY";

export type ProgramType = "thesis" | "course_based" | "coop" | "mixed";

export type DegreeLevel =
  | "certificate"
  | "diploma"
  | "bachelor"
  | "master"
  | "phd"
  | "postdoc";

export type ApplicationStatus =
  | "researching"
  | "preparing"
  | "submitted"
  | "interview"
  | "offer_received"
  | "rejected"
  | "withdrawn";

export type RequirementCheckStatus = "green" | "yellow" | "red";

export type MatchTier =
  | "excellent"
  | "strong"
  | "possible"
  | "needs_review"
  | "poor";

export interface VerifiableRecord {
  is_demo_record: boolean;
  verification_status: VerificationStatus;
  source_url: string | null;
  last_verified_at: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "student" | "admin";
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  citizenship_country: string | null;
  current_country: string | null;
  age: number | null;
  email: string | null;
  highest_qualification: string | null;
  degree_name: string | null;
  university: string | null;
  graduation_year: number | null;
  gpa: number | null;
  gpa_scale: number | null;
  degree_classification: string | null;
  major: string | null;
  relevant_courses: string[] | null;
  final_year_project: string | null;
  research_interests: string[] | null;
  work_experience: string | null;
  years_of_experience: number | null;
  language_test_type: string | null;
  language_test_score: number | null;
  english_instruction_language: boolean;
  desired_qualification: string | null;
  desired_field: string | null;
  desired_program_type: ProgramType | null;
  preferred_intake: string | null;
  preferred_provinces: string[] | null;
  excluded_provinces: string[] | null;
  max_tuition: number | null;
  max_application_fee: number | null;
  prioritize_fee_free: boolean;
  exclude_supervisor_required: boolean;
  prefer_thesis: boolean | null;
  is_international_student: boolean;
  study_permit_required: boolean;
  prefer_international_friendly: boolean;
  prefer_pgwp_eligible: boolean;
  onboarding_completed: boolean;
  profile_completeness: number;
  created_at: string;
  updated_at: string;
}

export interface School extends VerifiableRecord {
  id: string;
  name: string;
  slug: string;
  province: string;
  city: string;
  website_url: string | null;
  description: string | null;
  institution_type?: "university" | "college" | "polytechnic" | null;
  external_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type SourceType =
  | "university_official"
  | "ai_extracted_unverified"
  | "manual"
  | "directory_listing";

export interface Program extends VerifiableRecord {
  id: string;
  school_id: string;
  name: string;
  slug: string;
  field: string;
  degree_level: DegreeLevel;
  program_type: ProgramType;
  description: string | null;
  duration_months: number | null;
  province: string;
  city: string;
  international_eligible: boolean;
  pgwp_eligible: boolean;
  supervisor_status: SupervisorStatus;
  supervisor_requirement_text: string | null;
  application_fee: number | null;
  min_gpa: number | null;
  gpa_scale: number | null;
  english_requirement: string | null;
  prerequisites: string[] | null;
  intakes: string[] | null;
  source_type?: SourceType | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramRequest {
  id: string;
  user_id: string | null;
  school_name: string;
  program_name: string;
  field: string | null;
  province: string | null;
  notes: string | null;
  status: "pending" | "in_progress" | "fulfilled" | "declined";
  request_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramRequirement extends VerifiableRecord {
  id: string;
  program_id: string;
  category: string;
  title: string;
  description: string | null;
  is_mandatory: boolean;
  created_at: string;
}

export interface ApplicationDeadline extends VerifiableRecord {
  id: string;
  program_id: string;
  intake: string;
  deadline_date: string;
  deadline_type: string;
  notes: string | null;
  created_at: string;
}

export interface Tuition extends VerifiableRecord {
  id: string;
  program_id: string;
  amount: number;
  currency: string;
  period: string;
  student_type: string;
  created_at: string;
}

export interface Supervisor extends VerifiableRecord {
  id: string;
  school_id: string;
  name: string;
  title: string | null;
  department: string | null;
  email: string | null;
  profile_url: string | null;
  research_areas: string[] | null;
  accepting_students: boolean;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramSupervisor extends VerifiableRecord {
  id: string;
  program_id: string;
  supervisor_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface SavedProgram {
  id: string;
  user_id: string;
  program_id: string;
  match_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface ApplicationTracker {
  id: string;
  user_id: string;
  program_id: string;
  status: ApplicationStatus;
  target_intake: string | null;
  deadline_date: string | null;
  notes: string | null;
  match_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationChecklistItem {
  id: string;
  application_id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  is_required: boolean;
  due_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface AIGeneratedContent {
  id: string;
  user_id: string;
  content_type: string;
  entity_type: string | null;
  entity_id: string | null;
  prompt_summary: string | null;
  generated_content: string;
  disclaimer: string;
  created_at: string;
}

export interface RequirementCheck {
  id: string;
  category: string;
  title: string;
  status: RequirementCheckStatus;
  message: string;
  source_url?: string | null;
}

export interface ScoreBreakdownItem {
  factor: string;
  score: number;
  maxScore: number;
  weight: number;
  notes: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
}

export interface MatchResult {
  programId: string;
  score: number;
  tier: MatchTier;
  tierLabel: string;
  summary: string;
  requirementChecks: RequirementCheck[];
  actionItems: ActionItem[];
  scoreBreakdown: ScoreBreakdownItem[];
  supervisorClassification: SupervisorClassification;
  disclaimer: string;
}

export interface ProgramWithDetails extends Program {
  school?: School;
  requirements?: ProgramRequirement[];
  deadlines?: ApplicationDeadline[];
  tuition?: Tuition[];
  supervisors?: (Supervisor & { is_primary?: boolean })[];
  matchResult?: MatchResult;
}

export interface SupervisorMatchResult {
  supervisor: Supervisor;
  compatibilityScore: number;
  reasoning: string[];
  sharedInterests: string[];
}

export interface ProgramFilters {
  province?: string;
  city?: string;
  field?: string;
  degree?: DegreeLevel;
  intake?: string;
  maxTuition?: number;
  maxFee?: number;
  minGpa?: number;
  supervisorRequirement?: SupervisorStatus;
  programType?: ProgramType;
  internationalEligible?: boolean;
  minMatchScore?: number;
  search?: string;
  includeDemo?: boolean;
  includeUnverified?: boolean;
}

export const MATCH_TIER_LABELS: Record<MatchTier, string> = {
  excellent: "Excellent Match",
  strong: "Strong Match",
  possible: "Possible Match",
  needs_review: "Needs Review",
  poor: "Poor Match",
};

export const MATCH_DISCLAIMER =
  "Match scores are indicative only and based on published requirements. They do not guarantee admission.";

export function scoreToTier(score: number): MatchTier {
  if (score >= 90) return "excellent";
  if (score >= 80) return "strong";
  if (score >= 70) return "possible";
  if (score >= 60) return "needs_review";
  return "poor";
}

export function tierToLabel(tier: MatchTier): string {
  return MATCH_TIER_LABELS[tier];
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  researching: "Researching",
  preparing: "Preparing",
  submitted: "Submitted",
  interview: "Interview",
  offer_received: "Offer Received",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const SUPERVISOR_STATUS_LABELS: Record<SupervisorStatus, string> = {
  required: "Supervisor Required",
  recommended: "Supervisor Recommended",
  not_required: "No Supervisor Required",
  unknown_verify: "Supervisor Status Unknown — Verify",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  verified: "Verified",
  partially_verified: "Partially Verified",
  needs_verification: "Needs Verification",
};

export type StudentProfileInput = Partial<
  Omit<StudentProfile, "id" | "user_id" | "created_at" | "updated_at">
>;

export const PROFILE_FIELDS_WEIGHT: Record<string, number> = {
  full_name: 5,
  citizenship_country: 5,
  current_country: 5,
  email: 5,
  highest_qualification: 8,
  degree_name: 5,
  university: 5,
  graduation_year: 5,
  gpa: 10,
  major: 8,
  research_interests: 8,
  language_test_type: 8,
  language_test_score: 8,
  desired_qualification: 8,
  desired_field: 8,
  preferred_intake: 5,
  preferred_provinces: 5,
};

export function calculateProfileCompleteness(
  profile: Partial<StudentProfile>
): number {
  let filled = 0;
  let total = 0;
  for (const [field, weight] of Object.entries(PROFILE_FIELDS_WEIGHT)) {
    total += weight;
    const value = profile[field as keyof StudentProfile];
    if (value !== null && value !== undefined && value !== "") {
      if (Array.isArray(value) && value.length === 0) continue;
      filled += weight;
    }
  }
  return Math.round((filled / total) * 100);
}
