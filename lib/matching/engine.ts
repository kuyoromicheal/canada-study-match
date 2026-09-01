import type {
  ActionItem,
  ApplicationDeadline,
  MatchResult,
  Program,
  ProgramRequirement,
  RequirementCheck,
  ScoreBreakdownItem,
  StudentProfile,
  Tuition,
} from "@/types/database";
import {
  MATCH_DISCLAIMER,
  scoreToTier,
  tierToLabel,
} from "@/types/database";
import {
  analyzeProgramSupervisorRequirement,
  classifySupervisorStatus,
  shouldExcludeProgram,
} from "./supervisor-detection";

interface MatchInput {
  program: Program;
  requirements?: ProgramRequirement[];
  tuition?: Tuition[];
  deadlines?: ApplicationDeadline[];
}

function normalizeGpa(gpa: number, scale: number): number {
  return (gpa / scale) * 4.0;
}

function parseIeltsRequirement(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/IELTS\s+([\d.]+)/i);
  return match ? parseFloat(match[1]) : null;
}

function scoreDegreeCompatibility(
  profile: StudentProfile,
  program: Program
): ScoreBreakdownItem {
  const maxScore = 15;
  let score = 0;
  let notes = "";

  const desiredQual = profile.desired_qualification?.toLowerCase() || "";
  const desiredField = profile.desired_field?.toLowerCase() || "";
  const programField = program.field.toLowerCase();
  const programLevel = program.degree_level;

  const levelMap: Record<string, string[]> = {
    master: ["master", "master's", "msc", "ma", "meng", "mba"],
    phd: ["phd", "doctorate", "doctoral"],
    bachelor: ["bachelor", "undergraduate"],
    diploma: ["diploma"],
    certificate: ["certificate", "graduate certificate"],
  };

  const matchingLevels = Object.entries(levelMap).find(([level]) => {
    if (programLevel !== level) return false;
    return levelMap[level].some((l) => desiredQual.includes(l));
  });

  if (matchingLevels) {
    score += 8;
    notes = "Degree level appears compatible.";
  } else if (desiredQual) {
    score += 3;
    notes = "Degree level may differ from your preference — review carefully.";
  } else {
    notes = "Add desired qualification to improve matching.";
  }

  if (desiredField && (programField.includes(desiredField) || desiredField.includes(programField.split(" ")[0]))) {
    score += 7;
    notes += " Field of study aligns with your preferences.";
  } else if (profile.major) {
    const major = profile.major.toLowerCase();
    if (programField.includes(major) || major.includes(programField.split(" ")[0])) {
      score += 5;
      notes += " Your major appears related to this program field.";
    } else {
      score += 1;
      notes += " Field may not directly match your background.";
    }
  }

  return { factor: "Degree & Field Compatibility", score, maxScore, weight: 15, notes };
}

function scoreGpa(
  profile: StudentProfile,
  program: Program
): { breakdown: ScoreBreakdownItem; check: RequirementCheck } {
  const maxScore = 20;
  let score = 0;
  let status: RequirementCheck["status"] = "yellow";
  let message = "";

  if (!profile.gpa) {
    return {
      breakdown: { factor: "GPA", score: 0, maxScore, weight: 20, notes: "Add your GPA to enable GPA matching." },
      check: { id: "gpa", category: "Academic", title: "GPA Requirement", status: "yellow", message: "Your GPA is not provided." },
    };
  }

  const normalizedGpa = normalizeGpa(profile.gpa, profile.gpa_scale || 4.0);
  const minGpa = program.min_gpa ? normalizeGpa(program.min_gpa, program.gpa_scale || 4.0) : 2.5;

  if (normalizedGpa >= minGpa + 0.3) {
    score = maxScore;
    status = "green";
    message = `Your GPA (${profile.gpa}/${profile.gpa_scale}) appears to meet or exceed the published minimum (${program.min_gpa}/${program.gpa_scale}).`;
  } else if (normalizedGpa >= minGpa) {
    score = maxScore * 0.75;
    status = "green";
    message = `Your GPA meets the published minimum requirement.`;
  } else if (normalizedGpa >= minGpa - 0.2) {
    score = maxScore * 0.4;
    status = "yellow";
    message = `Your GPA is slightly below the published minimum — consider strengthening other application components.`;
  } else {
    score = maxScore * 0.1;
    status = "red";
    message = `Your GPA appears below the published minimum requirement.`;
  }

  return {
    breakdown: { factor: "GPA", score, maxScore, weight: 20, notes: message },
    check: { id: "gpa", category: "Academic", title: "GPA Requirement", status, message, source_url: program.source_url },
  };
}

