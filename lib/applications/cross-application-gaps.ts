import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";
import type {
  ApplicationChecklistItem,
  ApplicationStatus,
  DocumentType,
  ProgramWithDetails,
  StudentProfile,
} from "@/types/database";
import { getPackageReadiness } from "@/lib/applications/package-readiness";

export interface CrossApplicationGap {
  id: string;
  label: string;
  actionLabel: string;
  docType: DocumentType | null;
  blockedApplicationCount: number;
  blockedPrograms: string[];
  priority: number;
}

const TERMINAL_STATUSES: ApplicationStatus[] = [
  "submitted",
  "interview",
  "offer_received",
  "rejected",
  "withdrawn",
];

export function detectCrossApplicationGaps(
  applications: {
    id: string;
    status: ApplicationStatus;
    program: ProgramWithDetails;
    checklist: ApplicationChecklistItem[];
  }[],
  profile: StudentProfile | null
): CrossApplicationGap[] {
  const active = applications.filter((a) => !TERMINAL_STATUSES.includes(a.status));
  const gapMap = new Map<
    string,
    { docType: DocumentType | null; label: string; programs: Set<string> }
  >();

  for (const app of active) {
    const school = app.program.school?.name || "Program";
    const readiness = getPackageReadiness(app.checklist, profile, school);

    for (const missing of readiness.missingItems) {
      const docMatch = app.checklist.find(
        (item) =>
          item.is_required &&
          item.doc_type &&
          !item.linked_document_id &&
          missing.includes(item.title)
      );

      const key = docMatch?.doc_type || `other:${missing.slice(0, 80)}`;
      const label = docMatch?.doc_type
        ? DOCUMENT_TYPE_LABELS[docMatch.doc_type]
        : missing;

      const entry = gapMap.get(key) || {
        docType: docMatch?.doc_type ?? null,
        label,
        programs: new Set<string>(),
      };
      entry.programs.add(app.program.name);
      gapMap.set(key, entry);
    }
  }

  return Array.from(gapMap.entries())
    .map(([id, entry]) => ({
      id,
      docType: entry.docType,
      label: entry.label,
      actionLabel:
        entry.docType === "english_test_report"
          ? `Uploading your ${entry.label} unlocks ${entry.programs.size} application${entry.programs.size === 1 ? "" : "s"}`
          : `Resolving "${entry.label}" unlocks ${entry.programs.size} application${entry.programs.size === 1 ? "" : "s"}`,
      blockedApplicationCount: entry.programs.size,
      blockedPrograms: Array.from(entry.programs),
      priority: entry.programs.size,
    }))
    .filter((g) => g.blockedApplicationCount > 1)
    .sort((a, b) => b.priority - a.priority);
}
