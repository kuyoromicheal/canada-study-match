"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GmailConnectButton } from "@/components/gmail/gmail-connect-button";
import { FormSelectField } from "@/components/forms/form-select-field";
import {
  formatPhoneWithCountryCode,
  parsePhoneNumber,
  PhoneInput,
} from "@/components/forms/phone-input";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  AGE_RANGE_OPTIONS,
  APPLICATION_FEE_OPTIONS,
  booleansToInternationalStatus,
  buildProgramFieldOptions,
  COURSE_SUGGESTIONS,
  FIELD_CATEGORY_OPTIONS,
  getCountryOptions,
  getDegreeClassificationOptions,
  getOptionLabel,
  GPA_SCALE_OPTIONS,
  graduationYearOptions,
  internationalStatusToBooleans,
  INSTITUTION_TYPE_FILTER_OPTIONS,
  INTAKE_TERM_OPTIONS,
  LANGUAGE_SCORE_CONFIG,
  LANGUAGE_TEST_OPTIONS,
  parseAgeRangeForSubmit,
  PGWP_PREFERENCE_OPTIONS,
  PROGRAM_TYPE_OPTIONS,
  QUALIFICATION_OPTIONS,
  RESEARCH_INTEREST_SUGGESTIONS,
  resolveCountryCode,
  TUITION_BUDGET_OPTIONS,
  validateLanguageScore,
  YEARS_OF_EXPERIENCE_OPTIONS,
  INTERNATIONAL_STUDENT_STATUS_OPTIONS,
  type InternationalStudentStatus,
  type LanguageTestType,
  type PgwpPreference,
} from "@/lib/constants/form-options";
import { CANADIAN_PROVINCES } from "@/types/database";
import { notifyAppDataChanged } from "@/lib/realtime/events";

