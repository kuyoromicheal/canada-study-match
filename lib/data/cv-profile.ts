import { createClient } from "@/lib/supabase/server";
import type { StudentProfile } from "@/types/database";

export interface CvProfile {
  id: string;
  user_id: string;
  personal_info: Record<string, string>;
  professional_summary: string | null;
  education: CvSectionItem[];
  research_experience: CvSectionItem[];
  work_experience: CvSectionItem[];
  projects: CvSectionItem[];
  laboratory_experience: CvSectionItem[];
  technical_skills: string[];
  research_interests: string[];
  publications: CvSectionItem[];
  certifications: CvSectionItem[];
  awards: CvSectionItem[];
  leadership: CvSectionItem[];
  volunteer_experience: CvSectionItem[];
  cv_references: CvSectionItem[];
  section_order: string[];
  updated_at: string;
}

export interface CvSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  bullets?: string[];
}

const DEFAULT_SECTION_ORDER = [
  "professional_summary",
  "education",
  "research_experience",
  "work_experience",
  "projects",
  "laboratory_experience",
  "technical_skills",
  "research_interests",
  "publications",
  "certifications",
  "awards",
  "leadership",
  "volunteer_experience",
];

function uid(): string {
  return crypto.randomUUID();
}

export function profileToCvSeed(profile: StudentProfile): Partial<CvProfile> {
  const education: CvSectionItem[] = [];
  if (profile.degree_name || profile.university) {
    education.push({
      id: uid(),
      title: profile.degree_name || profile.highest_qualification || "Degree",
      subtitle: profile.university || undefined,
      end_date: profile.graduation_year?.toString(),
      description: [
        profile.major && `Major: ${profile.major}`,
        profile.gpa && profile.gpa_scale && `GPA: ${profile.gpa}/${profile.gpa_scale}`,
        profile.degree_classification,
      ].filter(Boolean).join(" · "),
    });
  }

  const research: CvSectionItem[] = [];
  if (profile.final_year_project) {
    research.push({
      id: uid(),
      title: "Final Year Research Project",
      description: profile.final_year_project,
    });
  }

  const work: CvSectionItem[] = [];
  if (profile.work_experience) {
    work.push({
      id: uid(),
      title: profile.work_experience.split("\n")[0] || "Work Experience",
      description: profile.work_experience,
    });
  }

  return {
    personal_info: {
      full_name: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone_number || "",
      city: profile.mailing_city || "",
      country: profile.mailing_country || profile.citizenship_country || "",
    },
    education,
    research_experience: research,
    work_experience: work,
    research_interests: profile.research_interests || [],
    technical_skills: (profile.skills as string[]) || [],
    section_order: DEFAULT_SECTION_ORDER,
  };
}

export async function getCvProfile(userId: string): Promise<CvProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("cv_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data as CvProfile | null;
}

export async function upsertCvProfile(
  userId: string,
  input: Partial<CvProfile>
): Promise<CvProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const payload = {
    user_id: userId,
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("cv_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return null;
  return data as CvProfile;
}

export function cvProfileToText(cv: CvProfile): string {
  const lines: string[] = [];
  const pi = cv.personal_info;
  if (pi.full_name) lines.push(pi.full_name);
  if (pi.email || pi.phone) lines.push([pi.email, pi.phone].filter(Boolean).join(" | "));
  if (pi.city || pi.country) lines.push([pi.city, pi.country].filter(Boolean).join(", "));

  if (cv.professional_summary) {
    lines.push("\nPROFESSIONAL SUMMARY", cv.professional_summary);
  }

  const sections: [string, CvSectionItem[] | string[]][] = [
    ["EDUCATION", cv.education],
    ["RESEARCH EXPERIENCE", cv.research_experience],
    ["WORK EXPERIENCE", cv.work_experience],
    ["PROJECTS", cv.projects],
    ["LABORATORY EXPERIENCE", cv.laboratory_experience],
    ["TECHNICAL SKILLS", cv.technical_skills],
    ["RESEARCH INTERESTS", cv.research_interests],
    ["PUBLICATIONS", cv.publications],
    ["CERTIFICATIONS", cv.certifications],
    ["AWARDS", cv.awards],
    ["LEADERSHIP", cv.leadership],
    ["VOLUNTEER EXPERIENCE", cv.volunteer_experience],
    ["REFERENCES", cv.cv_references],
  ];

  for (const [heading, items] of sections) {
    if (!items?.length) continue;
    lines.push(`\n${heading}`);
    if (typeof items[0] === "string") {
      lines.push((items as string[]).join(", "));
    } else {
      for (const item of items as CvSectionItem[]) {
        lines.push(`\n${item.title}${item.subtitle ? ` — ${item.subtitle}` : ""}`);
        if (item.start_date || item.end_date) {
          lines.push(`${item.start_date || ""} – ${item.end_date || "Present"}`);
        }
        if (item.description) lines.push(item.description);
        item.bullets?.forEach((b) => lines.push(`• ${b}`));
      }
    }
  }

  return lines.join("\n");
}
