import type {
  Program,
  ProgramRequirement,
  StudentProfile,
  SupervisorClassification,
  SupervisorStatus,
  Tuition,
} from "@/types/database";

export function classifySupervisorStatus(
  status: SupervisorStatus,
  requirementText?: string | null
): SupervisorClassification {
  if (status === "required") return "SUPERVISOR_REQUIRED";
  if (status === "recommended") return "RECOMMENDED";
  if (status === "not_required") return "NOT_REQUIRED";

  if (requirementText) {
    const text = requirementText.toLowerCase();
    if (
      text.includes("must secure") ||
      text.includes("must obtain") ||
      text.includes("required prior") ||
      text.includes("mandatory") ||
      text.includes("must have a confirmed supervisor")
    ) {
      return "SUPERVISOR_REQUIRED";
    }
    if (
      text.includes("strongly encouraged") ||
      text.includes("recommended") ||
      text.includes("should identify") ||
      text.includes("encouraged to identify")
    ) {
      return "RECOMMENDED";
    }
    if (
      text.includes("no supervisor") ||
      text.includes("not required") ||
      text.includes("no faculty supervisor")
    ) {
      return "NOT_REQUIRED";
    }
  }

  return "UNKNOWN_VERIFY";
}

export function getSupervisorActionLabel(
  classification: SupervisorClassification
): string {
  switch (classification) {
    case "SUPERVISOR_REQUIRED":
      return "Action Required: Secure a supervisor before applying";
    case "RECOMMENDED":
      return "Recommended: Identify a potential supervisor";
    case "NOT_REQUIRED":
      return "No supervisor required for this program";
    case "UNKNOWN_VERIFY":
      return "Verify supervisor requirements with the institution";
  }
}

export function getSupervisorPriority(
  classification: SupervisorClassification
): "high" | "medium" | "low" | "none" {
  switch (classification) {
    case "SUPERVISOR_REQUIRED":
      return "high";
    case "RECOMMENDED":
      return "medium";
    case "UNKNOWN_VERIFY":
      return "medium";
    case "NOT_REQUIRED":
      return "none";
  }
}

export function shouldExcludeProgram(
  classification: SupervisorClassification,
  excludeSupervisorRequired: boolean
): boolean {
  return (
    excludeSupervisorRequired && classification === "SUPERVISOR_REQUIRED"
  );
}

export function normalizeResearchArea(area: string): string {
  return area.toLowerCase().trim();
}

export function findSharedInterests(
  studentInterests: string[] | null | undefined,
  supervisorAreas: string[] | null | undefined
): string[] {
  if (!studentInterests?.length || !supervisorAreas?.length) return [];

  const normalizedStudent = studentInterests.map(normalizeResearchArea);
  const shared: string[] = [];

  for (const area of supervisorAreas) {
    const normalized = normalizeResearchArea(area);
    const match = normalizedStudent.some(
      (interest) =>
        normalized.includes(interest) ||
        interest.includes(normalized) ||
        levenshteinSimilarity(interest, normalized) > 0.7
    );
    if (match) shared.push(area);
  }

  return shared;
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[a.length][b.length];
  return 1 - distance / maxLen;
}

export function scoreSupervisorCompatibility(
  studentInterests: string[] | null | undefined,
  supervisorAreas: string[] | null | undefined,
  acceptingStudents: boolean
): { score: number; reasoning: string[]; sharedInterests: string[] } {
  const reasoning: string[] = [];
  let score = 0;

  if (!acceptingStudents) {
    reasoning.push("This supervisor is not currently accepting new students.");
    return { score: 0, reasoning, sharedInterests: [] };
  }

  const shared = findSharedInterests(studentInterests, supervisorAreas);

  if (shared.length > 0) {
    const interestScore = Math.min(100, shared.length * 30 + 40);
    score += interestScore * 0.7;
    reasoning.push(
      `Shared research interests: ${shared.join(", ")} — appears compatible with your profile.`
    );
  } else if (studentInterests?.length && supervisorAreas?.length) {
    score += 20;
    reasoning.push(
      "No direct research interest overlap found, but areas may be adjacent — review supervisor profile."
    );
  } else {
    reasoning.push(
      "Add research interests to your profile for better supervisor matching."
    );
  }

  score += 30;
  reasoning.push("Supervisor is listed as accepting students (DEMO data — verify independently).");

  return {
    score: Math.min(100, Math.round(score)),
    reasoning,
    sharedInterests: shared,
  };
}