function scoreEnglish(
  profile: StudentProfile,
  program: Program
): { breakdown: ScoreBreakdownItem; check: RequirementCheck } {
  const maxScore = 15;
  let score = 0;
  let status: RequirementCheck["status"] = "yellow";
  let message = "";

  if (profile.english_instruction_language && !profile.language_test_score) {
    score = maxScore * 0.8;
    status = "green";
    message = "English was your language of instruction — may satisfy requirements (verify with institution).";
  } else if (profile.language_test_score) {
    const required = parseIeltsRequirement(program.english_requirement);
    if (required) {
      if (profile.language_test_score >= required) {
        score = maxScore;
        status = "green";
        message = `Your ${profile.language_test_type} score (${profile.language_test_score}) appears to meet the requirement (${program.english_requirement}).`;
      } else if (profile.language_test_score >= required - 0.5) {
        score = maxScore * 0.5;
        status = "yellow";
        message = `Your score is close to but may not meet the requirement — verify band minimums.`;
      } else {
        score = maxScore * 0.1;
        status = "red";
        message = `Your score may not meet the published English requirement.`;
      }
    } else {
      score = maxScore * 0.6;
      status = "yellow";
      message = "English requirement format unclear — verify with official source.";
    }
  } else {
    message = "Add language test results to assess English requirements.";
  }

  return {
    breakdown: { factor: "English Requirements", score, maxScore, weight: 15, notes: message },
    check: { id: "english", category: "Language", title: "English Proficiency", status, message, source_url: program.source_url },
  };
}

function scorePrerequisites(
  profile: StudentProfile,
  program: Program
): { breakdown: ScoreBreakdownItem; checks: RequirementCheck[] } {
  const maxScore = 10;
  const checks: RequirementCheck[] = [];
  const prereqs = program.prerequisites || [];

  if (prereqs.length === 0) {
    return {
      breakdown: { factor: "Prerequisites", score: maxScore * 0.5, maxScore, weight: 10, notes: "No specific prerequisites listed." },
      checks: [],
    };
  }

  const courses = (profile.relevant_courses || []).map((c) => c.toLowerCase());
  const major = profile.major?.toLowerCase() || "";
  let matched = 0;

  for (const prereq of prereqs) {
    const prereqLower = prereq.toLowerCase();
    const courseMatch = courses.some((c) => c.includes(prereqLower) || prereqLower.includes(c));
    const majorMatch = major.includes(prereqLower.split(" ")[0]);
    const met = courseMatch || majorMatch;
    if (met) matched++;

    checks.push({
      id: `prereq-${prereq}`,
      category: "Prerequisites",
      title: prereq,
      status: met ? "green" : "yellow",
      message: met
        ? "Appears covered by your coursework or degree background."
        : "Verify whether you meet this prerequisite — may need additional coursework.",
      source_url: program.source_url,
    });
  }

  const score = (matched / prereqs.length) * maxScore;
  return {
    breakdown: {
      factor: "Prerequisites",
      score,
      maxScore,
      weight: 10,
      notes: `${matched}/${prereqs.length} prerequisites appear met based on your profile.`,
    },
    checks,
  };
}

function scoreExperience(
  profile: StudentProfile,
  program: Program
): ScoreBreakdownItem {
  const maxScore = 10;
  let score = 5;
  let notes = "";

  const hasResearch =
    (profile.research_interests?.length ?? 0) > 0 ||
    !!profile.final_year_project;
  const hasWork = (profile.years_of_experience ?? 0) > 0;

  if (program.program_type === "thesis" && hasResearch) {
    score += 3;
    notes = "Research background may support thesis-based program.";
  }
  if (program.field.toLowerCase().includes("business") && hasWork) {
    score += 3;
    notes = "Work experience may strengthen business program application.";
  }
  if (!hasResearch && !hasWork) {
    notes = "Add research or work experience to improve matching.";
  } else if (!notes) {
    notes = "Experience profile partially assessed.";
  }

  return { factor: "Research & Experience", score: Math.min(maxScore, score), maxScore, weight: 10, notes };
}

