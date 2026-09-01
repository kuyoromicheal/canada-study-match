"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SUBMISSION_BOUNDARY_MESSAGE } from "@/lib/applications/package-readiness";

export function BulkPlanBar({
  selectedIds,
  matchScores,
  onClear,
}: {
  selectedIds: string[];
  matchScores: Record<string, number>;
  onClear: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"plan" | "tracker" | null>(null);
  const [planName, setPlanName] = useState("My application plan");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!selectedIds.length) return null;

  async function addToTracker() {
    setLoading("tracker");
    setError("");
    setSuccess("");
    const res = await fetch("/api/applications/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        program_ids: selectedIds,
        match_scores: matchScores,
        status: "shortlisted",
      }),
    });
    setLoading(null);
    if (res.status === 401) {
      router.push("/login?redirect=/programs");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add programs to tracker");
      return;
    }
    setSuccess(
      `Added ${data.created_count} program(s) to your application tracker${data.failed_count ? ` (${data.failed_count} failed)` : ""}.`
    );
    onClear();
    router.push("/applications");
  }

  async function addToPlan() {
    setLoading("plan");
    setError("");
    setSuccess("");
    const res = await fetch("/api/application-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: planName,
        program_ids: selectedIds,
        match_scores: matchScores,
      }),
    });
    setLoading(null);
    if (res.status === 401) {
      router.push("/login?redirect=/programs");
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create plan");
      return;
    }
    onClear();
    router.push("/plan");
  }

  return (
    <div className="sticky top-0 z-30 rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {selectedIds.length} program{selectedIds.length === 1 ? "" : "s"} selected
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Bulk actions prepare materials only — you submit each application on the school&apos;s official portal.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <Button onClick={addToTracker} disabled={loading !== null} size="sm">
          {loading === "tracker" ? "Adding…" : "Add selected to Application Tracker"}
        </Button>
        <div className="space-y-1 min-w-[180px]">
          <Label className="text-xs">Plan name (optional)</Label>
          <Input value={planName} onChange={(e) => setPlanName(e.target.value)} className="h-9 bg-white" />
        </div>
        <Button variant="outline" onClick={addToPlan} disabled={loading !== null} size="sm">
          {loading === "plan" ? "Creating…" : "Add to application plan"}
        </Button>
        <Button variant="outline" size="sm" onClick={onClear}>Clear</Button>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}
      {success && <p className="text-xs text-green-800">{success}</p>}

      <p className="text-xs text-slate-500 border-t border-red-100 pt-2">{SUBMISSION_BOUNDARY_MESSAGE}</p>
    </div>
  );
}

export function ProgramSelectCheckbox({
  programId,
  selected,
  onToggle,
}: {
  programId: string;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(programId)}
        className="rounded border-slate-300"
      />
      Select
    </label>
  );
}