export interface ProgramSupervisorInfo {
  program: Program;
  classification: SupervisorClassification;
  actionLabel: string;
  priority: "high" | "medium" | "low" | "none";
}

export function analyzeProgramSupervisorRequirement(
  program: Program
): ProgramSupervisorInfo {
  const classification = classifySupervisorStatus(
    program.supervisor_status,
    program.supervisor_requirement_text
  );
  return {
    program,
    classification,
    actionLabel: getSupervisorActionLabel(classification),
    priority: getSupervisorPriority(classification),
  };
}

export function generateSupervisorEmailDraft(params: {
  studentName: string;
  programName: string;
  schoolName: string;
  supervisorName: string;
  researchInterests: string[];
  sharedInterests: string[];
}): string {
  const { studentName, programName, schoolName, supervisorName, researchInterests, sharedInterests } = params;

  const interestText =
    sharedInterests.length > 0
      ? sharedInterests.join(", ")
      : researchInterests.slice(0, 3).join(", ");

  return `Subject: Inquiry Regarding Supervision — ${programName} at ${schoolName}

Dear ${supervisorName},

My name is ${studentName}, and I am an international student exploring graduate study opportunities in Canada. I am writing to inquire about potential supervision for the ${programName} program at ${schoolName}.

My research interests include ${interestText}. Based on your published work${sharedInterests.length > 0 ? ` in ${sharedInterests[0]}` : ""}, your research appears compatible with my academic background and goals.

I would appreciate learning whether you are considering new graduate students for the upcoming intake, and whether my profile might align with your current research directions.

Please find below a brief summary of my background:
- [Your degree and institution]
- [Your GPA and relevant coursework]
- [Brief description of research or project experience]

I understand that this inquiry does not constitute an application or any commitment. I would be grateful for any guidance you could provide.

Thank you for your time and consideration.

Sincerely,
${studentName}

---
DISCLAIMER: This is an AI-generated draft for your review. Sending this email does NOT imply the professor has agreed to supervise you. Always personalize and verify all details before sending.`;
}

export function getDefaultChecklistItems(
  program: Program,
  classification: SupervisorClassification
): { title: string; description: string; is_required: boolean; sort_order: number }[] {
  const items = [
    {
      title: "Review official program requirements",
      description: "Verify all requirements on the institution's official website.",
      is_required: true,
      sort_order: 1,
    },
    {
      title: "Prepare transcripts",
      description: "Obtain official transcripts from all post-secondary institutions.",
      is_required: true,
      sort_order: 2,
    },
    {
      title: "Language test scores",
      description: program.english_requirement || "Submit valid English proficiency test results.",
      is_required: true,
      sort_order: 3,
    },
    {
      title: "Statement of Purpose",
      description: "Draft and review your statement of purpose/personal statement.",
      is_required: true,
      sort_order: 4,
    },
    {
      title: "Letters of recommendation",
      description: "Request 2-3 academic or professional references.",
      is_required: true,
      sort_order: 5,
    },
  ];

  if (classification === "SUPERVISOR_REQUIRED") {
    items.unshift({
      title: "ACTION REQUIRED: Secure faculty supervisor",
      description:
        "Contact potential supervisors and obtain a commitment letter before applying.",
      is_required: true,
      sort_order: 0,
    });
  } else if (classification === "RECOMMENDED") {
    items.push({
      title: "Identify potential supervisor",
      description: "Research faculty members and reach out to discuss research fit.",
      is_required: false,
      sort_order: 6,
    });
  } else if (classification === "UNKNOWN_VERIFY") {
    items.unshift({
      title: "ACTION REQUIRED: Verify supervisor requirements",
      description: "Contact the department to confirm whether a supervisor is needed.",
      is_required: true,
      sort_order: 0,
    });
  }

  if (program.application_fee && program.application_fee > 0) {
    items.push({
      title: "Pay application fee",
      description: `Application fee: $${program.application_fee} CAD (DEMO — verify official amount).`,
      is_required: true,
      sort_order: 7,
    });
  }

  return items;
}