function scoreProgramTypeFit(
  profile: StudentProfile,
  program: Program
): ScoreBreakdownItem {
  const maxScore = 8;
  let score = 4;
  let notes = "";

  if (profile.prefer_thesis === null && profile.desired_program_type === null) {
    return { factor: "Program Type Fit", score: 4, maxScore, weight: 8, notes: "Set program type preferences for better matching." };
  }

  const wantsThesis = profile.prefer_thesis === true || profile.desired_program_type === "thesis";
  const wantsCourse = profile.prefer_thesis === false || profile.desired_program_type === "course_based";

  if (wantsThesis && program.program_type === "thesis") {
    score = maxScore;
    notes = "Thesis-based program aligns with your preference.";
  } else if (wantsCourse && program.program_type === "course_based") {
    score = maxScore;
    notes = "Course-based program aligns with your preference.";
  } else if (program.program_type === "mixed") {
    score = maxScore * 0.7;
    notes = "Mixed program offers flexibility in thesis/course options.";
  } else {
    score = 2;
    notes = "Program type may not match your stated preference.";
  }

  return { factor: "Program Type Fit", score, maxScore, weight: 8, notes };
}

function scoreLocation(
  profile: StudentProfile,
  program: Program
): ScoreBreakdownItem {
  const maxScore = 7;
  let score = 3;
  let notes = "";

  if (profile.excluded_provinces?.includes(program.province)) {
    return { factor: "Location Preference", score: 0, maxScore, weight: 7, notes: "This province is in your excluded list." };
  }

  if (profile.preferred_provinces?.includes(program.province)) {
    score = maxScore;
    notes = "Program is in one of your preferred provinces.";
  } else if (profile.preferred_provinces?.length) {
    score = 2;
    notes = "Program is outside your preferred provinces.";
  } else {
    score = 4;
    notes = "No province preference set.";
  }

  return { factor: "Location Preference", score, maxScore, weight: 7, notes };
}

function scoreTuitionAndFees(
  profile: StudentProfile,
  program: Program,
  tuition?: Tuition[]
): { breakdown: ScoreBreakdownItem; check: RequirementCheck } {
  const maxScore = 10;
  let score = 5;
  let status: RequirementCheck["status"] = "yellow";
  let message = "";

  const annualTuition = tuition?.find((t) => t.period === "year")?.amount;
  const fee = program.application_fee;

  if (profile.max_tuition && annualTuition) {
    if (annualTuition <= profile.max_tuition) {
      score += 3;
      status = "green";
      message = `Annual tuition ($${annualTuition.toLocaleString()} CAD) is within your budget.`;
    } else {
      score += 0;
      status = "red";
      message = `Annual tuition ($${annualTuition.toLocaleString()} CAD) exceeds your max budget ($${profile.max_tuition.toLocaleString()} CAD).`;
    }
  }

  if (profile.max_application_fee && fee) {
    if (fee <= profile.max_application_fee) {
      score += 2;
      if (status !== "red") status = "green";
    } else {
      status = "yellow";
      message += ` Application fee ($${fee}) exceeds your preferred maximum.`;
    }
  }

  if (profile.prioritize_fee_free && fee && fee > 0) {
    score -= 2;
    message += " Program has an application fee.";
  }

  if (!message) message = "Tuition/fee data limited — verify with official sources.";

  return {
    breakdown: { factor: "Tuition & Fees", score: Math.max(0, Math.min(maxScore, score)), maxScore, weight: 10, notes: message },
    check: { id: "tuition", category: "Financial", title: "Tuition & Fees", status, message, source_url: program.source_url },
  };
}

