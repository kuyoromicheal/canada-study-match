/**
 * Verifies package readiness logic against representative program checklists.
 * Run: npx tsx scripts/verify-package-readiness.ts
 */
import { buildChecklistFromProgram } from "../lib/applications/checklist-from-program";
import { getPackageReadiness } from "../lib/applications/package-readiness";
import { analyzeProgramSupervisorRequirement } from "../lib/matching/supervisor-detection";
import type { ApplicationChecklistItem, ProgramWithDetails, StudentProfile } from "../types/database";

const completeProfile = {
  id: "test",
  user_id: "test",
  full_name: "Test Student",
  phone_number: "+1234567890",
  mailing_street: "1 Main St",
  mailing_city: "Toronto",
  mailing_province_state: "ON",
  mailing_postal_code: "M5V 1A1",
  mailing_country: "CA",
  citizenship_country: "NG",
  current_country: "NG",
  age: 24,
  email: "test@test.com",
  highest_qualification: "bachelors_degree",
  major: "Microbiology",
  language_test_type: "ielts_academic",
  language_test_score: 7,
  english_instruction_language: false,
  desired_qualification: "masters_degree",
  field_category: "biological_biomedical_sciences",
  preferred_institution_type: null,
  desired_field: "Microbiology",
  degree_name: null,
  university: null,
  graduation_year: 2024,
  gpa: 3.5,
  gpa_scale: 4,
  degree_classification: null,
  relevant_courses: null,
  final_year_project: null,
  research_interests: null,
  work_experience: null,
  years_of_experience: null,
  desired_program_type: "thesis",
  preferred_intake: "fall",
  preferred_provinces: null,
  excluded_provinces: null,
  max_tuition: null,
  max_application_fee: null,
  prioritize_fee_free: false,
  exclude_supervisor_required: false,
  prefer_thesis: true,
  is_international_student: true,
  study_permit_required: true,
  prefer_international_friendly: true,
  prefer_pgwp_eligible: true,
  onboarding_completed: true,
  profile_completeness: 80,
  created_at: "",
  updated_at: "",
} satisfies StudentProfile;

