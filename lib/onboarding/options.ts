export const COUNTRIES = [
  "Canada",
  "Nigeria",
  "India",
  "China",
  "United States",
  "United Kingdom",
  "Ghana",
  "Kenya",
  "Pakistan",
  "Bangladesh",
  "Philippines",
  "Iran",
  "Brazil",
  "Mexico",
  "France",
  "Germany",
  "South Korea",
  "Japan",
  "Egypt",
  "Ethiopia",
  "Cameroon",
  "South Africa",
  "Jamaica",
  "Trinidad and Tobago",
  "Vietnam",
  "Indonesia",
  "Malaysia",
  "Nepal",
  "Sri Lanka",
  "Turkey",
  "Other",
] as const;

export const AGE_RANGES = [
  { value: "18-21", label: "18–21" },
  { value: "22-25", label: "22–25" },
  { value: "26-30", label: "26–30" },
  { value: "31-35", label: "31–35" },
  { value: "36-40", label: "36–40" },
  { value: "41+", label: "41 or older" },
] as const;

export const HIGHEST_QUALIFICATIONS = [
  { value: "High school", label: "High school / secondary" },
  { value: "Diploma", label: "Diploma" },
  { value: "Associate degree", label: "Associate degree" },
  { value: "Bachelor's", label: "Bachelor's degree" },
  { value: "Honours Bachelor's", label: "Honours bachelor's" },
  { value: "Master's", label: "Master's degree" },
  { value: "PhD", label: "PhD / doctorate" },
  { value: "Other", label: "Other qualification" },
] as const;

export const DEGREE_NAMES = [
  { value: "B.Sc.", label: "B.Sc. (Bachelor of Science)" },
  { value: "B.A.", label: "B.A. (Bachelor of Arts)" },
  { value: "B.Eng.", label: "B.Eng. (Bachelor of Engineering)" },
  { value: "B.Tech.", label: "B.Tech. (Bachelor of Technology)" },
  { value: "B.Com.", label: "B.Com. (Bachelor of Commerce)" },
  { value: "MBBS", label: "MBBS / Medicine" },
  { value: "M.Sc.", label: "M.Sc. (Master of Science)" },
  { value: "M.A.", label: "M.A. (Master of Arts)" },
  { value: "M.Eng.", label: "M.Eng. (Master of Engineering)" },
  { value: "MBA", label: "MBA" },
  { value: "Other", label: "Other — specify below" },
] as const;

export const GPA_SCALES = [
  { value: "4.0", label: "4.0 scale (e.g. Canada, US)" },
  { value: "5.0", label: "5.0 scale (e.g. Nigeria)" },
  { value: "10", label: "10-point scale" },
  { value: "100", label: "Percentage (0–100)" },
  { value: "Other", label: "Other scale" },
] as const;

export const DEGREE_CLASSIFICATIONS = [
  { value: "First Class", label: "First Class / First Class Honours" },
  { value: "Second Class Upper", label: "Second Class Upper (2:1)" },
  { value: "Second Class Lower", label: "Second Class Lower (2:2)" },
  { value: "Third Class", label: "Third Class" },
  { value: "Pass", label: "Pass" },
  { value: "Distinction", label: "Distinction" },
  { value: "Credit", label: "Credit" },
  { value: "GPA only", label: "GPA only — no classification" },
  { value: "Not applicable", label: "Not applicable" },
] as const;

export const FIELD_OF_STUDY_OPTIONS = [
  "Biology",
  "Microbiology",
  "Molecular Biology",
  "Biotechnology",
  "Biochemistry",
  "Genetics",
  "Immunology",
  "Biomedical Science",
  "Food Science",
  "Food Microbiology",
  "Environmental Biology",
  "Public Health",
  "Computer Science",
  "Software Engineering",
  "Information Technology",
  "Cybersecurity",
  "Data Science",
  "Artificial Intelligence",
  "Machine Learning",
  "Bioinformatics",
  "Business Administration",
  "Management",
  "Finance",
  "Accounting",
  "Engineering",
  "Nursing",
  "Psychology",
  "Education",
  "Other",
] as const;

export const YEARS_OF_EXPERIENCE = [
  { value: "0", label: "No work experience" },
  { value: "1", label: "Less than 1 year" },
  { value: "2", label: "1–2 years" },
  { value: "3", label: "3–5 years" },
  { value: "6", label: "6–10 years" },
  { value: "11", label: "More than 10 years" },
] as const;

