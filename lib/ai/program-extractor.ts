import { classifySupervisorStatus } from "@/lib/matching/supervisor-detection";
import type { SupervisorStatus } from "@/types/database";

export interface ExtractedProgramDraft {
  name: string;
  field: string;
  degree_level: string;
  program_type: string;
  description: string;
  min_gpa: number | null;
  gpa_scale: number;
  english_requirement: string | null;
  prerequisites: string[];
  intakes: string[];
  application_fee: number | null;
  supervisor_status: SupervisorStatus;
  supervisor_requirement_text: string | null;
  supervisor_classification: string;
  deadlines: { intake: string; deadline_date: string }[];
  requirements: { category: string; title: string; description: string }[];
  tuition_amount: number | null;
  source_url: string;
  source_type: "ai_extracted_unverified";
  verification_status: "needs_verification";
}

export async function extractProgramFromUrl(
  url: string,
  pageText?: string
): Promise<ExtractedProgramDraft> {
  let content = pageText || "";

  if (!content) {
    const res = await fetch(url, {
      headers: { "User-Agent": "CanadaStudyMatch-Admin/1.0" },
    });
    content = await res.text();
    // Strip HTML tags for AI
    content = content.replace(/<script[\s\S]*?<\/script>/gi, " ");
    content = content.replace(/<style[\s\S]*?<\/style>/gi, " ");
    content = content.replace(/<[^>]+>/g, " ");
    content = content.replace(/\s+/g, " ").slice(0, 12000);
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Extract graduate program admission info from official university page text. Return JSON only with keys: name, field, degree_level (certificate|diploma|bachelor|master|phd), program_type (thesis|course_based|coop|mixed), description, min_gpa, english_requirement, prerequisites (array), intakes (array), application_fee (number|null), supervisor_requirement_text, deadlines ([{intake, deadline_date ISO}]), requirements ([{category,title,description}]), tuition_amount (number|null). Only extract what is explicitly stated. Use null for unknown fields. Do NOT invent data.`,
            },
            { role: "user", content: `URL: ${url}\n\nPage text:\n${content}` },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        const supText = parsed.supervisor_requirement_text || "";
        const classification = classifySupervisorStatus(
          parsed.supervisor_status || "unknown_verify",
          supText
        );
        const statusMap: Record<string, SupervisorStatus> = {
          SUPERVISOR_REQUIRED: "required",
          RECOMMENDED: "recommended",
          NOT_REQUIRED: "not_required",
          UNKNOWN_VERIFY: "unknown_verify",
        };

        return {
          name: parsed.name || "Untitled Program",
          field: parsed.field || "General",
          degree_level: parsed.degree_level || "master",
          program_type: parsed.program_type || "course_based",
          description: parsed.description || "",
          min_gpa: parsed.min_gpa ?? null,
          gpa_scale: 4.0,
          english_requirement: parsed.english_requirement ?? null,
          prerequisites: parsed.prerequisites || [],
          intakes: parsed.intakes || [],
          application_fee: parsed.application_fee ?? null,
          supervisor_status: statusMap[classification] || "unknown_verify",
          supervisor_requirement_text: supText || null,
          supervisor_classification: classification,
          deadlines: parsed.deadlines || [],
          requirements: parsed.requirements || [],
          tuition_amount: parsed.tuition_amount ?? null,
          source_url: url,
          source_type: "ai_extracted_unverified",
          verification_status: "needs_verification",
        };
      }
    } catch {
      // fallback below
    }
  }

  // Rule-based fallback extraction
  const ielts = content.match(/IELTS[^.\n]{0,80}/i)?.[0] ?? null;
  const gpa = content.match(/(?:GPA|grade point)[^.\n]{0,40}(\d\.\d)/i);
  const supText =
    content.match(/supervisor[^.\n]{0,120}/i)?.[0] ??
    content.match(/supervis(?:or|ion)[^.\n]{0,120}/i)?.[0] ??
    null;
  const classification = classifySupervisorStatus("unknown_verify", supText);

  return {
    name: "Program (review required)",
    field: "General",
    degree_level: "master",
    program_type: content.toLowerCase().includes("thesis") ? "thesis" : "course_based",
    description: content.slice(0, 500),
    min_gpa: gpa ? parseFloat(gpa[1]) : null,
    gpa_scale: 4.0,
    english_requirement: ielts,
    prerequisites: [],
    intakes: [],
    application_fee: null,
    supervisor_status:
      classification === "SUPERVISOR_REQUIRED"
        ? "required"
        : classification === "NOT_REQUIRED"
          ? "not_required"
          : classification === "RECOMMENDED"
            ? "recommended"
            : "unknown_verify",
    supervisor_requirement_text: supText,
    supervisor_classification: classification,
    deadlines: [],
    requirements: [],
    tuition_amount: null,
    source_url: url,
    source_type: "ai_extracted_unverified",
    verification_status: "needs_verification",
  };
}
