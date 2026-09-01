"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Download, ExternalLink, FileText } from "lucide-react";
import type { ApplicationStatus } from "@/types/database";

export function ApplicationExportPanel({
  applicationId,
  programName,
  schoolName,
  admissionsUrl,
  status,
  onMarkSubmitted,
  markingSubmitted,
}: {
  applicationId: string;
  programName: string;
  schoolName: string;
  admissionsUrl: string | null;
  status: ApplicationStatus;
  onMarkSubmitted: () => void;
  markingSubmitted: boolean;
}) {
  const portalLabel = schoolName || "the university";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-900">Export application data</p>
        <p className="text-xs text-slate-500 mt-1">
          Download your info and documents to copy into the official portal — this app cannot submit on your behalf.
        </p>
      </div>

      <Alert variant="info" title="You submit on the school's official portal">
        <p>
          Copy these into <strong>{portalLabel}</strong>&apos;s official application
          {admissionsUrl ? (
            <>
              {" "}at{" "}
              <Link
                href={admissionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-red-700 font-medium hover:underline"
              >
                the official admissions page
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            " — find the official admissions URL on the university website"
          )}
          . This app cannot submit on your behalf.
        </p>
      </Alert>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/applications/${applicationId}/export-data?format=txt`}
          download
          className="inline-flex items-center justify-center gap-2 h-9 rounded-md px-3 text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
        >
          <FileText className="h-4 w-4" />
          Download text summary
        </a>
        <a
          href={`/api/applications/${applicationId}/export-data?format=pdf`}
          download
          className="inline-flex items-center justify-center gap-2 h-9 rounded-md px-3 text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
        >
          <FileText className="h-4 w-4" />
          Download PDF summary
        </a>
        <a
          href={`/api/applications/${applicationId}/package`}
          download
          className="inline-flex items-center justify-center gap-2 h-9 rounded-md px-3 text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
        >
          <Download className="h-4 w-4" />
          Download document package (ZIP)
        </a>
      </div>

      {status !== "submitted" && status !== "offer_received" && status !== "rejected" && status !== "withdrawn" && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">
            After you have submitted on {portalLabel}&apos;s official site yourself, update your tracker status here.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={markingSubmitted}
            onClick={onMarkSubmitted}
          >
            {markingSubmitted ? "Updating…" : "Mark as submitted (status only)"}
          </Button>
        </div>
      )}
    </div>
  );
}
