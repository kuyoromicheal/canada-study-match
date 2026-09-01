import { generateSupervisorEmailDraft } from "@/lib/matching/supervisor-detection";

export async function generateSupervisorEmail(params: {
  studentName: string;
  programName: string;
  schoolName: string;
  supervisorName: string;
  researchInterests: string[];
  sharedInterests: string[];
}): Promise<string> {
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
          messages: [
            {
              role: "system",
              content:
                "You draft professional, concise emails from international students to potential graduate supervisors at Canadian universities. NEVER claim the professor has agreed to supervise. NEVER guarantee admission. Always professional and respectful.",
            },
            {
              role: "user",
              content: `Draft a supervisor inquiry email for:
Student: ${params.studentName}
Program: ${params.programName} at ${params.schoolName}
Supervisor: ${params.supervisorName}
Research interests: ${params.researchInterests.join(", ")}
Shared interests: ${params.sharedInterests.join(", ") || "none identified"}

Include a disclaimer that this is a draft and does not imply agreement from the supervisor.`,
            },
          ],
          max_tokens: 800,
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
