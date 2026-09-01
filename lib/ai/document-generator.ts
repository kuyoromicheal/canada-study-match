import type { ProgramWithDetails, StudentProfile } from "@/types/database";
import type { CvProfile } from "@/lib/data/cv-profile";
import { cvProfileToText } from "@/lib/data/cv-profile";
import { logAiGeneration, saveGeneratedDocument } from "@/lib/ai/generation-store";

const NO_FABRICATION_RULE =
  "CRITICAL: Never invent experience, qualifications, publications, employers, skills, awards, or achievements. Only reorganize, rewrite, and emphasize information actually provided by the student.";

async function callOpenAI(system: string, user: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: 2500,
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export interface CvGenerationResult {
  content: string;
  optimizationNotes: string;
  documentId?: string;
}

export async function generateProgramCv(params: {
  userId: string;
  profile: StudentProfile;
  cv: CvProfile;
  program: ProgramWithDetails;
}): Promise<CvGenerationResult> {
  const masterCv = cvProfileToText(params.cv);
  const programContext = [
    `Program: ${params.program.name}`,
    `University: ${params.program.school?.name}`,
    `Field: ${params.program.field}`,
    `Type: ${params.program.program_type}`,
    params.program.description && `Description: ${params.program.description.slice(0, 500)}`,
    params.program.prerequisites?.length && `Prerequisites: ${params.program.prerequisites.join(", ")}`,
    params.program.english_requirement && `English: ${params.program.english_requirement}`,
  ].filter(Boolean).join("\n");

  const system = `You are an academic CV writer for Canadian graduate program applications. ${NO_FABRICATION_RULE} Format as a clean academic CV with clear sections.`;

  const user = `Create a program-specific CV optimized for this program.

PROGRAM:
${programContext}

STUDENT MASTER CV (only use facts from here):
${masterCv}

Also provide a brief OPTIMIZATION NOTES section at the end explaining:
- What experiences to emphasize and why
- What to de-emphasize
- Relevant skills to highlight (only if student actually has them)
- Why the research project is relevant (if applicable)`;

  const aiContent = await callOpenAI(system, user);
  const content = aiContent || buildFallbackCv(params.cv, params.program);
  const optimizationNotes = extractOptimizationNotes(content);

  const saved = await saveGeneratedDocument({
    userId: params.userId,
    programId: params.program.id,
    documentType: "cv",
    title: `CV — ${params.program.name}`,
    content,
    optimizationNotes,
  });

  await logAiGeneration({
    userId: params.userId,
    generationType: "cv",
    programId: params.program.id,
    promptSummary: `CV for ${params.program.name}`,
    model: aiContent ? "gpt-4o-mini" : "template",
  });

  return { content, optimizationNotes, documentId: saved?.id };
}

function buildFallbackCv(cv: CvProfile, program: ProgramWithDetails): string {
  return `PROGRAM-SPECIFIC CV (Template)
Optimized for: ${program.name} at ${program.school?.name}

${cvProfileToText(cv)}

---
OPTIMIZATION NOTES:
- Emphasize education and research experience relevant to ${program.field}
- Highlight prerequisites you have completed: ${(program.prerequisites || []).join(", ") || "verify on program page"}
- Tailor professional summary to ${program.program_type} program requirements`;
}

function extractOptimizationNotes(content: string): string {
  const match = content.match(/OPTIMIZATION NOTES:?([\s\S]*?)$/i);
  return match ? match[1].trim() : "Review and tailor sections manually for this program.";
}

export interface SopGenerationResult {
  content: string;
  documentId?: string;
  wordCount: number;
}

export async function generateProgramSop(params: {
  userId: string;
  profile: StudentProfile;
  cv: CvProfile;
  program: ProgramWithDetails;
  options?: { tone?: "academic" | "natural"; maxWords?: number; documentType?: "sop" | "personal_statement" };
}): Promise<SopGenerationResult> {
  const maxWords = params.options?.maxWords || 1000;
  const docType = params.options?.documentType || "sop";
  const tone = params.options?.tone || "academic";

  const sopRequirements = params.program.required_documents?.find(
    (d) => d.doc_type === "statement_of_purpose" || d.title.toLowerCase().includes("statement")
  );

  const programContext = [
    `University: ${params.program.school?.name}`,
    `Program: ${params.program.name}`,
    `Field: ${params.program.field}`,
    params.program.description?.slice(0, 800),
    sopRequirements && `Requirement: ${sopRequirements.title} — ${sopRequirements.description || ""}`,
  ].filter(Boolean).join("\n");

  const studentContext = [
    cvProfileToText(params.cv),
    params.profile.research_interests?.length && `Research interests: ${params.profile.research_interests.join(", ")}`,
    params.profile.final_year_project && `Final year project: ${params.profile.final_year_project}`,
  ].filter(Boolean).join("\n\n");

  const structure = docType === "personal_statement"
    ? "Write a Personal Statement addressing the program's requirements."
    : `Structure: 1) Introduction 2) Academic background 3) Relevant coursework 4) Research experience 5) Work experience 6) Why this field 7) Why this program 8) Why this university 9) Research interests 10) Career goals 11) Contribution 12) Conclusion`;

  const system = `You write ${docType === "personal_statement" ? "personal statements" : "statements of purpose"} for Canadian graduate applications. Tone: ${tone}. Max ${maxWords} words. ${NO_FABRICATION_RULE} Be specific to the program — no generic "Dear Admissions Committee, I am passionate" openings.`;

  const user = `PROGRAM:\n${programContext}\n\nSTUDENT PROFILE (facts only):\n${studentContext}\n\n${structure}`;

  const aiContent = await callOpenAI(system, user);
  const content = aiContent || `[Draft ${docType.toUpperCase()} for ${params.program.name}]\n\nComplete your CV profile for a full AI-generated statement.`;

  const saved = await saveGeneratedDocument({
    userId: params.userId,
    programId: params.program.id,
    documentType: docType,
    title: `${docType === "personal_statement" ? "Personal Statement" : "SOP"} — ${params.program.name}`,
    content,
  });

  await logAiGeneration({
    userId: params.userId,
    generationType: docType,
    programId: params.program.id,
    model: aiContent ? "gpt-4o-mini" : "template",
  });

  return { content, documentId: saved?.id, wordCount: content.split(/\s+/).length };
}

export async function generateResearchProposal(params: {
  userId: string;
  profile: StudentProfile;
  program: ProgramWithDetails;
  supervisorResearchAreas?: string[];
}): Promise<{ content: string; documentId?: string }> {
  const system = `You draft research proposal outlines for Canadian graduate applications. ${NO_FABRICATION_RULE} Label output as AI-GENERATED DRAFT. Do not fabricate references or prior findings. Use sections: Title, Background, Problem Statement, Research Question, Objectives, Brief Methodology, Expected Outcomes, References (list only if student provided them).`;

  const user = `Program: ${params.program.name} at ${params.program.school?.name}
Field: ${params.program.field}
Student research: ${params.profile.final_year_project || "Not provided"}
Research interests: ${params.profile.research_interests?.join(", ") || "Not provided"}
Supervisor areas: ${params.supervisorResearchAreas?.join(", ") || "Not specified"}`;

  const content = (await callOpenAI(system, user)) ||
    `AI-GENERATED DRAFT — Research Proposal\n\nTitle: [Based on your interests in ${params.program.field}]\n\nBackground: Expand from your profile research experience.\n\nProblem Statement: [To be developed with supervisor]\n\nResearch Question: [Align with ${params.program.field} and supervisor interests]\n\nDISCLAIMER: AI-generated draft. Do not submit without supervisor review. No references fabricated.`;

  const saved = await saveGeneratedDocument({
    userId: params.userId,
    programId: params.program.id,
    documentType: "research_proposal",
    title: `Research Proposal — ${params.program.name}`,
    content,
  });

  return { content, documentId: saved?.id };
}

export async function rewriteCvSection(params: {
  userId: string;
  sectionName: string;
  currentContent: string;
  programName?: string;
  instruction?: string;
}): Promise<string> {
  const system = `${NO_FABRICATION_RULE} Rewrite the CV section professionally.`;
  const user = `Section: ${params.sectionName}\nProgram context: ${params.programName || "General"}\nInstruction: ${params.instruction || "Improve clarity and impact"}\n\nCurrent content:\n${params.currentContent}`;

  return (await callOpenAI(system, user)) || params.currentContent;
}
