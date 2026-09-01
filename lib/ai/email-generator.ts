import { generateSupervisorEmailDraft } from "@/lib/matching/supervisor-detection";

export async function generateSupervisorEmail(params: {
  studentName: string;
  programName: string;
  schoolName: string;
  supervisorName: string;
  researchInterests: string[];
  sharedInterests: string[];
  degree?: string;
  university?: string;
  finalYearProject?: string;
}): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const profileContext = [
        params.degree && `Degree: ${params.degree}`,
        params.university && `University: ${params.university}`,
        params.finalYearProject && `Final-year project: ${params.finalYearProject}`,
      ].filter(Boolean).join("\n");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You draft professional, concise emails from international students to potential graduate supervisors at Canadian universities. NEVER claim the professor has agreed to supervise. NEVER claim the professor has funding or availability. NEVER falsely state the professor knows the student. Always professional and respectful. Include mention that a CV is attached or available upon request.",
            },
            {
              role: "user",
              content: `Draft a supervisor inquiry email for:
Student: ${params.studentName}
${profileContext}
Program: ${params.programName} at ${params.schoolName}
Supervisor: ${params.supervisorName}
Research interests: ${params.researchInterests.join(", ")}
Shared interests with supervisor: ${params.sharedInterests.join(", ") || "none identified"}

The email should: introduce the student, mention relevant background, explain why the professor's work is relevant, request potential supervision, and mention CV availability.
Do NOT claim admission is guaranteed or that the professor has agreed to supervise.`,
            },
          ],
          max_tokens: 900,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content + "\n\n---\nDISCLAIMER: AI-generated draft. Does not imply the professor has agreed to supervise you.";
        }
      }
    } catch {
      // Fall through to template
    }
  }

  return generateSupervisorEmailDraft(params);
}
