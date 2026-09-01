import type { Program, StudentProfile } from "@/types/database";

export type CrossDisciplinaryClass =
  | "direct_match"
  | "related_match"
  | "interdisciplinary_match"
  | "weak_match"
  | "unknown";

export type FitCategory = "strong_fit" | "target" | "reach" | "low_fit" | "unknown";

export const FIT_CATEGORY_LABELS: Record<FitCategory, string> = {
  strong_fit: "Strong Fit",
  target: "Target",
  reach: "Reach",
  low_fit: "Low Fit",
  unknown: "Unknown",
};

export const CROSS_DISCIPLINARY_LABELS: Record<CrossDisciplinaryClass, string> = {
  direct_match: "Direct Match",
  related_match: "Related Match",
  interdisciplinary_match: "Interdisciplinary Match",
  weak_match: "Weak Match",
  unknown: "Unknown",
};

const CS_FIELDS = ["computer", "software", "data science", "cybersecurity", "information technology", "ai", "machine learning", "bioinformatics"];
const BIO_FIELDS = ["biology", "microbiology", "biochemistry", "biotechnology", "genetics", "immunology", "biomedical", "life science", "food science"];

export function classifyCrossDisciplinary(
  profile: StudentProfile | null,
  program: Program
): { classification: CrossDisciplinaryClass; explanation: string } {
  if (!profile) {
    return { classification: "unknown", explanation: "Complete your profile for field compatibility analysis." };
  }

  const programField = program.field.toLowerCase();
  const major = (profile.major || "").toLowerCase();
  const interests = [
    ...(profile.research_interests || []),
    ...(profile.secondary_interests as string[] || []),
    profile.desired_field || "",
  ].map((s) => s.toLowerCase());

  const isBioProgram = BIO_FIELDS.some((f) => programField.includes(f));
  const isCsProgram = CS_FIELDS.some((f) => programField.includes(f));
  const studentBio = BIO_FIELDS.some((f) => major.includes(f) || interests.some((i) => i.includes(f)));
  const studentCs = CS_FIELDS.some((f) => major.includes(f) || interests.some((i) => i.includes(f)));

  if (programField.includes(major) || major.includes(programField.split(" ")[0])) {
    return { classification: "direct_match", explanation: "Your academic background appears directly aligned with this program field." };
  }

  if (isBioProgram && studentBio) {
    return { classification: "related_match", explanation: "Your biological sciences background appears related to this program." };
  }

  if (isCsProgram && studentCs) {
    return { classification: "related_match", explanation: "Your computing background appears related to this program." };
  }

  if ((isBioProgram && studentCs) || (isCsProgram && studentBio) || programField.includes("bioinformatics")) {
    return {
      classification: "interdisciplinary_match",
      explanation:
        "This appears to be an interdisciplinary program. Your background may cover part of the requirements, but additional prerequisites may apply — confirm with the department.",
    };
  }

  const related = interests.some((i) => programField.includes(i) || i.includes(programField.split(" ")[0]));
  if (related) {
    return { classification: "related_match", explanation: "Your stated interests appear related, but your primary degree may not directly match." };
  }

  return {
    classification: "weak_match",
    explanation: "Your background may not closely align with this program field. Review prerequisites carefully before applying.",
  };
}

export function scoreToFitCategory(score: number, hasRedRequirements: boolean): FitCategory {
  if (hasRedRequirements) return "low_fit";
  if (score >= 85) return "strong_fit";
  if (score >= 72) return "target";
  if (score >= 60) return "reach";
  if (score >= 45) return "low_fit";
  return "unknown";
}

export function admissionAssessmentLabel(score: number): string {
  if (score >= 85) return "VERY STRONG";
  if (score >= 75) return "STRONG";
  if (score >= 65) return "MODERATE";
  if (score >= 55) return "REACH";
  if (score >= 40) return "LOW COMPATIBILITY";
  return "UNKNOWN";
}