const profileSchema = z.object({
  full_name: z.string().min(1, "Required"),
  citizenship_country: z.string().min(1, "Required"),
  current_country: z.string().min(1, "Required"),
  age: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone_country_code: z.string().optional(),
  phone_local: z.string().optional(),
  mailing_street: z.string().optional(),
  mailing_city: z.string().optional(),
  mailing_province_state: z.string().optional(),
  mailing_postal_code: z.string().optional(),
  mailing_country: z.string().optional(),
  highest_qualification: z.string().optional(),
  highest_qualification_other: z.string().optional(),
  degree_name: z.string().optional(),
  university: z.string().optional(),
  graduation_year: z.string().optional(),
  gpa: z.string().optional(),
  gpa_scale: z.string().optional(),
  gpa_scale_other: z.string().optional(),
  degree_classification: z.string().optional(),
  major: z.string().min(1, "Select your major from the program field list"),
  relevant_courses: z.string().optional(),
  final_year_project: z.string().optional(),
  research_interests: z.string().optional(),
  work_experience: z.string().optional(),
  years_of_experience: z.string().optional(),
  language_test_type: z.string().optional(),
  language_test_score: z.string().optional(),
  english_instruction_language: z.boolean().optional(),
  desired_qualification: z.string().optional(),
  field_category: z.string().min(1, "Select a field category"),
  desired_field: z.string().optional(),
  desired_program_type: z.enum(["thesis", "course_based", "coop", "mixed"]).optional(),
  preferred_intake: z.string().optional(),
  preferred_institution_type: z.string().optional(),
  preferred_provinces: z.array(z.string()).optional(),
  excluded_provinces: z.array(z.string()).optional(),
  max_tuition: z.string().optional(),
  max_application_fee: z.string().optional(),
  prioritize_fee_free: z.boolean().optional(),
  exclude_supervisor_required: z.boolean().optional(),
  prefer_thesis: z.boolean().optional(),
  international_student_status: z.string().optional(),
  pgwp_preference: z.string().optional(),
  prefer_international_friendly: z.boolean().optional(),
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

const countryOptions = getCountryOptions();

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalogFields, setCatalogFields] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      gpa_scale: "4.0",
      english_instruction_language: false,
      prioritize_fee_free: false,
      exclude_supervisor_required: false,
      prefer_international_friendly: true,
      international_student_status: "requires_study_permit",
      pgwp_preference: "prefer_pgwp",
      preferred_provinces: [],
      excluded_provinces: [],
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form;
  const progress = ((step + 1) / STEPS.length) * 100;

  const programFieldOptions = useMemo(
    () => buildProgramFieldOptions(catalogFields),
    [catalogFields]
  );

  const classificationOptions = useMemo(
    () => getDegreeClassificationOptions(watch("citizenship_country")),
    [watch("citizenship_country")]
  );

  const languageTest = watch("language_test_type") as LanguageTestType | "";
  const scoreConfig =
    languageTest && languageTest !== "none"
      ? LANGUAGE_SCORE_CONFIG[languageTest as Exclude<LanguageTestType, "none">]
      : null;

  useEffect(() => {
    async function load() {
      const [filtersRes, profileRes] = await Promise.all([
        fetch("/api/catalog-filters"),
        fetch("/api/profile"),
      ]);

      if (filtersRes.ok) {
        const filters = await filtersRes.json();
        setCatalogFields(filters.fields || []);
      }

      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        if (profile) {
          const phone = parsePhoneNumber(profile.phone_number);
          reset({
            full_name: profile.full_name || "",
            citizenship_country: resolveCountryCode(profile.citizenship_country),
            current_country: resolveCountryCode(profile.current_country),
            age: profile.age_range || profile.age?.toString() || "",
            email: profile.email || "",
            phone_country_code: phone.countryCode || resolveCountryCode(profile.citizenship_country),
            phone_local: phone.localNumber,
            mailing_street: profile.mailing_street || "",
            mailing_city: profile.mailing_city || "",
            mailing_province_state: profile.mailing_province_state || "",
            mailing_postal_code: profile.mailing_postal_code || "",
            mailing_country: resolveCountryCode(profile.mailing_country),
            highest_qualification: profile.highest_qualification || "",
            degree_name: profile.degree_name || "",
            university: profile.university || "",
            graduation_year: profile.graduation_year != null ? String(profile.graduation_year) : "",
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
            field_category: profile.field_category || profile.desired_field || "",
            desired_field: profile.desired_field || "",
            desired_program_type: profile.desired_program_type || undefined,
            preferred_intake: profile.preferred_intake || "",
            preferred_institution_type: profile.preferred_institution_type || "",
            preferred_provinces: profile.preferred_provinces || [],
            excluded_provinces: profile.excluded_provinces || [],
            max_tuition: profile.max_tuition?.toString() || "",
            max_application_fee: profile.max_application_fee?.toString() || "",
            prioritize_fee_free: profile.prioritize_fee_free ?? false,
            exclude_supervisor_required: profile.exclude_supervisor_required ?? false,
            prefer_thesis: profile.prefer_thesis ?? undefined,
            international_student_status: booleansToInternationalStatus(
              profile.is_international_student,
              profile.study_permit_required
            ),
            pgwp_preference: profile.prefer_pgwp_eligible ? "prefer_pgwp" : "no_preference",
            prefer_international_friendly: profile.prefer_international_friendly ?? true,
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
    setFormError(null);
    const num = (v?: string) => (v ? Number(v) : undefined);
    const langScore = data.language_test_score ? Number(data.language_test_score) : undefined;
    const langError = validateLanguageScore(data.language_test_type, langScore);
    if (langError) {
      setFormError(langError);
      setStep(3);
      return;
    }

    const intl = internationalStatusToBooleans(
      (data.international_student_status || "requires_study_permit") as InternationalStudentStatus
    );
    const pgwpPref = (data.pgwp_preference || "no_preference") as PgwpPreference;

    const payload = {
      full_name: data.full_name,
      citizenship_country: data.citizenship_country,
      current_country: data.current_country,
      age: parseAgeRangeForSubmit(data.age),
      age_range: data.age,
      email: data.email,
      phone_number: formatPhoneWithCountryCode(
        data.phone_country_code || data.citizenship_country,
        data.phone_local || ""
      ),
      mailing_street: data.mailing_street,
      mailing_city: data.mailing_city,
      mailing_province_state: data.mailing_province_state,
      mailing_postal_code: data.mailing_postal_code,
      mailing_country: data.mailing_country,
      highest_qualification:
        data.highest_qualification === "other"
          ? data.highest_qualification_other
          : data.highest_qualification,
      degree_name: data.degree_name,
      university: data.university,
      graduation_year:
        data.graduation_year === "in_progress" || !data.graduation_year
          ? undefined
          : num(data.graduation_year),
      gpa: num(data.gpa),
      gpa_scale:
        data.gpa_scale === "other"
          ? num(data.gpa_scale_other)
          : num(data.gpa_scale) ?? 4.0,
      degree_classification: data.degree_classification || undefined,
      major: data.major,
      relevant_courses: data.relevant_courses?.split(",").map((s) => s.trim()).filter(Boolean),
      final_year_project: data.final_year_project,
      research_interests: data.research_interests?.split(",").map((s) => s.trim()).filter(Boolean),
      work_experience: data.work_experience,
      years_of_experience: num(data.years_of_experience),
      language_test_type: data.language_test_type || undefined,
      language_test_score: langScore,
      english_instruction_language: data.english_instruction_language ?? false,
      desired_qualification: data.desired_qualification,
      field_category: data.field_category,
      desired_field: data.desired_field || data.major,
      desired_program_type: data.desired_program_type,
      preferred_intake: data.preferred_intake,
      preferred_institution_type: data.preferred_institution_type || undefined,
      preferred_provinces: data.preferred_provinces,
      excluded_provinces: data.excluded_provinces,
      max_tuition: num(data.max_tuition),
      max_application_fee: num(data.max_application_fee),
      prioritize_fee_free: data.prioritize_fee_free ?? false,
      exclude_supervisor_required: data.exclude_supervisor_required ?? false,
      prefer_thesis: data.prefer_thesis,
      is_international_student: intl.is_international_student,
      study_permit_required: intl.study_permit_required,
      prefer_international_friendly: data.prefer_international_friendly ?? true,
      prefer_pgwp_eligible: pgwpPref !== "no_preference",
    };

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "Failed to save profile");
        return;
      }
      notifyAppDataChanged();
      router.push("/dashboard");
    } catch {
      setFormError("Failed to save profile");
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

  if (loading) {
    return <p className="text-slate-500 py-12 text-center max-w-2xl mx-auto">Loading your profile...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Build Your Profile</h1>
        <p className="text-slate-500 mt-1">
          Step {step + 1} of {STEPS.length}: {STEPS[step].title}
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
            {formError && (
              <Alert variant="error" title="Could not save">{formError}</Alert>
            )}

            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Connect Gmail to send supervisor emails (only after you approve) and sync application-related messages.
                </p>
                <GmailConnectButton />
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Skip for now — continue to profile
                </Button>
              </div>
            )}

            {step === 1 && (
              <>
                <Field label="Full name" id="full_name" required {...register("full_name")} placeholder="e.g. Jane Doe" />
                <Field label="Email" id="email" type="email" {...register("email")} placeholder="your.email@example.com" />
                <SearchableCombobox
                  id="citizenship_country"
                  label="Country of citizenship"
                  required
                  value={watch("citizenship_country") || ""}
                  onChange={(v) => {
                    setValue("citizenship_country", v);
                    if (!watch("phone_country_code")) setValue("phone_country_code", v);
                  }}
                  options={countryOptions}
                  hint="Country on your passport (ISO standard list)"
                />
                <SearchableCombobox
                  id="current_country"
                  label="Current country of residence"
                  required
                  value={watch("current_country") || ""}
                  onChange={(v) => setValue("current_country", v)}
                  options={countryOptions}
                />
                <FormSelectField
                  label="Age range"
                  id="age"
                  value={watch("age") || ""}
                  onChange={(v) => setValue("age", v)}
                  options={AGE_RANGE_OPTIONS}
                />
                <PhoneInput
                  countryCode={watch("phone_country_code") || watch("citizenship_country") || ""}
                  phoneNumber={watch("phone_local") || ""}
                  onCountryCodeChange={(v) => setValue("phone_country_code", v)}
                  onPhoneNumberChange={(v) => setValue("phone_local", v)}
                />
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <p className="text-sm font-medium text-slate-700">Mailing address</p>
                  <Field label="Street address" id="mailing_street" {...register("mailing_street")} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="City" id="mailing_city" {...register("mailing_city")} />
                    <Field label="Province / state" id="mailing_province_state" {...register("mailing_province_state")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Postal / ZIP code" id="mailing_postal_code" {...register("mailing_postal_code")} />
                    <SearchableCombobox
                      id="mailing_country"
                      label="Country"
                      value={watch("mailing_country") || ""}
                      onChange={(v) => setValue("mailing_country", v)}
                      options={countryOptions}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <FormSelectField
                  label="Highest qualification completed"
                  id="highest_qualification"
                  value={watch("highest_qualification") || ""}
                  onChange={(v) => setValue("highest_qualification", v)}
                  options={QUALIFICATION_OPTIONS}
                />
                {watch("highest_qualification") === "other" && (
                  <Field label="Qualification (specify)" id="highest_qualification_other" {...register("highest_qualification_other")} />
                )}
                <Field label="Degree title" id="degree_name" {...register("degree_name")} placeholder="e.g. B.Sc. Microbiology" />
                <Field label="University / institution" id="university" {...register("university")} placeholder="e.g. University of Lagos" />
                <FormSelectField
                  label="Graduation year"
                  id="graduation_year"
                  value={watch("graduation_year") || ""}
                  onChange={(v) => setValue("graduation_year", v)}
                  options={graduationYearOptions()}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="GPA" id="gpa" type="number" step="0.01" {...register("gpa")} placeholder="e.g. 3.0" />
                  <FormSelectField
                    label="GPA scale"
                    id="gpa_scale"
                    value={watch("gpa_scale") || "4.0"}
                    onChange={(v) => setValue("gpa_scale", v)}
                    options={GPA_SCALE_OPTIONS}
                  />
                </div>
                {watch("gpa_scale") === "other" && (
                  <Field label="GPA scale (specify)" id="gpa_scale_other" type="number" step="0.1" {...register("gpa_scale_other")} />
                )}
                {classificationOptions.length > 0 && (
                  <FormSelectField
                    label="Degree classification"
                    id="degree_classification"
                    value={watch("degree_classification") || ""}
                    onChange={(v) => setValue("degree_classification", v)}
                    options={classificationOptions}
                    hint={`Options for ${getOptionLabel(countryOptions, watch("citizenship_country")) || "your country"}`}
                  />
                )}
                <SearchableCombobox
                  id="major"
                  label="Major / field of study"
                  required
                  value={watch("major") || ""}
                  onChange={(v) => setValue("major", v)}
                  options={programFieldOptions}
                  hint="Must match program fields in our catalog for accurate matching"
                />
                {errors.major && <p className="text-xs text-red-600">{errors.major.message}</p>}
                <ChipSuggestions label="Relevant courses" suggestions={COURSE_SUGGESTIONS} value={watch("relevant_courses") || ""} onChange={(v) => setValue("relevant_courses", v)} inputId="relevant_courses" register={register} fieldName="relevant_courses" />
                <div className="space-y-2">
                  <Label htmlFor="final_year_project">Final year project / thesis title</Label>
                  <Textarea id="final_year_project" {...register("final_year_project")} />
                </div>
                <ChipSuggestions label="Research interests" suggestions={RESEARCH_INTEREST_SUGGESTIONS} value={watch("research_interests") || ""} onChange={(v) => setValue("research_interests", v)} inputId="research_interests" register={register} fieldName="research_interests" />
                <div className="space-y-2">
                  <Label htmlFor="work_experience">Work experience (optional)</Label>
                  <Textarea id="work_experience" {...register("work_experience")} />
                </div>
                <FormSelectField
                  label="Years of work experience"
                  id="years_of_experience"
                  value={watch("years_of_experience") || ""}
                  onChange={(v) => setValue("years_of_experience", v)}
                  options={YEARS_OF_EXPERIENCE_OPTIONS}
                />
              </>
            )}

            {step === 3 && (
              <>
                <FormSelectField
                  label="English test"
                  id="language_test_type"
                  value={watch("language_test_type") || ""}
                  onChange={(v) => {
                    setValue("language_test_type", v);
                    setValue("language_test_score", "");
                  }}
                  options={LANGUAGE_TEST_OPTIONS}
                />
                {scoreConfig && (
                  <Field
                    label={scoreConfig.label}
                    id="language_test_score"
                    type="number"
                    step={String(scoreConfig.step)}
                    min={scoreConfig.min}
                    max={scoreConfig.max}
                    {...register("language_test_score")}
                    placeholder={`${scoreConfig.min}–${scoreConfig.max}`}
                  />
                )}
                {scoreConfig && <p className="text-xs text-slate-500">{scoreConfig.hint}</p>}
                <CheckboxField
                  label="My previous degree was taught entirely in English"
                  checked={watch("english_instruction_language") || false}
                  onChange={(v) => setValue("english_instruction_language", v)}
                />
              </>
            )}

            {step === 4 && (
              <>
                <FormSelectField
                  label="Desired qualification level"
                  id="desired_qualification"
                  value={watch("desired_qualification") || ""}
                  onChange={(v) => setValue("desired_qualification", v)}
                  options={QUALIFICATION_OPTIONS}
                />
                <SearchableCombobox
                  id="field_category"
                  label="Desired field of study (broad category)"
                  required
                  value={watch("field_category") || ""}
                  onChange={(v) => setValue("field_category", v)}
                  options={FIELD_CATEGORY_OPTIONS}
                />
                {errors.field_category && <p className="text-xs text-red-600">{errors.field_category.message}</p>}
                <SearchableCombobox
                  id="desired_field"
                  label="Specific field (optional, matches program catalog)"
                  value={watch("desired_field") || ""}
                  onChange={(v) => setValue("desired_field", v)}
                  options={programFieldOptions}
                  hint="e.g. Microbiology under Biological & Biomedical Sciences"
                />
                <FormSelectField
                  label="Desired program type"
                  id="desired_program_type"
                  value={watch("desired_program_type") || ""}
                  onChange={(v) => setValue("desired_program_type", v as ProfileForm["desired_program_type"])}
                  options={PROGRAM_TYPE_OPTIONS}
                  placeholder="No preference"
                />
                <FormSelectField
                  label="Preferred intake"
                  id="preferred_intake"
                  value={watch("preferred_intake") || ""}
                  onChange={(v) => setValue("preferred_intake", v)}
                  options={INTAKE_TERM_OPTIONS}
                />
                <FormSelectField
                  label="Institution type preference"
                  id="preferred_institution_type"
                  value={watch("preferred_institution_type") || ""}
                  onChange={(v) => setValue("preferred_institution_type", v)}
                  options={INSTITUTION_TYPE_FILTER_OPTIONS}
                />
                <ProvinceMultiSelect label="Preferred provinces" provinces={CANADIAN_PROVINCES} selected={watch("preferred_provinces") || []} onToggle={(p) => toggleProvince(p, "preferred")} />
                <ProvinceMultiSelect label="Excluded provinces" provinces={CANADIAN_PROVINCES} selected={watch("excluded_provinces") || []} onToggle={(p) => toggleProvince(p, "excluded")} variant="excluded" />
                <div className="grid grid-cols-2 gap-4">
                  <FormSelectField label="Max tuition (CAD/year)" id="max_tuition" value={watch("max_tuition") || ""} onChange={(v) => setValue("max_tuition", v)} options={TUITION_BUDGET_OPTIONS} />
                  <FormSelectField label="Max application fee (CAD)" id="max_application_fee" value={watch("max_application_fee") || ""} onChange={(v) => setValue("max_application_fee", v)} options={APPLICATION_FEE_OPTIONS} />
                </div>
                <CheckboxField label="Prioritize fee-free applications" checked={watch("prioritize_fee_free") || false} onChange={(v) => setValue("prioritize_fee_free", v)} />
                <CheckboxField label="Exclude supervisor-required programs" checked={watch("exclude_supervisor_required") || false} onChange={(v) => setValue("exclude_supervisor_required", v)} />
                <CheckboxField label="Prefer thesis-based programs" checked={watch("prefer_thesis") || false} onChange={(v) => setValue("prefer_thesis", v)} />
              </>
            )}

            {step === 5 && (
              <>
                <FormSelectField
                  label="International student status"
                  id="international_student_status"
                  value={watch("international_student_status") || "requires_study_permit"}
                  onChange={(v) => setValue("international_student_status", v)}
                  options={INTERNATIONAL_STUDENT_STATUS_OPTIONS}
                />
                <FormSelectField
                  label="PGWP preference"
                  id="pgwp_preference"
                  value={watch("pgwp_preference") || "prefer_pgwp"}
                  onChange={(v) => setValue("pgwp_preference", v)}
                  options={PGWP_PREFERENCE_OPTIONS}
                />
                <CheckboxField label="Prefer international-friendly programs" checked={watch("prefer_international_friendly") ?? true} onChange={(v) => setValue("prefer_international_friendly", v)} />
                <Alert variant="info">Your profile helps us match you to programs. All data stays private to your account.</Alert>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={() => setStep(step + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
              ) : (
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Complete Profile"}</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label, id, type = "text", step, placeholder, required, ...inputProps
}: {
  label: string; id: string; type?: string; step?: string; placeholder?: string; required?: boolean;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required && " *"}</Label>
      <Input id={id} type={type} step={step} placeholder={placeholder} {...inputProps} />
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600" />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function ProvinceMultiSelect({
  label, provinces, selected, onToggle, variant = "preferred",
}: {
  label: string;
  provinces: readonly string[];
  selected: string[];
  onToggle: (p: string) => void;
  variant?: "preferred" | "excluded";
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {provinces.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onToggle(p)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              selected.includes(p)
                ? variant === "preferred"
                  ? "bg-red-100 border-red-300 text-red-800"
                  : "bg-slate-200 border-slate-400 text-slate-800"
                : "bg-white border-slate-300 text-slate-600"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipSuggestions({
  label, suggestions, value, onChange, inputId, register, fieldName,
}: {
  label: string;
  suggestions: readonly string[];
  value: string;
  onChange: (v: string) => void;
  inputId: string;
  register: ReturnType<typeof useForm<ProfileForm>>["register"];
  fieldName: "relevant_courses" | "research_interests";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {suggestions.map((c) => (
          <button
            key={c}
            type="button"
            className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-red-50"
            onClick={() => {
              const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
              if (!parts.includes(c)) onChange([...parts, c].join(", "));
            }}
          >
            + {c}
          </button>
        ))}
      </div>
      <Input id={inputId} {...register(fieldName)} placeholder="Comma-separated" />
    </div>
  );
}
