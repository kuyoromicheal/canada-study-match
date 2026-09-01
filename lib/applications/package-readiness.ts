import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";
import { calculatePackageCompletion, type PackageCompletion } from "@/lib/applications/package-completion";
import type { ApplicationChecklistItem, StudentProfile } from "@/types/database";

export const SUBMISSION_BOUNDARY_MESSAGE =
  "These packages are yours to submit — copy each into that school's own application portal. This app does not submit applications to universities.";

export interface PackageReadiness {
  status: "ready" | "missing";
  missingItems: string[];
  completion: PackageCompletion;
}

export function getPackageReadiness(
  checklist: ApplicationChecklistItem[],
  profile: StudentProfile | null,
  schoolName: string
): PackageReadiness {
  const missingItems: string[] = [];
  const completion = calculatePackageCompletion(checklist, profile);

  if (!completion.profileComplete) {
    missingItems.push("Complete contact profile (phone and mailing address on /profile)");
  }

  for (const item of checklist.filter((i) => i.is_required)) {
    if (item.doc_type) {
      if (!item.linked_document_id) {
        const docLabel = DOCUMENT_TYPE_LABELS[item.doc_type] || item.doc_type;
        missingItems.push(
          `${schoolName} needs "${item.title}" (${docLabel}) — not linked in your document vault`
        );
      }
    } else if (!item.is_completed) {
      missingItems.push(`${schoolName}: "${item.title}" — not marked complete`);
    }
  }

  return {
    status: missingItems.length === 0 ? "ready" : "missing",
    missingItems,
    completion,
  };
}
