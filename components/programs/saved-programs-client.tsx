"use client";

import { useState } from "react";
import { ProgramCard } from "@/components/programs/program-card";
import { BulkPlanBar, ProgramSelectCheckbox } from "@/components/programs/bulk-plan-bar";
import { Alert } from "@/components/ui/alert";
import type { ProgramWithDetails } from "@/types/database";

export function SavedProgramsClient({
  savedPrograms,
}: {
  savedPrograms: (ProgramWithDetails & { savedMatchScore?: number | null })[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const matchScores = Object.fromEntries(
    savedPrograms.map((p) => [p.id, (p as { savedMatchScore?: number }).savedMatchScore ?? 0])
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedIds(savedPrograms.map((p) => p.id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Saved Programs</h1>
        <p className="text-slate-500">Select multiple programs and add them to your application tracker in one action</p>
      </div>

      {savedPrograms.length === 0 ? (
        <Alert variant="info" title="No saved programs">
          Save programs from search results using the heart/save button, then return here to bulk-add them to your tracker.
        </Alert>
      ) : (
        <>
          <BulkPlanBar
            selectedIds={selectedIds}
            matchScores={matchScores}
            onClear={() => setSelectedIds([])}
          />

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="text-slate-500">{savedPrograms.length} saved program{savedPrograms.length === 1 ? "" : "s"}</p>
            <button type="button" className="text-red-700 underline" onClick={selectAll}>
              Select all
            </button>
            {selectedIds.length > 0 && (
              <span className="text-slate-600">{selectedIds.length} selected</span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedPrograms.map((p) => (
              <div key={p.id} className="relative">
                <div className="absolute top-3 right-3 z-10 bg-white/90 rounded px-1">
                  <ProgramSelectCheckbox
                    programId={p.id}
                    selected={selectedIds.includes(p.id)}
                    onToggle={toggleSelect}
                  />
                </div>
                <ProgramCard program={p} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
