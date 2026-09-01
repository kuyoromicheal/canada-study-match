import { isContactProfileComplete } from "@/lib/validation/contact";
import type { ApplicationChecklistItem, StudentProfile } from "@/types/database";

export interface PackageCompletion {
  linkedCount: number;
  requiredDocumentCount: number;
  profileComplete: boolean;
  completedUnits: number;
  totalUnits: number;
  percent: number;
}

export function calculatePackageCompletion(
  checklist: ApplicationChecklistItem[],
  profile: StudentProfile | null
): PackageCompletion {
  const documentItems = checklist.filter((item) => item.is_required && item.doc_type);
  const linkedCount = documentItems.filter((item) => item.linked_document_id).length;
  const profileComplete = profile ? isContactProfileComplete(profile) : false;

  const requiredDocumentCount = documentItems.length;
  const totalUnits = requiredDocumentCount + 1;
  const completedUnits = linkedCount + (profileComplete ? 1 : 0);
  const percent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  return {
    linkedCount,
    requiredDocumentCount,
    profileComplete,
    completedUnits,
    totalUnits,
    percent,
  };
}