/** Three real-style programs with different required_documents (mirrors DB seed). */
const programs: ProgramWithDetails[] = [
  {
    id: "prog-ubc-micro",
    school_id: "school-ubc",
    name: "MSc Microbiology",
    slug: "ubc-msc-micro",
    field: "Microbiology",
    degree_level: "master",
    program_type: "thesis",
    description: "",
    duration_months: 24,
    province: "British Columbia",
    city: "Vancouver",
    international_eligible: true,
    pgwp_eligible: true,
    supervisor_status: "required",
    supervisor_requirement_text: null,
    application_fee: 168,
    min_gpa: 3.0,
    gpa_scale: 4,
    english_requirement: "IELTS 7.0",
    prerequisites: [],
    intakes: ["Fall 2026"],
    is_demo_record: false,
    verification_status: "verified",
    source_url: "https://example.com",
    last_verified_at: null,
    created_at: "",
    updated_at: "",
    school: { id: "school-ubc", name: "University of British Columbia", slug: "ubc", province: "British Columbia", city: "Vancouver", website_url: null, official_admissions_url: "https://grad.ubc.ca", institution_type: "university", is_demo_record: false, verification_status: "verified", source_url: null, last_verified_at: null, created_at: "", updated_at: "" },
    required_documents: [
      { id: "d1", program_id: "prog-ubc-micro", doc_type: "transcript", title: "Official transcripts", description: null, is_required: true, sort_order: 1, verification_status: "verified", created_at: "", updated_at: "" },
      { id: "d2", program_id: "prog-ubc-micro", doc_type: "english_test_report", title: "English proficiency test", description: null, is_required: true, sort_order: 2, verification_status: "verified", created_at: "", updated_at: "" },
      { id: "d3", program_id: "prog-ubc-micro", doc_type: "statement_of_purpose", title: "Statement of purpose", description: null, is_required: true, sort_order: 3, verification_status: "verified", created_at: "", updated_at: "" },
      { id: "d4", program_id: "prog-ubc-micro", doc_type: "research_proposal", title: "Research proposal", description: null, is_required: true, sort_order: 4, verification_status: "verified", created_at: "", updated_at: "" },
    ],
  },
  {
    id: "prog-toronto-cs",
    school_id: "school-uoft",
    name: "MSc Computer Science",
    slug: "uoft-msc-cs",
    field: "Computer Science",
    degree_level: "master",
    program_type: "thesis",
    description: "",
    duration_months: 24,
    province: "Ontario",
    city: "Toronto",
    international_eligible: true,
    pgwp_eligible: true,
    supervisor_status: "required",
    supervisor_requirement_text: null,
    application_fee: 120,
    min_gpa: 3.3,
    gpa_scale: 4,
    english_requirement: "IELTS 7.0",
    prerequisites: [],
    intakes: ["Fall 2026"],
    is_demo_record: false,
    verification_status: "verified",
    source_url: "https://example.com",
    last_verified_at: null,
    created_at: "",
    updated_at: "",
    school: { id: "school-uoft", name: "University of Toronto", slug: "uoft", province: "Ontario", city: "Toronto", website_url: null, official_admissions_url: "https://www.sgs.utoronto.ca", institution_type: "university", is_demo_record: false, verification_status: "verified", source_url: null, last_verified_at: null, created_at: "", updated_at: "" },
    required_documents: [
      { id: "d5", program_id: "prog-toronto-cs", doc_type: "transcript", title: "Official transcripts", description: null, is_required: true, sort_order: 1, verification_status: "verified", created_at: "", updated_at: "" },
      { id: "d6", program_id: "prog-toronto-cs", doc_type: "english_test_report", title: "English proficiency test", description: null, is_required: true, sort_order: 2, verification_status: "verified", created_at: "", updated_at: "" },
      { id: "d7", program_id: "prog-toronto-cs", doc_type: "resume", title: "CV / Resume", description: null, is_required: true, sort_order: 3, verification_status: "verified", created_at: "", updated_at: "" },
    ],
  },
  {
    id: "prog-mcgill-mba",
    school_id: "school-mcgill",
    name: "MBA",
    slug: "mcgill-mba",
    field: "Business",
    degree_level: "master",
    program_type: "course_based",
    description: "",
    duration_months: 20,
    province: "Quebec",
    city: "Montreal",
    international_eligible: true,
    pgwp_eligible: true,
    supervisor_status: "not_required",
    supervisor_requirement_text: null,
    application_fee: 150,
    min_gpa: 3.0,
    gpa_scale: 4,
    english_requirement: "IELTS 6.5",
    prerequisites: [],
    intakes: ["Fall 2026"],
    is_demo_record: false,
    verification_status: "verified",
    source_url: "https://example.com",
    last_verified_at: null,
    created_at: "",
    updated_at: "",
    school: { id: "school-mcgill", name: "McGill University", slug: "mcgill", province: "Quebec", city: "Montreal", website_url: null, official_admissions_url: "https://www.mcgill.ca/gradapplicants", institution_type: "university", is_demo_record: false, verification_status: "verified", source_url: null, last_verified_at: null, created_at: "", updated_at: "" },
    required_documents: [
      { id: "d8", program_id: "prog-mcgill-mba", doc_type: "transcript", title: "Official transcripts", description: null, is_required: true, sort_order: 1, verification_status: "verified", created_at: "", updated_at: "" },
      { id: "d9", program_id: "prog-mcgill-mba", doc_type: "reference_letter", title: "Reference letters", description: null, is_required: true, sort_order: 2, verification_status: "verified", created_at: "", updated_at: "" },
      { id: "d10", program_id: "prog-mcgill-mba", doc_type: "statement_of_purpose", title: "Statement of purpose", description: null, is_required: true, sort_order: 3, verification_status: "verified", created_at: "", updated_at: "" },
    ],
  },
];

function toChecklist(program: ProgramWithDetails): ApplicationChecklistItem[] {
  const classification = analyzeProgramSupervisorRequirement(program).classification;
  return buildChecklistFromProgram(program, classification).map((item, i) => ({
    id: `item-${i}`,
    application_id: "app",
    user_id: "user",
    title: item.title,
    description: item.description,
    is_completed: false,
    is_required: item.is_required,
    due_date: null,
    sort_order: item.sort_order,
    linked_document_id: null,
    required_document_id: item.required_document_id,
    doc_type: item.doc_type,
    created_at: "",
  }));
}

console.log("Package readiness verification (3 programs)\n");
console.log("Bulk batch limit: unlimited (all selected programs in one action)\n");

for (const program of programs) {
  const school = program.school?.name || program.name;
  const checklist = toChecklist(program);
  const readiness = getPackageReadiness(checklist, completeProfile, school);

  console.log(`--- ${program.name} (${school}) ---`);
  console.log(`Status: ${readiness.status === "ready" ? "Ready to submit" : "Missing items"}`);
  console.log(`Missing (${readiness.missingItems.length}):`);
  readiness.missingItems.forEach((m) => console.log(`  • ${m}`));
  console.log("");
}

// Partial vault: transcript linked for all — IELTS still blocks UBC + Toronto
const partialChecklist = toChecklist(programs[0]).map((item) =>
  item.doc_type === "transcript" ? { ...item, linked_document_id: "doc-transcript", is_completed: true } : item
);
const partial = getPackageReadiness(partialChecklist, completeProfile, "University of British Columbia");
console.log("--- UBC with transcript linked only ---");
console.log(`Status: ${partial.status === "ready" ? "Ready to submit" : "Missing items"}`);
console.log(`Still missing: ${partial.missingItems.join("; ")}`);
