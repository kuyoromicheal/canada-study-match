"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationChecklistItem,
  type ApplicationStatus,
  type ApplicationTracker,
  type ProgramWithDetails,
} from "@/types/database";
import { formatDate } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

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
}: {
  initialApplications: ApplicationRow[];
}) {
  const [view, setView] = useState<"kanban" | "list">("kanban");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Tracker</h1>
          <p className="text-slate-500">Track your program applications and document checklist</p>
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
                  .map((app) => (
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
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
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
                {app.deadline_date && (
                  <p className="text-sm text-slate-500">Deadline: {formatDate(app.deadline_date)}</p>
                )}
                {app.notes && <p className="text-sm text-slate-600 italic">{app.notes}</p>}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Document Checklist</p>
                  {app.checklist.map((item) => (
                    <label key={item.id} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => toggleChecklist(app.id, item.id, item.is_completed)}
                        className="mt-0.5"
                      />
                      <span className={item.is_required && !item.is_completed ? "text-red-800 font-medium" : "text-slate-700"}>
                        {item.title}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
