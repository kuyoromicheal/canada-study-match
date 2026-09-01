import {
  getCountryLabel,
  getFieldCategoryLabel,
  getOptionLabel,
  LANGUAGE_TEST_OPTIONS,
  QUALIFICATION_OPTIONS,
} from "@/lib/constants/form-options";
import type { ApplicationChecklistItem, ProgramWithDetails, StudentProfile } from "@/types/database";

export function buildApplicationDataSummary(
  profile: StudentProfile,
  program: ProgramWithDetails,
  checklist: ApplicationChecklistItem[]
): string {
  const school = program.school?.name || "University";
  const lines: string[] = [
    `APPLICATION DATA SUMMARY — ${program.name}`,
    school,
    "",
    "PERSONAL INFORMATION",
    `Full name: ${profile.full_name || "—"}`,
    `Email: ${profile.email || "—"}`,
    `Phone: ${profile.phone_number || "—"}`,
    `Citizenship: ${getCountryLabel(profile.citizenship_country) || "—"}`,
    `Country of residence: ${getCountryLabel(profile.current_country) || "—"}`,
    profile.age ? `Age: ${profile.age}` : "",
    profile.mailing_street
      ? `Mailing address: ${[
          profile.mailing_street,
          profile.mailing_city,
          profile.mailing_province_state,
          profile.mailing_postal_code,
          getCountryLabel(profile.mailing_country),
        ]
          .filter(Boolean)
          .join(", ")}`
      : "",
    "",
    "ACADEMIC BACKGROUND",
    `Highest qualification: ${getOptionLabel(QUALIFICATION_OPTIONS, profile.highest_qualification) || profile.highest_qualification || "—"}`,
    `Degree: ${profile.degree_name || "—"}`,
    `Institution: ${profile.university || "—"}`,
    profile.graduation_year ? `Graduation year: ${profile.graduation_year}` : "",
    profile.gpa != null ? `GPA: ${profile.gpa} (scale ${profile.gpa_scale ?? 4})` : "",
    profile.degree_classification ? `Classification: ${profile.degree_classification}` : "",
    `Major / field: ${profile.major || "—"}`,
    profile.relevant_courses?.length
      ? `Relevant courses: ${profile.relevant_courses.join(", ")}`
      : "",
    profile.final_year_project ? `Final year project: ${profile.final_year_project}` : "",
    profile.research_interests?.length
      ? `Research interests: ${profile.research_interests.join(", ")}`
      : "",
    profile.work_experience ? `Work experience: ${profile.work_experience}` : "",
    profile.years_of_experience != null
      ? `Years of experience: ${profile.years_of_experience}`
      : "",
    "",
    "ENGLISH PROFICIENCY",
    profile.language_test_type
      ? `Test: ${getOptionLabel(LANGUAGE_TEST_OPTIONS, profile.language_test_type) || profile.language_test_type}`
      : "Test: —",
    profile.language_test_score != null
      ? `Score: ${profile.language_test_score}`
      : "",
    profile.english_instruction_language
      ? "Previous degree taught in English: Yes"
      : "",
    "",
    "STUDY PREFERENCES",
    profile.desired_qualification
      ? `Desired qualification: ${getOptionLabel(QUALIFICATION_OPTIONS, profile.desired_qualification) || profile.desired_qualification}`
      : "",
    profile.field_category
      ? `Field category: ${getFieldCategoryLabel(profile.field_category)}`
      : profile.desired_field
        ? `Desired field: ${profile.desired_field}`
        : "",
    profile.desired_program_type
      ? `Program type preference: ${profile.desired_program_type.replace("_", " ")}`
      : "",
    profile.preferred_intake ? `Preferred intake: ${profile.preferred_intake}` : "",
    "",
    "PROGRAM CHECKLIST ITEMS",
    ...checklist.map((item) => {
      const status = item.linked_document_id
        ? "document linked in vault"
        : item.is_completed
          ? "completed"
          : item.is_required
            ? "required — not complete"
            : "optional";
      return `• ${item.title} [${status}]`;
    }),
    "",
    "SUBMISSION REMINDER",
    `Copy the information above into ${school}'s official application portal.`,
    program.official_admissions_url
      ? `Official portal: ${program.official_admissions_url}`
      : program.source_url
        ? `Program source: ${program.source_url}`
        : "Find the official admissions URL on the university website.",
    "",
    "This app prepares your materials only — it cannot submit applications on your behalf.",
  ];

  return lines.filter((line) => line !== "").join("\n");
}
