import type { EmailCategory, ResponseClassification } from "@/lib/gmail/config";

export function categorizeEmail(subject: string, fromEmail: string, snippet: string): EmailCategory {
  const text = `${subject} ${fromEmail} ${snippet}`.toLowerCase();

  if (/professor|supervisor|faculty|dr\.|research group|lab/.test(text)) {
    return "supervisors";
  }
  if (/scholarship|funding|bursary|award|grant/.test(text)) {
    return "scholarships";
  }
  if (/offer|admitted|acceptance|congratulations|welcome to/.test(text)) {
    return "offers";
  }
  if (/reject|decline|unfortunately|not selected|unable to offer/.test(text)) {
    return "offers";
  }
  if (/additional document|please send|missing|required document|upload|transcript|reference/.test(text)) {
    return "action_required";
  }
  if (/admission|application|graduate|portal|apply/.test(text)) {
    return "applications";
  }
  if (/\.edu|\.ca|university|college|institute/.test(text)) {
    return "universities";
  }
  return "applications";
}

export function classifySupervisorResponse(body: string): ResponseClassification {
  const text = body.toLowerCase();

  if (/not available|no openings|cannot supervise|fully committed|not taking students/.test(text)) {
    return "unavailable";
  }
  if (/decline|not interested|unable to|cannot accept/.test(text)) {
    return "declined";
  }
  if (/interested|happy to discuss|would be glad|please send|attach your cv|research proposal/.test(text)) {
    return /please send|attach|more information|cv|proposal/.test(text) ? "requests_info" : "interested";
  }
  if (/might be|potentially|depending on|review your/.test(text)) {
    return "potentially_interested";
  }
  if (/follow up|get back|busy|travel/.test(text)) {
    return "needs_follow_up";
  }
  return "unclear";
}

export function isApplicationRelatedEmail(fromEmail: string, subject: string): boolean {
  const text = `${fromEmail} ${subject}`.toLowerCase();
  return (
    /\.edu|\.ca|admission|application|graduate|professor|supervisor|scholarship|university|college|faculty|offer|funding/.test(text)
  );
}
