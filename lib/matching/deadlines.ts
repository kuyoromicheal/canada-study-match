import type { ApplicationDeadline, StudentProfile } from "@/types/database";
import { formatDate } from "@/lib/utils";

export type DeadlineUrgency = "green" | "yellow" | "orange" | "red" | "expired" | "unknown";

export interface DeadlineWithUrgency extends ApplicationDeadline {
  daysLeft: number | null;
  urgency: DeadlineUrgency;
  label: string;
}

export function getDeadlineUrgency(dateStr: string): { daysLeft: number; urgency: DeadlineUrgency } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { daysLeft, urgency: "expired" };
  if (daysLeft < 7) return { daysLeft, urgency: "red" };
  if (daysLeft < 30) return { daysLeft, urgency: "orange" };
  if (daysLeft < 60) return { daysLeft, urgency: "yellow" };
  return { daysLeft, urgency: "green" };
}

export function urgencyLabel(urgency: DeadlineUrgency): string {
  switch (urgency) {
    case "green": return "More than 60 days";
    case "yellow": return "30–60 days";
    case "orange": return "7–30 days";
    case "red": return "Less than 7 days";
    case "expired": return "Deadline passed";
    default: return "Verify date";
  }
}

export function enrichDeadlines(deadlines: ApplicationDeadline[]): DeadlineWithUrgency[] {
  return deadlines
    .map((d) => {
      if (!d.deadline_date || d.verification_status === "needs_verification") {
        return {
          ...d,
          daysLeft: null,
          urgency: "unknown" as DeadlineUrgency,
          label: `${d.deadline_type || "Deadline"} — ${d.intake}`,
        };
      }
      const { daysLeft, urgency } = getDeadlineUrgency(d.deadline_date);
      return {
        ...d,
        daysLeft,
        urgency,
        label: `${d.deadline_type || "Application deadline"} — ${d.intake}`,
      };
    })
    .sort((a, b) => {
      if (a.daysLeft == null) return 1;
      if (b.daysLeft == null) return -1;
      return a.daysLeft - b.daysLeft;
    });
}

export function formatDeadlineDisplay(d: DeadlineWithUrgency): string {
  const date = formatDate(d.deadline_date);
  if (d.daysLeft == null) return `${date} — verify date`;
  if (d.urgency === "expired") return `${date} — expired`;
  return `${date} — ${d.daysLeft} days left`;
}