function scoreIntake(
  profile: StudentProfile,
  deadlines?: ApplicationDeadline[]
): ScoreBreakdownItem {
  const maxScore = 5;
  let score = 2;
  let notes = "";

  if (profile.preferred_intake && deadlines?.length) {
    const matching = deadlines.some((d) =>
      d.intake.toLowerCase().includes(profile.preferred_intake!.toLowerCase()) ||
      profile.preferred_intake!.toLowerCase().includes(d.intake.toLowerCase())
    );
    if (matching) {
      score = maxScore;
      notes = "Deadline available for your preferred intake.";
    } else {
      notes = "No deadline found for your preferred intake — verify availability.";
    }
  } else {
    notes = "Intake preference or deadline data unavailable.";
  }

  return { factor: "Intake Availability", score, maxScore, weight: 5, notes };
}

function scoreInternationalEligibility(
  profile: StudentProfile,
  program: Program
): { breakdown: ScoreBreakdownItem; check: RequirementCheck } {
  const maxScore = 10;
  let score = 5;
  let status: RequirementCheck["status"] = "yellow";
  let message = "";

  if (!profile.is_international_student) {
    return {
      breakdown: { factor: "International Eligibility", score: maxScore, maxScore, weight: 10, notes: "Domestic applicant — international restrictions may not apply." },
      check: { id: "intl", category: "Eligibility", title: "International Eligibility", status: "green", message: "Domestic applicant." },
    };
  }

  if (program.international_eligible) {
    score += 3;
    status = "green";
    message = "Program appears open to international students (verify with institution).";
  } else {
    score = 0;
    status = "red";
    message = "Program may not accept international students.";
  }

  if (profile.prefer_pgwp_eligible && program.pgwp_eligible) {
    score += 2;
    message += " Program appears PGWP-eligible.";
  } else if (profile.prefer_pgwp_eligible && !program.pgwp_eligible) {
    status = "yellow";
    message += " PGWP eligibility unclear or not eligible.";
  }

  return {
    breakdown: { factor: "International Eligibility", score: Math.min(maxScore, score), maxScore, weight: 10, notes: message },
    check: { id: "intl", category: "Eligibility", title: "International Eligibility", status, message, source_url: program.source_url },
  };
}

function buildActionItems(
  program: Program,
  requirementChecks: RequirementCheck[],
  supervisorInfo: ReturnType<typeof analyzeProgramSupervisorRequirement>
): ActionItem[] {
  const items: ActionItem[] = [];

  if (supervisorInfo.classification === "SUPERVISOR_REQUIRED") {
    items.push({
      id: "supervisor-required",
      title: "Secure a faculty supervisor",
      description: supervisorInfo.actionLabel,
      priority: "high",
      category: "Supervisor",
    });
  } else if (supervisorInfo.classification === "UNKNOWN_VERIFY") {
    items.push({
      id: "supervisor-verify",
      title: "Verify supervisor requirements",
      description: "Contact the department to confirm supervisor requirements before applying.",
      priority: "high",
      category: "Supervisor",
    });
  }

  for (const check of requirementChecks) {
    if (check.status === "red") {
      items.push({
        id: `action-${check.id}`,
        title: `Address: ${check.title}`,
        description: check.message,
        priority: "high",
        category: check.category,
      });
    } else if (check.status === "yellow") {
      items.push({
        id: `action-${check.id}`,
        title: `Review: ${check.title}`,
        description: check.message,
        priority: "medium",
        category: check.category,
      });
    }
  }

  if (program.verification_status === "needs_verification") {
    items.push({
      id: "verify-data",
      title: "Verify program data",
      description: "This program uses DEMO data — confirm all details on the official institution website.",
      priority: "medium",
      category: "Verification",
    });
  }

  return items;
}

