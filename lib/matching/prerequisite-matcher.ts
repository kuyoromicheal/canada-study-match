import type { Program, StudentProfile } from "@/types/database";

export interface PrerequisiteMatchResult {
  required: string[];
  matched: string[];
  missing: string[];
  matchRatio: string;
  status: "green" | "yellow" | "red" | "grey";
  message: string;
}

function normalizeCourse(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function courseMatches(required: string, studentCourses: string[], major: string): boolean {
  const req = normalizeCourse(required);
  if (!req) return false;
  if (normalizeCourse(major).includes(req) || req.includes(normalizeCourse(major))) return true;
  return studentCourses.some((c) => {
    const sc = normalizeCourse(c);
    return sc.includes(req) || req.includes(sc) || levenshteinSimilar(sc, req) > 0.75;
  });
}

function levenshteinSimilar(a: string, b: string): number {
  if (!a || !b) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const distance = levenshtein(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

export function matchPrerequisites(
  program: Program,
  profile: StudentProfile | null
): PrerequisiteMatchResult {
  const required = (program.prerequisites || []).filter(Boolean);
  if (!required.length) {
    return {
      required: [],
      matched: [],
      missing: [],
      matchRatio: "—",
      status: "grey",
      message: "No specific prerequisite courses are listed for this program.",
    };
  }

  if (!profile) {
    return {
      required,
      matched: [],
      missing: required,
      matchRatio: `0/${required.length}`,
      status: "grey",
      message: "Add your relevant courses to your profile to check prerequisites.",
    };
  }

  const studentCourses = profile.relevant_courses || [];
  const major = profile.major || "";
  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of required) {
    if (courseMatches(req, studentCourses, major)) matched.push(req);
    else missing.push(req);
  }

  const ratio = `${matched.length}/${required.length}`;
  let status: PrerequisiteMatchResult["status"] = "green";
  let message = `You appear to match ${ratio} listed prerequisites.`;

  if (matched.length === required.length) {
    message = `All ${required.length} listed prerequisites appear satisfied based on your profile.`;
  } else if (matched.length >= required.length * 0.5) {
    status = "yellow";
    message = `${ratio} prerequisites matched. Missing courses may affect eligibility — confirm with the department.`;
  } else if (matched.length > 0) {
    status = "orange" as PrerequisiteMatchResult["status"];
    message = `Only ${ratio} prerequisites matched. This may affect your eligibility.`;
  } else {
    status = "red";
    message = `No listed prerequisites appear in your profile. Confirm requirements with the university.`;
  }

  // Fix orange not in type - use yellow for partial
  if ((status as string) === "orange") status = "yellow";

  return { required, matched, missing, matchRatio: ratio, status, message };
}
