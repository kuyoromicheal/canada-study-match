import JSZip from "jszip";
import { buildApplicationDataSummary } from "@/lib/applications/application-data-summary";
import { getPackageReadiness, SUBMISSION_BOUNDARY_MESSAGE } from "@/lib/applications/package-readiness";
import { downloadDocumentBytes } from "@/lib/data/documents";
import type {
  ApplicationChecklistItem,
  ApplicationTracker,
  ProgramWithDetails,
  StudentProfile,
} from "@/types/database";
import { formatDate } from "@/lib/utils";

export interface BulkPackageApplication {
  application: Pick<ApplicationTracker, "id" | "deadline_date">;
  program: ProgramWithDetails;
  checklist: ApplicationChecklistItem[];
}

function safeFolderName(program: ProgramWithDetails): string {
  const school = program.school?.name || "School";
  const base = `${school}-${program.name}`
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return base || `program-${program.id.slice(0, 8)}`;
}

export async function buildBulkApplicationPackage(
  userId: string,
  profile: StudentProfile,
  items: BulkPackageApplication[]
): Promise<Buffer> {
  const zip = new JSZip();
  const indexLines: string[] = [
    "BULK APPLICATION PREPARATION PACKAGE",
    "=====================================",
    "",
    SUBMISSION_BOUNDARY_MESSAGE,
    "",
    "No third-party tool can submit into a university's official application system",
    "without a formal partnership with that institution.",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Applications included: ${items.length}`,
    "",
    "INDEX",
    "-----",
  ];

  for (const { application, program, checklist } of items) {
    const school = program.school?.name || "University";
    const folder = safeFolderName(program);
    const admissionsUrl =
      program.official_admissions_url || program.source_url || "See university website";
    const readiness = getPackageReadiness(checklist, profile, school);

    const summary = buildApplicationDataSummary(profile, program, checklist);
    zip.file(`${folder}/application-data.txt`, summary);

    const checklistText = [
      `CHECKLIST — ${program.name}`,
      `School: ${school}`,
      `Status: ${readiness.status === "ready" ? "Ready to submit (materials complete)" : "Missing items"}`,
      "",
      ...(readiness.missingItems.length
        ? ["Missing:", ...readiness.missingItems.map((m) => `  • ${m}`)]
        : ["All required items linked or complete."]),
      "",
      "Full checklist:",
      ...checklist.map((item) => {
        const done = item.doc_type
          ? item.linked_document_id
            ? "linked"
            : "missing"
          : item.is_completed
            ? "done"
            : "pending";
        return `  [${done}] ${item.title}${item.is_required ? " (required)" : ""}`;
      }),
      "",
      SUBMISSION_BOUNDARY_MESSAGE,
      `Submit at: ${admissionsUrl}`,
    ].join("\n");

    zip.file(`${folder}/checklist-status.txt`, checklistText);

    const docsFolder = zip.folder(`${folder}/documents`);
    if (docsFolder) {
      const usedNames = new Set<string>();
      for (const item of checklist.filter((i) => i.linked_document_id)) {
        const downloaded = await downloadDocumentBytes(userId, item.linked_document_id!);
        if (!downloaded.bytes || !downloaded.fileName) continue;
        let fileName = `${item.title.replace(/[^\w\s-]/g, "").trim()}-${downloaded.fileName}`;
        if (usedNames.has(fileName)) fileName = `${item.id.slice(0, 8)}-${fileName}`;
        usedNames.add(fileName);
        docsFolder.file(fileName, downloaded.bytes);
      }
    }

    indexLines.push("");
    indexLines.push(`Program: ${program.name}`);
    indexLines.push(`School: ${school}`);
    indexLines.push(`Folder: ${folder}/`);
    indexLines.push(`Official portal: ${admissionsUrl}`);
    indexLines.push(
      `Deadline: ${application.deadline_date ? formatDate(application.deadline_date) : "Verify on official site"}`
    );
    indexLines.push(
      `Package status: ${readiness.status === "ready" ? "Ready to submit" : "Missing items"}`
    );
    if (readiness.missingItems.length) {
      indexLines.push(`Missing: ${readiness.missingItems.join("; ")}`);
    }
  }

  zip.file("INDEX.txt", indexLines.join("\n"));
  return zip.generateAsync({ type: "nodebuffer" });
}

/** No hard cap — batch all selected programs in one action. */
export const BULK_TRACKER_BATCH_LIMIT = Number.POSITIVE_INFINITY;