export function matchProgram(
  profile: StudentProfile,
  input: MatchInput
): MatchResult | null {
  const { program, requirements, tuition, deadlines } = input;

  const supervisorInfo = analyzeProgramSupervisorRequirement(program);
  const classification = supervisorInfo.classification;

  if (shouldExcludeProgram(classification, profile.exclude_supervisor_required)) {
    return null;
  }

  const scoreBreakdown: ScoreBreakdownItem[] = [];
  const requirementChecks: RequirementCheck[] = [];

  scoreBreakdown.push(scoreDegreeCompatibility(profile, program));

  const gpaResult = scoreGpa(profile, program);
  scoreBreakdown.push(gpaResult.breakdown);
  requirementChecks.push(gpaResult.check);

  const englishResult = scoreEnglish(profile, program);
  scoreBreakdown.push(englishResult.breakdown);
  requirementChecks.push(englishResult.check);

  const prereqResult = scorePrerequisites(profile, program);
  scoreBreakdown.push(prereqResult.breakdown);
  requirementChecks.push(...prereqResult.checks);

  scoreBreakdown.push(scoreExperience(profile, program));
  scoreBreakdown.push(scoreProgramTypeFit(profile, program));
  scoreBreakdown.push(scoreLocation(profile, program));

  const tuitionResult = scoreTuitionAndFees(profile, program, tuition);
  scoreBreakdown.push(tuitionResult.breakdown);
  requirementChecks.push(tuitionResult.check);

  scoreBreakdown.push(scoreIntake(profile, deadlines));

  const intlResult = scoreInternationalEligibility(profile, program);
  scoreBreakdown.push(intlResult.breakdown);
  requirementChecks.push(intlResult.check);

  for (const req of requirements || []) {
    requirementChecks.push({
      id: req.id,
      category: req.category,
      title: req.title,
      status: req.is_mandatory ? "yellow" : "green",
      message: req.description || "Review this requirement against your profile.",
      source_url: req.source_url,
    });
  }

  const totalWeight = scoreBreakdown.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = scoreBreakdown.reduce(
    (sum, item) => sum + (item.score / item.maxScore) * item.weight,
    0
  );
  const score = Math.round((weightedScore / totalWeight) * 100);
  const tier = scoreToTier(score);

  const actionItems = buildActionItems(program, requirementChecks, supervisorInfo);

  return {
    programId: program.id,
    score,
    tier,
    tierLabel: tierToLabel(tier),
    summary: `This program appears ${tierToLabel(tier).toLowerCase()} with your profile based on published requirements. ${MATCH_DISCLAIMER}`,
    requirementChecks,
    actionItems,
    scoreBreakdown,
    supervisorClassification: classification,
    disclaimer: MATCH_DISCLAIMER,
  };
}

export function matchPrograms(
  profile: StudentProfile,
  inputs: MatchInput[]
): MatchResult[] {
  return inputs
    .map((input) => matchProgram(profile, input))
    .filter((result): result is MatchResult => result !== null)
    .sort((a, b) => b.score - a.score);
}

export function getDemoProfile(): StudentProfile {
  return {
    id: "demo-profile",
    user_id: "demo-user",
    full_name: "DEMO Student",
    citizenship_country: "India",
    current_country: "India",
    age: 24,
    email: "demo.student@example.com",
    highest_qualification: "Bachelor's",
    degree_name: "B.Tech Computer Science",
    university: "DEMO Institute of Technology",
    graduation_year: 2024,
    gpa: 3.6,
    gpa_scale: 4.0,
    degree_classification: "First Class",
    major: "Computer Science",
    relevant_courses: ["Machine Learning", "Data Structures", "Algorithms", "Linear Algebra"],
    final_year_project: "NLP-based sentiment analysis system",
    research_interests: ["Machine Learning", "Natural Language Processing", "Artificial Intelligence"],
    work_experience: "Software developer at DEMO Tech (1 year)",
    years_of_experience: 1,
    language_test_type: "IELTS",
    language_test_score: 7.5,
    english_instruction_language: true,
    desired_qualification: "Master's",
    desired_field: "Computer Science",
    field_category: "computer_information_sciences",
    preferred_institution_type: "university",
    desired_program_type: "thesis",
    preferred_intake: "Fall 2026",
    preferred_provinces: ["Ontario", "British Columbia"],
    excluded_provinces: [],
    max_tuition: 50000,
    max_application_fee: 150,
    prioritize_fee_free: false,
    exclude_supervisor_required: false,
    prefer_thesis: true,
    is_international_student: true,
    study_permit_required: true,
    prefer_international_friendly: true,
    prefer_pgwp_eligible: true,
    phone_number: null,
    mailing_street: null,
    mailing_city: null,
    mailing_province_state: null,
    mailing_postal_code: null,
    mailing_country: null,
    onboarding_completed: true,
    profile_completeness: 85,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
