"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PreparationDisclaimer } from "@/components/applications/preparation-disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { calculatePackageCompletion } from "@/lib/applications/package-completion";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationChecklistItem,
  type ApplicationStatus,
  type ApplicationTracker,
  type ProgramWithDetails,
  type StudentDocument,
  type StudentProfile,
} from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Download, LayoutGrid, List } from "lucide-react";

const STATUSES: ApplicationStatus[] = [
  "researching",
  "preparing",
  "submitted",
  "interview",
  "offer_received",
  "rejected",
  "withdrawn",
];

type ApplicationRow = ApplicationTracker & {
  program: ProgramWithDetails;
  checklist: ApplicationChecklistItem[];
};

export function ApplicationsClient({
  initialApplications,
  profile,
  documents,
}: {
  initialApplications: ApplicationRow[];
  profile: StudentProfile | null;
  documents: StudentDocument[];
}) {
  const [view, setView] = useState<"kanban" | "list">("list");
  const [applications, setApplications] = useState(initialApplications);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/applications");
    if (res.ok) {
      const data = await res.json();
      setApplications(data.applications);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setApplications(initialApplications);
  }, [initialApplications]);

  async function moveStatus(id: string, status: ApplicationStatus) {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setApplications((apps) =>
        apps.map((a) => (a.id === id ? { ...a, status } : a))
      );
    }
  }

  async function linkDocument(appId: string, itemId: string, documentId: string) {
    const res = await fetch(`/api/applications/${appId}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        linked_document_id: documentId || null,
      }),
    });
    if (res.ok) {
      setApplications((apps) =>
        apps.map((a) => {
          if (a.id !== appId) return a;
          return {
            ...a,
            checklist: a.checklist.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    linked_document_id: documentId || null,
                    is_completed: Boolean(documentId),
                  }
                : item
            ),
          };
        })
      );
    }
  }

  async function toggleChecklist(appId: string, itemId: string, isCompleted: boolean) {
    const res = await fetch(`/api/applications/${appId}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, is_completed: !isCompleted }),
    });
    if (res.ok) {
      setApplications((apps) =>
        apps.map((a) => {
          if (a.id !== appId) return a;
          return {
            ...a,
            checklist: a.checklist.map((item) =>
              item.id === itemId ? { ...item, is_completed: !isCompleted } : item
            ),
          };
        })
      );
    }
  }

  function documentsForItem(item: ApplicationChecklistItem) {
    if (!item.doc_type) return documents;
    return documents.filter((d) => d.doc_type === item.doc_type);
  }

  return (
    <div className="space-y-6">
      <PreparationDisclaimer />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Tracker</h1>
          <p className="text-slate-500">Organize materials for each program — download packages when ready</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            Refresh
          </Button>
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {applications.length === 0 ? (
        <Alert variant="info" title="No applications yet">
          Add programs to your tracker from the{" "}
          <Link href="/programs" className="text-red-700 underline">program search</Link> page
          using the + button on any program card.
        </Alert>
      ) : null}

      {view === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto">
          {STATUSES.slice(0, 5).map((status) => (
            <div key={status} className="min-w-[220px]">
              <h3 className="font-medium text-sm text-slate-700 mb-3 flex items-center gap-2">
                {APPLICATION_STATUS_LABELS[status]}
                <Badge variant="default">
                  {applications.filter((a) => a.status === status).length}
                </Badge>
              </h3>
              <div className="space-y-3">
                {applications
                  .filter((a) => a.status === status)
                  .map((app) => {
                    const completion = calculatePackageCompletion(app.checklist, profile);
                    return (
                      <Card key={app.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm leading-snug">
                            <Link href={`/programs/${app.program.id}`} className="hover:underline">
                              {app.program.name}
                            </Link>
                          </CardTitle>
                          <p className="text-xs text-slate-500">{app.program.school?.name}</p>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          <Progress value={completion.percent} className="h-1.5" />
                          <p className="text-xs text-slate-500">{completion.percent}% package ready</p>
                          {app.deadline_date && (
                            <p className="text-xs text-slate-500">
                              Deadline: {formatDate(app.deadline_date)}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {STATUSES.slice(0, 5).map((s) =>
                              s !== status ? (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => moveStatus(app.id, s)}
                                  className="text-xs text-red-700 hover:underline"
                                >
                                  → {APPLICATION_STATUS_LABELS[s]}
                                </button>
                              ) : null
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const completion = calculatePackageCompletion(app.checklist, profile);
            const admissionsUrl =
              app.program.official_admissions_url || app.program.source_url || null;

            return (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-base">
                        <Link href={`/programs/${app.program.id}`} className="hover:underline">
                          {app.program.name}
                        </Link>
                      </CardTitle>
                      <p className="text-sm text-slate-500">{app.program.school?.name}</p>
                    </div>
                    <Badge>{APPLICATION_STATUS_LABELS[app.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PreparationDisclaimer admissionsUrl={admissionsUrl} />

                  <div className="rounded-lg bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">Application package</span>
                      <span className="text-slate-600">
                        {completion.completedUnits} of {completion.totalUnits} ready ({completion.percent}%)
                      </span>
                    </div>
                    <Progress value={completion.percent} />
                    <p className="text-xs text-slate-500">
                      {completion.linkedCount} of {completion.requiredDocumentCount} required documents linked
                      {completion.profileComplete ? " · contact profile complete" : " · complete contact info on your profile"}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={`/api/applications/${app.id}/package`}
                        download
                        className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download application package
                      </a>
                      {!completion.profileComplete && (
                        <Link
                          href="/profile"
                          className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
                        >
                          Complete contact profile
                        </Link>
                      )}
                      <Link
                        href="/profile/documents"
                        className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
                      >
                        Manage document vault
                      </Link>
                    </div>
                  </div>

                  {app.deadline_date && (
                    <p className="text-sm text-slate-500">Deadline: {formatDate(app.deadline_date)}</p>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Document checklist</p>
                    {app.checklist.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-100 p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          {item.doc_type ? (
                            <span className="mt-0.5 h-4 w-4 rounded-full bg-green-100 border border-green-300 shrink-0" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={item.is_completed}
                              onChange={() => toggleChecklist(app.id, item.id, item.is_completed)}
                              className="mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${item.is_required && !item.is_completed ? "text-red-800" : "text-slate-700"}`}>
                              {item.title}
                              {item.doc_type && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                  ({DOCUMENT_TYPE_LABELS[item.doc_type]})
                                </span>
                              )}
                            </p>
                            {item.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                            )}
                          </div>
                        </div>

                        {item.doc_type && (
                          <div className="pl-6 space-y-1">
                            <label className="text-xs text-slate-500">Link from vault</label>
                            <Select
                              value={item.linked_document_id || ""}
                              onChange={(e) => linkDocument(app.id, item.id, e.target.value)}
                              className="text-sm"
                            >
                              <option value="">— Select document —</option>
                              {documentsForItem(item).map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                  {doc.display_name}
                                </option>
                              ))}
                            </Select>
                            {documentsForItem(item).length === 0 && (
                              <p className="text-xs text-slate-500">
                                No matching documents.{" "}
                                <Link href="/profile/documents" className="text-red-700 underline">
                                  Upload to vault
                                </Link>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
