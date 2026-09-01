"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProgramCard } from "@/components/programs/program-card";
import { BulkPlanBar, ProgramSelectCheckbox } from "@/components/programs/bulk-plan-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CatalogNotice } from "@/components/catalog/catalog-notice";
import type { CatalogStatus } from "@/lib/data/catalog-status";
import {
  APPLICATION_FEE_FILTER_OPTIONS,
  DEGREE_LEVEL_OPTIONS,
  INSTITUTION_TYPE_OPTIONS,
  PROGRAM_TYPE_OPTIONS,
} from "@/lib/constants/form-options";
import { CANADIAN_PROVINCES } from "@/types/database";
import { Search, SlidersHorizontal } from "lucide-react";
import type { ProgramWithDetails, MatchResult } from "@/types/database";
import { RequestProgramForm } from "@/components/programs/request-program-form";

interface Props {
  initialPrograms: (ProgramWithDetails & { matchResult?: MatchResult })[];
  provinces: string[];
  fields: string[];
  intakes: string[];
  initialFilters: Record<string, string | undefined>;
  catalogStatus: CatalogStatus;
}

export function ProgramSearchClient({
  initialPrograms,
  provinces,
  fields,
  intakes,
  initialFilters,
  catalogStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const matchScores = Object.fromEntries(
    initialPrograms
      .filter((p) => p.matchResult?.score != null)
      .map((p) => [p.id, p.matchResult!.score])
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAllOnPage() {
    setSelectedIds(initialPrograms.map((p) => p.id));
  }

  function applyFilters() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => {
      router.push(`/programs?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Program Search</h1>
        <p className="text-slate-500">Find programs that appear compatible with your profile</p>
      </div>

      <CatalogNotice status={catalogStatus} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search programs, schools, fields..."
            value={filters.q || ""}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
        <Button onClick={applyFilters} disabled={isPending}>
          {isPending ? "Searching..." : "Search"}
        </Button>
      </div>

      {showFilters && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 bg-white">
          <FilterSelect label="Province" value={filters.province} onChange={(v) => setFilters({ ...filters, province: v })} options={[...CANADIAN_PROVINCES]} />
          <FilterSelect label="Field" value={filters.field} onChange={(v) => setFilters({ ...filters, field: v })} options={fields} />
          <FilterSelect label="Intake" value={filters.intake} onChange={(v) => setFilters({ ...filters, intake: v })} options={intakes} />
          <FilterSelect
            label="Institution type"
            value={filters.institutionType}
            onChange={(v) => setFilters({ ...filters, institutionType: v })}
            options={INSTITUTION_TYPE_OPTIONS.map((o) => o.value)}
            labels={Object.fromEntries(INSTITUTION_TYPE_OPTIONS.map((o) => [o.value, o.label]))}
          />
          <FilterSelect
            label="Degree level"
            value={filters.degree}
            onChange={(v) => setFilters({ ...filters, degree: v })}
            options={DEGREE_LEVEL_OPTIONS.map((o) => o.value)}
            labels={Object.fromEntries(DEGREE_LEVEL_OPTIONS.map((o) => [o.value, o.label]))}
          />
          <FilterSelect
            label="Application fee"
            value={filters.feeFilter}
            onChange={(v) => setFilters({ ...filters, feeFilter: v })}
            options={APPLICATION_FEE_FILTER_OPTIONS.filter((o) => o.value).map((o) => o.value)}
            labels={Object.fromEntries(APPLICATION_FEE_FILTER_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]))}
          />
          <FilterSelect
            label="Program type"
            value={filters.programType}
            onChange={(v) => setFilters({ ...filters, programType: v })}
            options={PROGRAM_TYPE_OPTIONS.map((o) => o.value)}
            labels={Object.fromEntries(PROGRAM_TYPE_OPTIONS.map((o) => [o.value, o.label]))}
          />
          <div className="space-y-2">
            <Label>Supervisor requirement</Label>
            <Select value={filters.supervisor || ""} onChange={(e) => setFilters({ ...filters, supervisor: e.target.value })}>
              <option value="">Any</option>
              <option value="required">Required</option>
              <option value="recommended">Recommended</option>
              <option value="not_required">Not required</option>
              <option value="unknown_verify">Unknown — verify</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Max tuition (CAD)</Label>
            <Input type="number" value={filters.maxTuition || ""} onChange={(e) => setFilters({ ...filters, maxTuition: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Min match score (%)</Label>
            <Input type="number" min={0} max={100} value={filters.minScore || ""} onChange={(e) => setFilters({ ...filters, minScore: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm col-span-full">
            <input type="checkbox" checked={filters.includeUnverified === "true"} onChange={(e) => setFilters({ ...filters, includeUnverified: e.target.checked ? "true" : "" })} />
            Include unverified programs in match scoring
          </label>
          <label className="flex items-center gap-2 text-sm col-span-full">
            <input type="checkbox" checked={filters.includeDemo === "true"} onChange={(e) => setFilters({ ...filters, includeDemo: e.target.checked ? "true" : "" })} />
            Include DEMO programs in match scoring
          </label>
        </div>
      )}

      <BulkPlanBar
        selectedIds={selectedIds}
        matchScores={matchScores}
        onClear={() => setSelectedIds([])}
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p className="text-slate-500">
          {initialPrograms.length} program{initialPrograms.length !== 1 ? "s" : ""} found
          {isPending && " (updating...)"}
        </p>
        {initialPrograms.length > 0 && (
          <>
            <button type="button" className="text-red-700 underline" onClick={selectAllOnPage}>
              Select page
            </button>
            {selectedIds.length > 0 && (
              <span className="text-slate-600">{selectedIds.length} selected</span>
            )}
          </>
        )}
      </div>

      {initialPrograms.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialPrograms.map((p) => (
            <div key={p.id} className="relative">
              <div className="absolute top-3 right-3 z-10 bg-white/90 rounded px-1">
                <ProgramSelectCheckbox
                  programId={p.id}
                  selected={selectedIds.includes(p.id)}
                  onToggle={toggleSelect}
                />
              </div>
              <ProgramCard program={p} matchResult={p.matchResult} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500 space-y-4">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No programs match your filters. Try adjusting your search criteria.</p>
          <RequestProgramForm />
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>{labels?.[o] ?? o}</option>
        ))}
      </Select>
    </div>
  );
}
