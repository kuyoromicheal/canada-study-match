import type { ProgramWithDetails, VerificationStatus } from "@/types/database";

export function getRequirementByCategory(
  program: ProgramWithDetails,
  category: string,
  titleIncludes?: string
) {
  return program.requirements?.find(
    (r) =>
      r.category === category &&
      (!titleIncludes || r.title.toLowerCase().includes(titleIncludes.toLowerCase()))
  );
}

export function getGpaVerificationStatus(program: ProgramWithDetails): VerificationStatus {
  const row = getRequirementByCategory(program, "Academic", "gpa");
  if (row) return row.verification_status;
  if (program.min_gpa != null) return "needs_verification";
  return "needs_verification";
}

export function getEnglishVerificationStatus(program: ProgramWithDetails): VerificationStatus {
  const row = getRequirementByCategory(program, "Language");
  if (row) return row.verification_status;
  if (program.english_requirement) return "needs_verification";
  return "needs_verification";
}

export function getSupervisorVerificationStatus(program: ProgramWithDetails): VerificationStatus {
  const row = getRequirementByCategory(program, "Supervisor");
  if (row) return row.verification_status;
  return "needs_verification";
}

export function getPrerequisiteVerificationStatus(
  req: { verification_status: VerificationStatus }
): VerificationStatus {
  return req.verification_status;
}

export const VERIFIABLE_FIELD_OPTIONS = [
  {
    id: "program_listing",
    label: "Program listing (name, degree level, program type, intakes)",
  },
  { id: "gpa", label: "Minimum GPA requirement" },
  { id: "english", label: "English language requirement" },
  { id: "supervisor", label: "Supervisor requirement status" },
  { id: "deadlines", label: "Application deadlines" },
  { id: "tuition", label: "Tuition & fees" },
  { id: "prerequisites", label: "Prerequisites & other requirements" },
] as const;

export type VerifiableFieldId = (typeof VERIFIABLE_FIELD_OPTIONS)[number]["id"];
