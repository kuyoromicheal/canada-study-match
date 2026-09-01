"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GmailConnectButton } from "@/components/gmail/gmail-connect-button";
import { SelectField } from "@/components/onboarding/select-field";
import {
  APPLICATION_FEE_OPTIONS,
  countryOptions,
  DEGREE_CLASSIFICATIONS,
  DEGREE_NAMES,
  DESIRED_QUALIFICATIONS,
  fieldOptions,
  graduationYearOptions,
  GPA_SCALES,
  HIGHEST_QUALIFICATIONS,
  intakeOptions,
  LANGUAGE_SCORE_HINTS,
  LANGUAGE_TEST_TYPES,
  RESEARCH_INTEREST_SUGGESTIONS,
  COURSE_SUGGESTIONS,
  TUITION_BUDGET_OPTIONS,
  YEARS_OF_EXPERIENCE,
  AGE_RANGES,
} from "@/lib/onboarding/options";

const profileSchema = z.object({
  full_name: z.string().min(1, "Required"),
  citizenship_country: z.string().min(1, "Required"),
  current_country: z.string().min(1, "Required"),
  age: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone_number: z.string().optional(),
  mailing_street: z.string().optional(),
  mailing_city: z.string().optional(),
  mailing_province_state: z.string().optional(),
  mailing_postal_code: z.string().optional(),
  mailing_country: z.string().optional(),
  highest_qualification: z.string().optional(),
  degree_name: z.string().optional(),
  university: z.string().optional(),
  graduation_year: z.string().optional(),
  gpa: z.string().optional(),
  gpa_scale: z.string().optional(),
  degree_classification: z.string().optional(),
  major: z.string().optional(),
  relevant_courses: z.string().optional(),
  final_year_project: z.string().optional(),
  research_interests: z.string().optional(),
  work_experience: z.string().optional(),
  years_of_experience: z.string().optional(),
  language_test_type: z.string().optional(),
  language_test_score: z.string().optional(),
  english_instruction_language: z.boolean().optional(),
  desired_qualification: z.string().optional(),
  desired_field: z.string().optional(),
  desired_program_type: z.enum(["thesis", "course_based", "coop", "mixed"]).optional(),
  preferred_intake: z.string().optional(),
  preferred_provinces: z.array(z.string()).optional(),
  excluded_provinces: z.array(z.string()).optional(),
  max_tuition: z.string().optional(),
  max_application_fee: z.string().optional(),
  prioritize_fee_free: z.boolean().optional(),
  exclude_supervisor_required: z.boolean().optional(),
  prefer_thesis: z.boolean().optional(),
  is_international_student: z.boolean().optional(),
  study_permit_required: z.boolean().optional(),
  prefer_international_friendly: z.boolean().optional(),
  prefer_pgwp_eligible: z.boolean().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const STEPS = [
  { id: "gmail", title: "Connect Gmail", description: "Send supervisor emails and track application responses" },
  { id: "personal", title: "Personal Info", description: "Basic details about you" },
  { id: "academic", title: "Academic Background", description: "Your education and experience" },
  { id: "language", title: "Language", description: "English proficiency" },
  { id: "preferences", title: "Study Preferences", description: "What you're looking for" },
  { id: "immigration", title: "Immigration", description: "International student preferences" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [catalogFields, setCatalogFields] = useState<string[]>([]);
  const [catalogIntakes, setCatalogIntakes] = useState<string[]>([]);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      gpa_scale: "4.0",
      english_instruction_language: false,
      prioritize_fee_free: false,
      exclude_supervisor_required: false,
      is_international_student: true,
      study_permit_required: true,
      prefer_international_friendly: true,
      prefer_pgwp_eligible: true,
      preferred_provinces: [],
      excluded_provinces: [],
    },
  });

  const { register, handleSubmit, watch, setValue, reset } = form;
  const progress = ((step + 1) / STEPS.length) * 100;

  const degreeNameValues = new Set(DEGREE_NAMES.map((d) => d.value));
  const fieldOfStudyValues = new Set(
  [...catalogFields, "Biology", "Microbiology", "Computer Science", "Engineering", "Other"]
  );

  function selectWithOtherValue(
    value: string | undefined,
    knownValues: Set<string>
  ): string {
    if (!value) return "";
    if (knownValues.has(value)) return value;
    return "Other";
  }

  function showOtherCustomField(
    value: string | undefined,
    knownValues: Set<string>
  ): boolean {
    return value === "Other" || Boolean(value && !knownValues.has(value));
  }

  useEffect(() => {
    async function load() {
      const [filtersRes, profileRes] = await Promise.all([
        fetch("/api/catalog-filters"),
        fetch("/api/profile"),
      ]);

      if (filtersRes.ok) {
        const filters = await filtersRes.json();
        setProvinces(filters.provinces || []);
        setCatalogFields(filters.fields || []);
        setCatalogIntakes(filters.intakes || []);
      }

      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        if (profile) {
          reset({
            full_name: profile.full_name || "",
            citizenship_country: profile.citizenship_country || "",
            current_country: profile.current_country || "",
            age: profile.age?.toString() || "",
            email: profile.email || "",
            phone_number: profile.phone_number || "",
            mailing_street: profile.mailing_street || "",
            mailing_city: profile.mailing_city || "",
            mailing_province_state: profile.mailing_province_state || "",
            mailing_postal_code: profile.mailing_postal_code || "",
            mailing_country: profile.mailing_country || "",
            highest_qualification: profile.highest_qualification || "",
            degree_name: profile.degree_name || "",
            university: profile.university || "",
            graduation_year: profile.graduation_year?.toString() || "",
            gpa: profile.gpa?.toString() || "",
            gpa_scale: profile.gpa_scale?.toString() || "4.0",
            degree_classification: profile.degree_classification || "",
            major: profile.major || "",
            relevant_courses: profile.relevant_courses?.join(", ") || "",
            final_year_project: profile.final_year_project || "",
            research_interests: profile.research_interests?.join(", ") || "",
            work_experience: profile.work_experience || "",
            years_of_experience: profile.years_of_experience?.toString() || "",
            language_test_type: profile.language_test_type || "",
            language_test_score: profile.language_test_score?.toString() || "",
            english_instruction_language: profile.english_instruction_language ?? false,
            desired_qualification: profile.desired_qualification || "",
            desired_field: profile.desired_field || "",
            desired_program_type: profile.desired_program_type || undefined,
            preferred_intake: profile.preferred_intake || "",
            preferred_provinces: profile.preferred_provinces || [],
            excluded_provinces: profile.excluded_provinces || [],
            max_tuition: profile.max_tuition?.toString() || "",
            max_application_fee: profile.max_application_fee?.toString() || "",
            prioritize_fee_free: profile.prioritize_fee_free ?? false,
            exclude_supervisor_required: profile.exclude_supervisor_required ?? false,
            prefer_thesis: profile.prefer_thesis ?? undefined,
            is_international_student: profile.is_international_student ?? true,
            study_permit_required: profile.study_permit_required ?? true,
            prefer_international_friendly: profile.prefer_international_friendly ?? true,
            prefer_pgwp_eligible: profile.prefer_pgwp_eligible ?? true,
          });
        }
      } else if (profileRes.status === 401) {
        router.push("/login?redirect=/onboarding");
        return;
      }

      setLoading(false);
    }
    load();
  }, [reset, router]);

  async function onSubmit(data: ProfileForm) {
    setSaving(true);
    const num = (v?: string) => (v ? Number(v) : undefined);
    const payload = {
      ...data,
      age: parseAgeForSubmit(data.age),
      graduation_year:
        data.graduation_year === "In progress" || !data.graduation_year
          ? undefined
          : num(data.graduation_year),
      gpa: num(data.gpa),
      gpa_scale: num(data.gpa_scale) ?? 4.0,
      years_of_experience: num(data.years_of_experience),
      language_test_score: num(data.language_test_score),
      max_tuition: num(data.max_tuition),
      max_application_fee: num(data.max_application_fee),
      relevant_courses: data.relevant_courses?.split(",").map((s) => s.trim()).filter(Boolean),
      research_interests: data.research_interests?.split(",").map((s) => s.trim()).filter(Boolean),
    };

    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  function toggleProvince(province: string, list: "preferred" | "excluded") {
    const field = list === "preferred" ? "preferred_provinces" : "excluded_provinces";
    const current = watch(field) || [];
    const updated = current.includes(province)
      ? current.filter((p) => p !== province)
      : [...current, province];
    setValue(field, updated);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {loading ? (
        <p className="text-slate-500 py-12 text-center">Loading your profile...</p>
      ) : (
      <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Build Your Profile</h1>
        <p className="text-slate-500 mt-1">
          Step {step + 1} of {STEPS.length}: {STEPS[step].title}
          {step > 0 && (
            <span className="text-slate-400"> · Gmail setup is on step 1</span>
          )}
        </p>
        <Progress value={progress} className="mt-4" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step].title}</CardTitle>
          <CardDescription>{STEPS[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Connect Gmail to send supervisor emails (only after you approve) and sync application-related messages.
                  We never ask for your Gmail password.
                </p>
                <p className="text-sm text-slate-500">
                  Click <strong>Next</strong> below to answer profile questions with dropdown menus (country, degree, GPA scale, etc.).
                </p>
                <GmailConnectButton />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Skip for now — continue to profile
                </Button>
              </div>
            )}

            {step === 1 && (
              <>
                <Field label="Full name" id="full_name" required {...register("full_name")} placeholder="e.g. Jane Doe" />
                <Field label="Email" id="email" type="email" {...register("email")} placeholder="your.email@example.com" />
                <SelectField
                  label="Citizenship country"
                  id="citizenship_country"
                  required
                  value={watch("citizenship_country") || ""}
                  onChange={(v) => setValue("citizenship_country", v)}
                  options={countryOptions()}
                  hint="Country on your passport"
                />
                <SelectField
                  label="Current country of residence"
                  id="current_country"
                  required
                  value={watch("current_country") || ""}
                  onChange={(v) => setValue("current_country", v)}
                  options={countryOptions()}
                />
                <SelectField
                  label="Age range"
                  id="age"
                  value={watch("age") || ""}
                  onChange={(v) => setValue("age", v)}
                  options={AGE_RANGES.map((o) => ({ value: o.value, label: o.label }))}
                />
                <Field label="Phone number" id="phone_number" {...register("phone_number")} placeholder="+234 800 000 0000 or +1 416 555 0100" />
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <p className="text-sm font-medium text-slate-700">Mailing address</p>
                  <Field label="Street address" id="mailing_street" {...register("mailing_street")} placeholder="Street and number" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="City" id="mailing_city" {...register("mailing_city")} />
                    <Field label="Province / state" id="mailing_province_state" {...register("mailing_province_state")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Postal / ZIP code" id="mailing_postal_code" {...register("mailing_postal_code")} />
                    <SelectField
                      label="Country"
                      id="mailing_country"
                      value={watch("mailing_country") || ""}
                      onChange={(v) => setValue("mailing_country", v)}
                      options={countryOptions()}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <SelectField
                  label="Highest qualification completed"
                  id="highest_qualification"
                  value={watch("highest_qualification") || ""}
                  onChange={(v) => setValue("highest_qualification", v)}
                  options={[...HIGHEST_QUALIFICATIONS]}
                />
                <SelectField
                  label="Degree title"
                  id="degree_name"
                  value={
                    DEGREE_NAMES.some((d) => d.value === watch("degree_name"))
                      ? watch("degree_name") || ""
                      : watch("degree_name")
                        ? "Other"
                        : ""
                  }
                  onChange={(v) => setValue("degree_name", v === "Other" ? "Other" : v)}
                  options={[...DEGREE_NAMES]}
                  hint="Select closest match, or choose Other and type below"
                />
                {(
                  watch("degree_name") === "Other" ||
                  (watch("degree_name") && !DEGREE_NAMES.some((d) => d.value === watch("degree_name")))
                ) && (
                  <Field
                    label="Degree title (custom)"
                    id="degree_name_custom"
                    value={
                      watch("degree_name") === "Other" || !watch("degree_name")
                        ? ""
                        : DEGREE_NAMES.some((d) => d.value === watch("degree_name"))
                          ? ""
                          : watch("degree_name") || ""
                    }
                    onChange={(e) => setValue("degree_name", e.target.value)}
                    placeholder="e.g. B.Sc. Microbiology"
                  />
                )}
                <Field label="University / institution" id="university" {...register("university")} placeholder="e.g. University of Lagos" />
                <SelectField
                  label="Graduation year"
                  id="graduation_year"
                  value={watch("graduation_year") || ""}
                  onChange={(v) => setValue("graduation_year", v)}
                  options={graduationYearOptions().filter((o) => o.value !== "")}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="GPA" id="gpa" type="number" step="0.01" {...register("gpa")} placeholder="e.g. 3.0" />
                  <SelectField
                    label="GPA scale"
                    id="gpa_scale"
                    value={watch("gpa_scale") || "4.0"}
                    onChange={(v) => setValue("gpa_scale", v)}
                    options={[...GPA_SCALES]}
                  />
                </div>
                <SelectField
                  label="Degree classification (if applicable)"
                  id="degree_classification"
                  value={watch("degree_classification") || ""}
                  onChange={(v) => setValue("degree_classification", v)}
                  options={[...DEGREE_CLASSIFICATIONS]}
                  hint="e.g. Second Class Lower, First Class — common in UK/Nigeria/Africa"
                />
                <SelectField
                  label="Major / field of study"
                  id="major"
                  value={
                    fieldOptions(catalogFields).some((f) => f.value === watch("major"))
                      ? watch("major") || ""
                      : watch("major")
                        ? "Other"
                        : ""
                  }
                  onChange={(v) => setValue("major", v === "Other" ? "Other" : v)}
                  options={fieldOptions(catalogFields)}
                />
                {(
                  watch("major") === "Other" ||
                  (watch("major") && !fieldOptions(catalogFields).some((f) => f.value === watch("major")))
                ) && (
                  <Field
                    label="Major (custom)"
                    id="major_custom"
                    value={
                      watch("major") === "Other" || !watch("major")
                        ? ""
                        : fieldOptions(catalogFields).some((f) => f.value === watch("major"))
                          ? ""
                          : watch("major") || ""
                    }
                    onChange={(e) => setValue("major", e.target.value)}
                    placeholder="Your field of study"
                  />
                )}
                <div className="space-y-2">
                  <Label htmlFor="relevant_courses">Relevant undergraduate courses</Label>
                  <p className="text-xs text-slate-500">Pick suggestions or type comma-separated courses</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COURSE_SUGGESTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-red-50"
                        onClick={() => {
                          const current = watch("relevant_courses") || "";
                          const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
                          if (!parts.includes(c)) setValue("relevant_courses", [...parts, c].join(", "));
                        }}
                      >
                        + {c}
                      </button>
                    ))}
                  </div>
                  <Input id="relevant_courses" {...register("relevant_courses")} placeholder="Biochemistry, Statistics, Microbiology" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final_year_project">Final year project / thesis title</Label>
                  <Textarea id="final_year_project" {...register("final_year_project")} placeholder="Brief title and what you studied" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="research_interests">Research interests</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {RESEARCH_INTEREST_SUGGESTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-red-50"
                        onClick={() => {
                          const current = watch("research_interests") || "";
                          const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
                          if (!parts.includes(r)) setValue("research_interests", [...parts, r].join(", "));
                        }}
                      >
                        + {r}
                      </button>
                    ))}
                  </div>
                  <Input id="research_interests" {...register("research_interests")} placeholder="Microbiology, antimicrobial resistance" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_experience">Work experience (optional)</Label>
                  <Textarea id="work_experience" {...register("work_experience")} placeholder="Job title, employer, key responsibilities" />
                </div>
                <SelectField
                  label="Years of work experience"
                  id="years_of_experience"
                  value={watch("years_of_experience") || ""}
                  onChange={(v) => setValue("years_of_experience", v)}
                  options={[...YEARS_OF_EXPERIENCE]}
                />
              </>
            )}

            {step === 3 && (
              <>
                <SelectField
                  label="English test type"
                  id="language_test_type"
                  value={watch("language_test_type") || ""}
                  onChange={(v) => setValue("language_test_type", v)}
                  options={LANGUAGE_TEST_TYPES.filter((o) => o.value !== "").map((o) => o)}
                />
                <Field
                  label="Test score"
                  id="language_test_score"
                  type="number"
                  step="0.5"
                  {...register("language_test_score")}
                  placeholder={watch("language_test_type") === "IELTS" ? "e.g. 7.0" : "Enter your score"}
                />
                {watch("language_test_type") && LANGUAGE_SCORE_HINTS[watch("language_test_type") || ""] && (
                  <p className="text-xs text-slate-500">{LANGUAGE_SCORE_HINTS[watch("language_test_type") || ""]}</p>
                )}
                <CheckboxField
                  label="My previous degree was taught entirely in English"
                  checked={watch("english_instruction_language") || false}
                  onChange={(v) => setValue("english_instruction_language", v)}
                />
                <p className="text-xs text-slate-500">
                  This does not automatically satisfy every university&apos;s English requirement — always verify with the program.
                </p>
              </>
            )}

            {step === 4 && (
              <>
                <SelectField
                  label="Desired qualification level"
                  id="desired_qualification"
                  value={watch("desired_qualification") || ""}
                  onChange={(v) => setValue("desired_qualification", v)}
                  options={[...DESIRED_QUALIFICATIONS]}
                />
                <SelectField
                  label="Desired field of study"
                  id="desired_field"
                  value={
                    fieldOptions(catalogFields).some((f) => f.value === watch("desired_field"))
                      ? watch("desired_field") || ""
                      : watch("desired_field")
                        ? "Other"
                        : ""
                  }
                  onChange={(v) => setValue("desired_field", v === "Other" ? "Other" : v)}
                  options={fieldOptions(catalogFields)}
                />
                {(
                  watch("desired_field") === "Other" ||
                  (watch("desired_field") && !fieldOptions(catalogFields).some((f) => f.value === watch("desired_field")))
                ) && (
                  <Field
                    label="Desired field (custom)"
                    id="desired_field_custom"
                    value={
                      watch("desired_field") === "Other" || !watch("desired_field")
                        ? ""
                        : fieldOptions(catalogFields).some((f) => f.value === watch("desired_field"))
                          ? ""
                          : watch("desired_field") || ""
                    }
                    onChange={(e) => setValue("desired_field", e.target.value)}
                    placeholder="e.g. Food Microbiology"
                  />
                )}
                <div className="space-y-2">
                  <Label>Program type preference</Label>
                  <Select {...register("desired_program_type")}>
                    <option value="">No preference — show all types</option>
                    <option value="thesis">Thesis / research-based</option>
                    <option value="course_based">Course-based</option>
                    <option value="coop">Co-op / internship</option>
                    <option value="mixed">Mixed (coursework + research)</option>
                  </Select>
                </div>
                <SelectField
                  label="Preferred intake"
                  id="preferred_intake"
                  value={watch("preferred_intake") || ""}
                  onChange={(v) => setValue("preferred_intake", v)}
                  options={intakeOptions(catalogIntakes)}
                />
                <div className="space-y-2">
                  <Label>Preferred provinces</Label>
                  <div className="flex flex-wrap gap-2">
                    {provinces.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleProvince(p, "preferred")}
                        className={`rounded-full px-3 py-1 text-xs font-medium border ${
                          watch("preferred_provinces")?.includes(p)
                            ? "bg-red-100 border-red-300 text-red-800"
                            : "bg-white border-slate-300 text-slate-600"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Excluded provinces</Label>
                  <div className="flex flex-wrap gap-2">
                    {provinces.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleProvince(p, "excluded")}
                        className={`rounded-full px-3 py-1 text-xs font-medium border ${
                          watch("excluded_provinces")?.includes(p)
                            ? "bg-slate-200 border-slate-400 text-slate-800"
                            : "bg-white border-slate-300 text-slate-600"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="Max tuition budget (CAD/year)"
                    id="max_tuition"
                    value={watch("max_tuition") || ""}
                    onChange={(v) => setValue("max_tuition", v)}
                    options={[...TUITION_BUDGET_OPTIONS]}
                  />
                  <SelectField
                    label="Max application fee (CAD)"
                    id="max_application_fee"
                    value={watch("max_application_fee") || ""}
                    onChange={(v) => setValue("max_application_fee", v)}
                    options={[...APPLICATION_FEE_OPTIONS]}
                  />
                </div>
                <CheckboxField label="Prioritize fee-free applications" checked={watch("prioritize_fee_free") || false} onChange={(v) => setValue("prioritize_fee_free", v)} />
                <CheckboxField label="Exclude supervisor-required programs" checked={watch("exclude_supervisor_required") || false} onChange={(v) => setValue("exclude_supervisor_required", v)} />
                <CheckboxField label="Prefer thesis-based programs" checked={watch("prefer_thesis") || false} onChange={(v) => setValue("prefer_thesis", v)} />
              </>
            )}

            {step === 5 && (
              <>
                <CheckboxField label="I am an international student" checked={watch("is_international_student") ?? true} onChange={(v) => setValue("is_international_student", v)} />
                <CheckboxField label="Study permit required" checked={watch("study_permit_required") ?? true} onChange={(v) => setValue("study_permit_required", v)} />
                <CheckboxField label="Prefer international-friendly programs" checked={watch("prefer_international_friendly") ?? true} onChange={(v) => setValue("prefer_international_friendly", v)} />
                <CheckboxField label="Prefer PGWP-eligible programs" checked={watch("prefer_pgwp_eligible") ?? true} onChange={(v) => setValue("prefer_pgwp_eligible", v)} />
                <Alert variant="info">
                  Your profile helps us match you to programs. All data stays private to your account.
                </Alert>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={() => setStep(step + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Complete Profile"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}

function parseAgeForSubmit(ageStr?: string): number | undefined {
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

function Field({
  label,
  id,
  type = "text",
  step,
  placeholder,
  required,
  value,
  onChange,
  ...inputProps
}: {
  label: string;
  id: string;
  type?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required && " *"}</Label>
      <Input
        id={id}
        type={type}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...inputProps}
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}
