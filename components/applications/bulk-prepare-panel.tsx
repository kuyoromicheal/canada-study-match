"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SUBMISSION_BOUNDARY_MESSAGE } from "@/lib/applications/package-readiness";
import { getPackageReadiness } from "@/lib/applications/package-readiness";
import type { ApplicationChecklistItem, ApplicationStatus, ProgramWithDetails, StudentProfile } from "@/types/database";
import { Download, Package } from "lucide-react";

type AppRow = {
  id: string;
  status: ApplicationStatus;
  program: ProgramWithDetails;
  checklist: ApplicationChecklistItem[];
};

const TERMINAL: ApplicationStatus[] = ["submitted", "interview", "offer_received", "rejected", "withdrawn"];

export function BulkPreparePanel({
  applications,
  profile,
}: {
  applications: AppRow[];
  profile: StudentProfile | null;
}) {
  const eligible = applications.filter((a) => !TERMINAL.includes(a.status));
  const [selected, setSelected] = useState<string[]>(eligible.map((a) => a.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAllEligible() {
    setSelected(eligible.map((a) => a.id));
  }

  async function downloadBulkPackage() {
    if (!selected.length) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/applications/bulk-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_ids: selected }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate packages");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulk-application-packages-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download bulk package");
    } finally {
      setLoading(false);
    }
  }

  if (!eligible.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Package className="h-5 w-5 text-red-700 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-semibold text-slate-900">Prepare packages (bulk)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Generate application-data summaries, document ZIPs, and per-school checklists for multiple programs at once.
          </p>
        </div>
      </div>

      <Alert variant="warning" title="You submit on each school's official portal">
        <p>{SUBMISSION_BOUNDARY_MESSAGE}</p>
        <p className="mt-2 text-xs">
          No third-party tool can submit into a university&apos;s official application system without a formal partnership
          with that institution.
        </p>
      </Alert>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={selectAllEligible}>
          Select all not yet submitted ({eligible.length})
        </Button>
        <Button size="sm" onClick={downloadBulkPackage} disabled={loading || !selected.length}>
          <Download className="h-4 w-4" />
          {loading ? "Preparing…" : `Download ${selected.length} package${selected.length === 1 ? "" : "s"}`}
        </Button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-100 rounded-lg p-2">
        {eligible.map((app) => {
          const school = app.program.school?.name || "University";
          const readiness = getPackageReadiness(app.checklist, profile, school);
          const admissionsUrl =
            app.program.official_admissions_url || app.program.source_url || null;

          return (
            <label
              key={app.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(app.id)}
                onChange={() => toggle(app.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{app.program.name}</p>
                <p className="text-xs text-slate-500">{school}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant={readiness.status === "ready" ? "success" : "warning"}>
                    {readiness.status === "ready" ? "Ready to submit" : "Missing items"}
                  </Badge>
                  {admissionsUrl && (
                    <a
                      href={admissionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-700 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Official portal
                    </a>
                  )}
                </div>
                {readiness.missingItems.length > 0 && (
                  <ul className="mt-1 text-xs text-amber-800 list-disc pl-4">
                    {readiness.missingItems.slice(0, 3).map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                    {readiness.missingItems.length > 3 && (
                      <li>+{readiness.missingItems.length - 3} more</li>
                    )}
                  </ul>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
