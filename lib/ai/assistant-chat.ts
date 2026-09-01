import type { ProgramWithDetails, StudentProfile } from "@/types/database";
import { analyzeProgramDetail } from "@/lib/matching/program-detail-analysis";
import type { MatchResult } from "@/types/database";

export async function answerApplicationQuestion(params: {
  question: string;
  profile: StudentProfile | null;
  program?: ProgramWithDetails;
  matchResult?: MatchResult;
  programs?: ProgramWithDetails[];
}): Promise<string> {
  const contextParts: string[] = [];

  if (params.profile) {
    contextParts.push(`Student: ${params.profile.full_name}, ${params.profile.major}, ${params.profile.highest_qualification}`);
    if (params.profile.research_interests?.length) {
      contextParts.push(`Research interests: ${params.profile.research_interests.join(", ")}`);
    }
  }

  if (params.program) {
    const analysis = analyzeProgramDetail(params.program, params.profile, params.matchResult);
    contextParts.push(`Program: ${params.program.name} at ${params.program.school?.name}`);
    contextParts.push(`Supervisor status: ${params.program.supervisor_status}`);
    contextParts.push(`Fit: ${analysis.fitLabel}`);
    contextParts.push(`Readiness: ${analysis.readinessPercent}%`);
    contextParts.push(`Missing: ${analysis.readinessItems.filter((i) => !i.complete && i.required).map((i) => i.label).join(", ") || "none listed"}`);
    if (params.matchResult) {
      contextParts.push(`Match score: ${params.matchResult.score}% — ${params.matchResult.summary}`);
    }
  }

  if (params.programs?.length) {
    const noSupervisor = params.programs.filter((p) => p.supervisor_status === "not_required");
    contextParts.push(`Selected programs without supervisor requirement: ${noSupervisor.map((p) => p.name).join(", ") || "none"}`);
  }

  const system = `You are a Canadian university application assistant. Answer using ONLY the provided context. Never guarantee admission. Never fabricate requirements. If information is unknown, say "Verify with the university." Be concise and actionable.`;

  const user = `Context:\n${contextParts.join("\n")}\n\nQuestion: ${params.question}`;

  if (process.env.OPENAI_API_KEY) {
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
          max_tokens: 800,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const answer = data.choices?.[0]?.message?.content;
        if (answer) {
          return answer + "\n\n---\nThis is guidance only — not a guarantee of admission. Verify all requirements on official university sources.";
        }
      }
    } catch {
      // fallback
    }
  }

  return "Complete your profile and select a program for personalized guidance. I can help with eligibility, documents, supervisors, and deadlines based on your saved data.";
}
