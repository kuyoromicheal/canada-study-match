import { getDefaultChecklistItems } from "@/lib/matching/supervisor-detection";
import type { DocumentType, ProgramRequiredDocument, ProgramWithDetails, SupervisorClassification } from "@/types/database";

export interface ChecklistSeedItem {
  title: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
  doc_type: DocumentType | null;
  required_document_id: string | null;
}

export function buildChecklistFromProgram(
  program: ProgramWithDetails,
  classification: SupervisorClassification
): ChecklistSeedItem[] {
  const requiredDocs = program.required_documents?.filter((d) => d.is_required) ?? [];

  if (requiredDocs.length > 0) {
    const docItems: ChecklistSeedItem[] = requiredDocs
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((doc, index) => checklistItemFromRequiredDocument(doc, index + 1));

    const supervisorExtras = getDefaultChecklistItems(program, classification)
      .filter((item) => !/transcript|language|statement|recommendation|resume|cv/i.test(item.title))
      .map((item, i) => ({
        title: item.title,
        description: item.description,
        is_required: item.is_required,
        sort_order: docItems.length + i + 1,
        doc_type: null as DocumentType | null,
        required_document_id: null as string | null,
      }));

    return [...docItems, ...supervisorExtras];
  }

  return getDefaultChecklistItems(program, classification).map((item, index) => ({
    title: item.title,
    description: item.description,
    is_required: item.is_required,
    sort_order: index + 1,
    doc_type: inferDocTypeFromTitle(item.title),
    required_document_id: null,
  }));
}

function checklistItemFromRequiredDocument(
  doc: ProgramRequiredDocument,
  sortOrder: number
): ChecklistSeedItem {
  return {
    title: doc.title,
    description: doc.description,
    is_required: doc.is_required,
    sort_order: sortOrder,
    doc_type: doc.doc_type,
    required_document_id: doc.id,
  };
}

function inferDocTypeFromTitle(title: string): DocumentType | null {
  const lower = title.toLowerCase();
  if (lower.includes("transcript")) return "transcript";
  if (lower.includes("certificate") || lower.includes("diploma")) return "certificate";
  if (lower.includes("resume") || lower.includes("cv")) return "resume";
  if (lower.includes("reference") || lower.includes("recommendation")) return "reference_letter";
  if (lower.includes("english") || lower.includes("ielts") || lower.includes("toefl")) return "english_test_report";
  if (lower.includes("statement") || lower.includes("purpose")) return "statement_of_purpose";
  if (lower.includes("passport")) return "passport_copy";
  return null;
}
