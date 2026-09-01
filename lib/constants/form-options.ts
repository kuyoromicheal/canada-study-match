import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import type {
  ApplicationFeeFilter,
  DegreeLevel,
  InstitutionType,
  ProgramType,
} from "@/types/database";
import { FIELDS_OF_STUDY, UNDERGRADUATE_COURSE_SUGGESTIONS } from "@/lib/constants/fields-of-study";

countries.registerLocale(enLocale);

export type FormOption<T extends string = string> = {
  value: T;
  label: string;
};

// ---------------------------------------------------------------------------
// Personal
// ---------------------------------------------------------------------------

export function getCountryOptions(): FormOption<string>[] {
  const names = countries.getNames("en", { select: "official" });
  return Object.entries(names)
    .map(([code, label]) => ({ value: code, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getCountryLabel(code: string | null | undefined): string {
  if (!code) return "";
  if (code.length === 2) {
    return countries.getName(code, "en", { select: "official" }) || code;
  }
  return code;
}

/** Resolve legacy country name strings to ISO alpha-2 codes */
export function resolveCountryCode(stored: string | null | undefined): string {
  if (!stored) return "";
  if (stored.length === 2) return stored.toUpperCase();
  const options = getCountryOptions();
  const byLabel = options.find(
    (o) => o.label.toLowerCase() === stored.toLowerCase()
  );
  if (byLabel) return byLabel.value;
  const byName = countries.getAlpha2Code(stored, "en");
  return byName || stored;
}

/** ISO 3166-1 alpha-2 codes that commonly use UK-style degree classifications */
export const UK_STYLE_CLASSIFICATION_COUNTRIES = new Set([
  "GB",
  "NG",
  "GH",
  "KE",
  "ZA",
  "IN",
  "PK",
  "BD",
  "JM",
  "TT",
  "UG",
  "TZ",
  "ZW",
  "ZM",
  "MW",
  "SL",
  "LR",
  "GM",
  "BW",
  "NA",
  "MU",
  "SC",
  "BS",
  "BB",
  "AG",
  "LC",
  "VC",
  "GD",
  "DM",
  "KN",
  "BZ",
  "GY",
  "SR",
  "FJ",
  "PG",
  "SB",
  "VU",
  "WS",
  "TO",
  "KI",
  "TV",
  "NR",
  "PW",
  "MH",
  "FM",
  "BN",
  "MY",
  "SG",
  "HK",
  "MT",
  "CY",
  "IE",
]);

export const AGE_RANGE_OPTIONS: FormOption[] = [
  { value: "18-21", label: "18–21" },
  { value: "22-25", label: "22–25" },
  { value: "26-30", label: "26–30" },
  { value: "31-35", label: "31–35" },
  { value: "36-40", label: "36–40" },
  { value: "41+", label: "41 or older" },
];

// ---------------------------------------------------------------------------
// Academic — profile qualification (stored in highest_qualification / desired_qualification)
// ---------------------------------------------------------------------------

export const QUALIFICATION_OPTIONS: FormOption[] = [
  { value: "high_school_diploma", label: "High School Diploma" },
  { value: "associate_degree", label: "Associate Degree" },
  { value: "bachelors_degree", label: "Bachelor's Degree" },
  { value: "postgraduate_diploma", label: "Postgraduate Diploma" },
  { value: "graduate_certificate", label: "Graduate Certificate" },
  { value: "masters_degree", label: "Master's Degree" },
  { value: "phd", label: "PhD" },
  { value: "other", label: "Other" },
];

export const DEGREE_CLASSIFICATION_UK_OPTIONS: FormOption[] = [
  { value: "first_class", label: "First Class" },
  { value: "upper_second", label: "Upper Second Class (2:1)" },
  { value: "lower_second", label: "Lower Second Class (2:2)" },
  { value: "third_class", label: "Third Class" },
  { value: "pass", label: "Pass" },
];

export const DEGREE_CLASSIFICATION_GPA_OPTIONS: FormOption[] = [
  { value: "gpa_based", label: "GPA-based (no honours classification)" },
  { value: "not_applicable", label: "Not applicable" },
];

export function getDegreeClassificationOptions(
  citizenshipCountry?: string | null
): FormOption[] {
  const code = citizenshipCountry?.length === 2 ? citizenshipCountry : null;
  const useUkStyle = code ? UK_STYLE_CLASSIFICATION_COUNTRIES.has(code) : false;
  if (useUkStyle) {
    return [
      ...DEGREE_CLASSIFICATION_UK_OPTIONS,
      { value: "gpa_based", label: "GPA-based (no honours classification)" },
      { value: "not_applicable", label: "Not applicable" },
    ];
  }
  return DEGREE_CLASSIFICATION_GPA_OPTIONS;
}

export const GPA_SCALE_OPTIONS: FormOption[] = [
  { value: "4.0", label: "4.0" },
  { value: "4.3", label: "4.3" },
  { value: "4.5", label: "4.5" },
  { value: "5.0", label: "5.0" },
  { value: "10.0", label: "10.0" },
  { value: "100", label: "100 (percentage)" },
  { value: "other", label: "Other (specify)" },
];

export function graduationYearOptions(): FormOption[] {
  const current = new Date().getFullYear();
  const years: FormOption[] = [];
  for (let y = current + 6; y >= current - 40; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  years.push({ value: "in_progress", label: "In progress (still studying)" });
  return years;
}

export const YEARS_OF_EXPERIENCE_OPTIONS: FormOption[] = [
  { value: "0", label: "No work experience" },
  { value: "1", label: "Less than 1 year" },
  { value: "2", label: "1–2 years" },
  { value: "3", label: "3–5 years" },
  { value: "6", label: "6–10 years" },
  { value: "11", label: "More than 10 years" },
];

// ---------------------------------------------------------------------------
// Field of study — major matches programs.field + Nigerian/international catalogue
// ---------------------------------------------------------------------------

export function buildProgramFieldOptions(catalogFields: string[]): FormOption[] {
  const merged = new Set<string>([...FIELDS_OF_STUDY, ...catalogFields.filter(Boolean)]);
  return Array.from(merged)
    .sort((a, b) => a.localeCompare(b))
    .map((f) => ({ value: f, label: f }));
}

export function getFieldOfStudyCount(catalogFields: string[]): number {
  return new Set([...FIELDS_OF_STUDY, ...catalogFields.filter(Boolean)]).size;
}

export const RESEARCH_INTEREST_SUGGESTIONS = [
  "Microbiology",
  "Antimicrobial resistance",
  "Biotechnology",
  "Molecular biology",
  "Food microbiology",
  "Data science",
  "Machine learning",
  "Bioinformatics",
  "Public health",
  "Environmental science",
] as const;

export const COURSE_SUGGESTIONS = UNDERGRADUATE_COURSE_SUGGESTIONS;

// ---------------------------------------------------------------------------
// Field category — CIP-style broad categories (stored in field_category / desired_field)
// ---------------------------------------------------------------------------

export const FIELD_CATEGORY_OPTIONS: FormOption[] = [
  { value: "agriculture_life_sciences", label: "Agriculture & Life Sciences" },
  { value: "biological_biomedical_sciences", label: "Biological & Biomedical Sciences" },
  { value: "business_management_economics", label: "Business, Management & Economics" },
  { value: "computer_information_sciences", label: "Computer & Information Sciences" },
  { value: "education", label: "Education" },
  { value: "engineering", label: "Engineering" },
  { value: "engineering_technology", label: "Engineering Technology" },
  { value: "fine_performing_arts", label: "Fine & Performing Arts" },
  { value: "health_professions_clinical_sciences", label: "Health Professions & Clinical Sciences" },
  { value: "humanities", label: "Humanities" },
  { value: "law_legal_studies", label: "Law & Legal Studies" },
  { value: "mathematics_statistics", label: "Mathematics & Statistics" },
  { value: "natural_resources_environment", label: "Natural Resources & Environment" },
  { value: "physical_sciences", label: "Physical Sciences" },
  { value: "psychology", label: "Psychology" },
  { value: "public_administration_social_services", label: "Public Administration & Social Services" },
  { value: "social_sciences", label: "Social Sciences" },
  { value: "trades_technical", label: "Trades & Technical" },
];

export function getFieldCategoryLabel(value: string | null | undefined): string {
  return FIELD_CATEGORY_OPTIONS.find((o) => o.value === value)?.label || value || "";
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export type LanguageTestType =
  | "ielts_academic"
  | "ielts_general"
  | "toefl_ibt"
  | "duolingo"
  | "pte_academic"
  | "cael"
  | "melab"
  | "celpip"
  | "none";

export const LANGUAGE_TEST_OPTIONS: FormOption<LanguageTestType>[] = [
  { value: "ielts_academic", label: "IELTS Academic" },
  { value: "ielts_general", label: "IELTS General" },
  { value: "toefl_ibt", label: "TOEFL iBT" },
  { value: "duolingo", label: "Duolingo English Test" },
  { value: "pte_academic", label: "PTE Academic" },
  { value: "cael", label: "CAEL" },
  { value: "melab", label: "MELAB" },
  { value: "celpip", label: "CELPIP" },
  { value: "none", label: "None taken" },
];

export interface LanguageScoreConfig {
  min: number;
  max: number;
  step: number;
  label: string;
  hint: string;
}

export const LANGUAGE_SCORE_CONFIG: Record<
  Exclude<LanguageTestType, "none">,
  LanguageScoreConfig
> = {
  ielts_academic: {
    min: 0,
    max: 9,
    step: 0.5,
    label: "IELTS Academic overall band",
    hint: "Overall band score from 0 to 9 in 0.5 steps (e.g. 6.5, 7.0).",
  },
  ielts_general: {
    min: 0,
    max: 9,
    step: 0.5,
    label: "IELTS General overall band",
    hint: "Overall band score from 0 to 9 in 0.5 steps.",
  },
  toefl_ibt: {
    min: 0,
    max: 120,
    step: 1,
    label: "TOEFL iBT total score",
    hint: "Total score from 0 to 120.",
  },
  duolingo: {
    min: 10,
    max: 160,
    step: 1,
    label: "Duolingo English Test score",
    hint: "Score from 10 to 160.",
  },
  pte_academic: {
    min: 10,
    max: 90,
    step: 1,
    label: "PTE Academic score",
    hint: "Score from 10 to 90.",
  },
  cael: {
    min: 10,
    max: 90,
    step: 1,
    label: "CAEL score",
    hint: "Score from 10 to 90.",
  },
  melab: {
    min: 0,
    max: 100,
    step: 1,
    label: "MELAB score",
    hint: "Score from 0 to 100.",
  },
  celpip: {
    min: 1,
    max: 12,
    step: 1,
    label: "CELPIP level",
    hint: "Level from 1 to 12.",
  },
};

export function validateLanguageScore(
  testType: LanguageTestType | string | null | undefined,
  score: number | null | undefined
): string | null {
  if (!testType || testType === "none") return null;
  if (score == null || Number.isNaN(score)) return "Enter your test score.";
  const config = LANGUAGE_SCORE_CONFIG[testType as Exclude<LanguageTestType, "none">];
  if (!config) return null;
  if (score < config.min || score > config.max) {
    return `Score must be between ${config.min} and ${config.max}.`;
  }
  if (config.step === 0.5) {
    const doubled = score * 2;
    if (Math.abs(doubled - Math.round(doubled)) > 0.001) {
      return "IELTS scores must be in 0.5 steps (e.g. 6.0, 6.5, 7.0).";
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Study preferences — shared with program filters
// ---------------------------------------------------------------------------

export const DEGREE_LEVEL_OPTIONS: FormOption<DegreeLevel>[] = [
  { value: "certificate", label: "Certificate" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelor", label: "Bachelor's" },
  { value: "graduate_certificate", label: "Graduate Certificate" },
  { value: "master", label: "Master's" },
  { value: "phd", label: "PhD" },
  { value: "postdoc", label: "Postdoctoral" },
];

export const PROGRAM_TYPE_OPTIONS: FormOption<ProgramType>[] = [
  { value: "thesis", label: "Thesis-based" },
  { value: "course_based", label: "Course-based" },
  { value: "mixed", label: "Research" },
  { value: "coop", label: "Co-op" },
];

export const INTAKE_TERM_OPTIONS: FormOption[] = [
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
  { value: "summer", label: "Summer" },
  { value: "spring", label: "Spring" },
  { value: "rolling", label: "Rolling / Anytime" },
];

export const INSTITUTION_TYPE_OPTIONS: FormOption<InstitutionType>[] = [
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "polytechnic", label: "Polytechnic" },
];

export const INSTITUTION_TYPE_FILTER_OPTIONS: FormOption[] = [
  { value: "", label: "No preference" },
  ...INSTITUTION_TYPE_OPTIONS,
];

export const TUITION_BUDGET_OPTIONS: FormOption[] = [
  { value: "", label: "No limit / not sure" },
  { value: "15000", label: "Up to $15,000 CAD/year" },
  { value: "20000", label: "Up to $20,000 CAD/year" },
  { value: "25000", label: "Up to $25,000 CAD/year" },
  { value: "30000", label: "Up to $30,000 CAD/year" },
  { value: "40000", label: "Up to $40,000 CAD/year" },
  { value: "50000", label: "Up to $50,000 CAD/year" },
];

export const APPLICATION_FEE_OPTIONS: FormOption[] = [
  { value: "", label: "No limit / not sure" },
  { value: "0", label: "Free only ($0)" },
  { value: "50", label: "Up to $50 CAD" },
  { value: "100", label: "Up to $100 CAD" },
  { value: "150", label: "Up to $150 CAD" },
  { value: "200", label: "Up to $200 CAD" },
];

export const APPLICATION_FEE_FILTER_OPTIONS: FormOption<ApplicationFeeFilter | "">[] = [
  { value: "", label: "Any" },
  { value: "free", label: "Free (no fee or waiver available)" },
  { value: "paid", label: "Paid" },
];

// ---------------------------------------------------------------------------
// Immigration
// ---------------------------------------------------------------------------

export type InternationalStudentStatus =
  | "requires_study_permit"
  | "citizen_or_pr"
  | "existing_study_permit";

export const INTERNATIONAL_STUDENT_STATUS_OPTIONS: FormOption<InternationalStudentStatus>[] = [
  {
    value: "requires_study_permit",
    label: "Yes, I require a study permit",
  },
  {
    value: "citizen_or_pr",
    label: "No, I'm a Canadian citizen or permanent resident",
  },
  {
    value: "existing_study_permit",
    label: "I already hold a valid study permit for another program",
  },
];

export type PgwpPreference = "must_pgwp" | "prefer_pgwp" | "no_preference";

export const PGWP_PREFERENCE_OPTIONS: FormOption<PgwpPreference>[] = [
  { value: "must_pgwp", label: "Program must be PGWP-eligible" },
  { value: "prefer_pgwp", label: "Prefer PGWP-eligible but not required" },
  { value: "no_preference", label: "No preference" },
];

export function internationalStatusToBooleans(status: InternationalStudentStatus): {
  is_international_student: boolean;
  study_permit_required: boolean;
} {
  switch (status) {
    case "citizen_or_pr":
      return { is_international_student: false, study_permit_required: false };
    case "existing_study_permit":
      return { is_international_student: true, study_permit_required: false };
    default:
      return { is_international_student: true, study_permit_required: true };
  }
}

export function booleansToInternationalStatus(
  isInternational?: boolean,
  studyPermitRequired?: boolean
): InternationalStudentStatus {
  if (!isInternational) return "citizen_or_pr";
  if (!studyPermitRequired) return "existing_study_permit";
  return "requires_study_permit";
}

export function pgwpPreferenceToBoolean(pref: PgwpPreference): boolean {
  return pref === "must_pgwp" || pref === "prefer_pgwp";
}

export function booleanToPgwpPreference(
  preferPgwp?: boolean,
  strict?: boolean
): PgwpPreference {
  if (!preferPgwp) return "no_preference";
  return strict ? "must_pgwp" : "prefer_pgwp";
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function getOptionLabel<T extends string>(
  options: FormOption<T>[],
  value: string | null | undefined
): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

export function parseAgeRangeForSubmit(ageStr?: string): number | undefined {
  if (!ageStr) return undefined;
  const map: Record<string, number> = {
    "18-21": 20,
    "22-25": 23,
    "26-30": 28,
    "31-35": 33,
    "36-40": 38,
    "41+": 45,
  };
  if (map[ageStr]) return map[ageStr];
  const n = Number(ageStr);
  return Number.isFinite(n) ? n : undefined;
}