export const DESIRED_QUALIFICATIONS = [
  { value: "Master's", label: "Master's (general)" },
  { value: "MSc", label: "MSc" },
  { value: "MA", label: "MA" },
  { value: "MEng", label: "MEng" },
  { value: "MBA", label: "MBA" },
  { value: "Graduate Certificate", label: "Graduate Certificate" },
  { value: "Graduate Diploma", label: "Graduate Diploma" },
  { value: "Postgraduate Diploma", label: "Postgraduate Diploma" },
  { value: "College Graduate Program", label: "College graduate program" },
  { value: "PhD", label: "PhD" },
  { value: "Any graduate program", label: "Any graduate-level program" },
] as const;

export const INTAKE_OPTIONS = [
  { value: "Fall 2026", label: "Fall 2026" },
  { value: "Winter 2026", label: "Winter 2026" },
  { value: "Spring 2026", label: "Spring 2026" },
  { value: "Summer 2026", label: "Summer 2026" },
  { value: "Fall 2027", label: "Fall 2027" },
  { value: "Winter 2027", label: "Winter 2027" },
  { value: "Spring 2027", label: "Spring 2027" },
  { value: "Summer 2027", label: "Summer 2027" },
  { value: "Fall 2028", label: "Fall 2028" },
  { value: "Next available", label: "Next available intake" },
] as const;

export const TUITION_BUDGET_OPTIONS = [
  { value: "", label: "No limit / not sure" },
  { value: "15000", label: "Up to $15,000 CAD/year" },
  { value: "20000", label: "Up to $20,000 CAD/year" },
  { value: "25000", label: "Up to $25,000 CAD/year" },
  { value: "30000", label: "Up to $30,000 CAD/year" },
  { value: "40000", label: "Up to $40,000 CAD/year" },
  { value: "50000", label: "Up to $50,000 CAD/year" },
] as const;

export const APPLICATION_FEE_OPTIONS = [
  { value: "", label: "No limit / not sure" },
  { value: "0", label: "Free only ($0)" },
  { value: "50", label: "Up to $50 CAD" },
  { value: "100", label: "Up to $100 CAD" },
  { value: "150", label: "Up to $150 CAD" },
  { value: "200", label: "Up to $200 CAD" },
] as const;

export const LANGUAGE_TEST_TYPES = [
  { value: "", label: "Select test..." },
  { value: "IELTS", label: "IELTS" },
  { value: "TOEFL", label: "TOEFL iBT" },
  { value: "Duolingo", label: "Duolingo English Test" },
  { value: "PTE", label: "PTE Academic" },
  { value: "CAEL", label: "CAEL" },
  { value: "None", label: "None yet — not taken" },
] as const;

export const LANGUAGE_SCORE_HINTS: Record<string, string> = {
  IELTS: "Overall band score (e.g. 6.5, 7.0). Typical minimum: 6.0–7.0.",
  TOEFL: "Total score out of 120 (e.g. 90, 100).",
  Duolingo: "Score out of 160 (e.g. 110, 120).",
  PTE: "Score out of 90 (e.g. 58, 65).",
  CAEL: "Score out of 90.",
};

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

export const COURSE_SUGGESTIONS = [
  "Biochemistry",
  "Cell Biology",
  "Molecular Biology",
  "Statistics",
  "Microbiology",
  "Genetics",
  "Organic Chemistry",
  "Computer Science",
  "Programming",
  "Research Methods",
] as const;

export function graduationYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear();
  const years: { value: string; label: string }[] = [
    { value: "", label: "Select year..." },
  ];
  for (let y = current + 2; y >= current - 15; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  years.push({ value: "In progress", label: "Still studying (in progress)" });
  return years;
}

export function countryOptions(): { value: string; label: string }[] {
  return COUNTRIES.map((c) => ({ value: c, label: c }));
}

export function fieldOptions(catalogFields: string[]): { value: string; label: string }[] {
  const merged = new Set<string>([...FIELD_OF_STUDY_OPTIONS, ...catalogFields]);
  return Array.from(merged)
    .sort((a, b) => a.localeCompare(b))
    .map((f) => ({ value: f, label: f }));
}

export function intakeOptions(catalogIntakes: string[]): { value: string; label: string }[] {
  const fromCatalog = catalogIntakes.map((i) => ({ value: i, label: i }));
  const defaults = INTAKE_OPTIONS.filter((o) => !catalogIntakes.includes(o.value));
  return [...fromCatalog, ...defaults];
}
