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
  { id: "personal", title: "Personal Info", description: "Basic details about you" },
  { id: "academic", title: "Academic Background", description: "Your education and experience" },
  { id: "language", title: "Language", description: "English proficiency" },
  { id: "preferences", title: "Study Preferences", description: "What you're looking for" },
  { id: "immigration", title: "Immigration", description: "International student preferences" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState<string[]>([]);

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

  useEffect(() => {
    async function load() {
      const [filtersRes, profileRes] = await Promise.all([
        fetch("/api/catalog-filters"),
        fetch("/api/profile"),
      ]);

      if (filtersRes.ok) {
        const filters = await filtersRes.json();
        setProvinces(filters.provinces || []);
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
      age: num(data.age),
      graduation_year: num(data.graduation_year),
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
        <p className="text-slate-500 mt-1">Step {step + 1} of {STEPS.length}: {STEPS[step].title}</p>
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
              <>
                <Field label="Full name" id="full_name" required {...register("full_name")} />
                <Field label="Email" id="email" type="email" {...register("email")} />
                <Field label="Citizenship country" id="citizenship_country" required {...register("citizenship_country")} />
                <Field label="Current country" id="current_country" required {...register("current_country")} />
                <Field label="Age" id="age" type="number" {...register("age")} />
                <Field label="Phone number" id="phone_number" {...register("phone_number")} placeholder="+1 416 555 0100" />
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <p className="text-sm font-medium text-slate-700">Mailing address</p>
                  <Field label="Street address" id="mailing_street" {...register("mailing_street")} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="City" id="mailing_city" {...register("mailing_city")} />
                    <Field label="Province / state" id="mailing_province_state" {...register("mailing_province_state")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Postal / ZIP code" id="mailing_postal_code" {...register("mailing_postal_code")} />
                    <Field label="Country" id="mailing_country" {...register("mailing_country")} />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Highest qualification" id="highest_qualification" {...register("highest_qualification")} />
                <Field label="Degree name" id="degree_name" {...register("degree_name")} />
                <Field label="University" id="university" {...register("university")} />
                <Field label="Graduation year" id="graduation_year" type="number" {...register("graduation_year")} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="GPA" id="gpa" type="number" step="0.01" {...register("gpa")} />
                  <Field label="GPA scale" id="gpa_scale" type="number" step="0.1" {...register("gpa_scale")} />
                </div>
                <Field label="Degree classification" id="degree_classification" {...register("degree_classification")} />
                <Field label="Major / field of study" id="major" {...register("major")} />
                <div className="space-y-2">
                  <Label htmlFor="relevant_courses">Relevant courses (comma-separated)</Label>
                  <Input id="relevant_courses" {...register("relevant_courses")} placeholder="Machine Learning, Algorithms" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final_year_project">Final year project</Label>
                  <Textarea id="final_year_project" {...register("final_year_project")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="research_interests">Research interests (comma-separated)</Label>
                  <Input id="research_interests" {...register("research_interests")} placeholder="AI, NLP, Machine Learning" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_experience">Work experience</Label>
                  <Textarea id="work_experience" {...register("work_experience")} />
                </div>
                <Field label="Years of experience" id="years_of_experience" type="number" step="0.5" {...register("years_of_experience")} />
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="language_test_type">Language test type</Label>
                  <Select id="language_test_type" {...register("language_test_type")}>
                    <option value="">Select...</option>
                    <option value="IELTS">IELTS</option>
                    <option value="TOEFL">TOEFL</option>
                    <option value="Duolingo">Duolingo</option>
                    <option value="PTE">PTE</option>
                    <option value="None">None yet</option>
                  </Select>
                </div>
                <Field label="Test score" id="language_test_score" type="number" step="0.5" {...register("language_test_score")} />
                <CheckboxField
                  label="English was my language of instruction"
                  checked={watch("english_instruction_language") || false}
                  onChange={(v) => setValue("english_instruction_language", v)}
                />
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Desired qualification" id="desired_qualification" placeholder="Master's, PhD..." {...register("desired_qualification")} />
                <Field label="Desired field" id="desired_field" {...register("desired_field")} />
                <div className="space-y-2">
                  <Label>Program type preference</Label>
                  <Select {...register("desired_program_type")}>
                    <option value="">No preference</option>
                    <option value="thesis">Thesis</option>
                    <option value="course_based">Course-based</option>
                    <option value="coop">Co-op</option>
                    <option value="mixed">Mixed</option>
                  </Select>
                </div>
                <Field label="Preferred intake" id="preferred_intake" placeholder="Fall 2026" {...register("preferred_intake")} />
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
                  <Field label="Max tuition (CAD/year)" id="max_tuition" type="number" {...register("max_tuition")} />
                  <Field label="Max application fee (CAD)" id="max_application_fee" type="number" {...register("max_application_fee")} />
                </div>
                <CheckboxField label="Prioritize fee-free applications" checked={watch("prioritize_fee_free") || false} onChange={(v) => setValue("prioritize_fee_free", v)} />
                <CheckboxField label="Exclude supervisor-required programs" checked={watch("exclude_supervisor_required") || false} onChange={(v) => setValue("exclude_supervisor_required", v)} />
                <CheckboxField label="Prefer thesis-based programs" checked={watch("prefer_thesis") || false} onChange={(v) => setValue("prefer_thesis", v)} />
              </>
            )}

            {step === 4 && (
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

function Field({
  label,
  id,
  type = "text",
  step,
  placeholder,
  required,
  ...inputProps
}: {
  label: string;
  id: string;
  type?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required && " *"}</Label>
      <Input id={id} type={type} step={step} placeholder={placeholder} {...inputProps} />
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
