"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FIT_CATEGORY_LABELS, type FitCategory } from "@/lib/matching/fit-assessment";
import { SUPERVISOR_STATUS_LABELS } from "@/types/database";
import type { ApplicationPlan } from "@/lib/data/application-plans";
import { ExternalLink } from "lucide-react";

export function ApplicationPlanClient({ initialPlans }: { initialPlans: ApplicationPlan[] }) {
  const plan = initialPlans[0];

  if (!plan?.items?.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-600">No application plan yet.</p>
        <p className="text-sm text-slate-500">
          Select programs from search and add them to your bulk application plan.
        </p>
        <Link href="/programs">
          <Button>Find programs</Button>
        </Link>
      </div>
    );
  }

  const items = plan.items;
  const provinceBreakdown = countBy(items, (i) => i.program?.province || "Unknown");
  const supervisorRequired = items.filter((i) => i.program?.supervisor_status === "required").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4 items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{plan.name}</h1>
          <p className="text-slate-500">{items.length} programs selected</p>
        </div>
        <Link href="/programs">
          <Button variant="outline">Add more programs</Button>
        </Link>
      </div>


      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title="Provinces" value={Object.keys(provinceBreakdown).length} subtitle={formatBreakdown(provinceBreakdown)} />
        <StatCard title="Supervisor required" value={supervisorRequired} subtitle={`${items.length - supervisorRequired} without supervisor requirement`} />
        <StatCard title="Target intake" value={plan.target_intake || "Not set"} subtitle="Verify deadlines per program" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk application assistant</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>
            This plan prepares checklists, documents, and tasks for each program. You must review and submit each application manually on the official university portal.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.map((item) => {
          const p = item.program;
          if (!p) return null;
          const fit = item.fit_category as FitCategory | null;
          const admissionsUrl = p.official_admissions_url;
          return (
            <Card key={item.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <Link href={`/programs/${p.id}`} className="font-semibold text-slate-900 hover:text-red-700">
                      {p.name}
                    </Link>
                    <p className="text-sm text-slate-500">{p.school?.name} · {p.province}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.match_score != null && <Badge>{item.match_score}% match</Badge>}
                    {fit && <Badge>{FIT_CATEGORY_LABELS[fit]}</Badge>}
                    <Badge variant={p.supervisor_status === "required" ? "danger" : "default"}>
                      {SUPERVISOR_STATUS_LABELS[p.supervisor_status]}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link href={`/programs/${p.id}`} className="text-red-700 underline">View preparation hub</Link>
                  {admissionsUrl && (
                    <a href={admissionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-red-700 underline">
                      Official portal <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function countBy<T>(items: T[], fn: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = fn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function formatBreakdown(map: Record<string, number>): string {
  return Object.entries(map).map(([k, v]) => `${k}: ${v}`).join(" · ");
}
