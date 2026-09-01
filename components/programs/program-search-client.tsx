"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProgramCard } from "@/components/programs/program-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CatalogNotice } from "@/components/catalog/catalog-notice";
import type { CatalogStatus } from "@/lib/data/catalog-status";
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
          <FilterSelect label="Province" value={filters.province} onChange={(v) => setFilters({ ...filters, province: v })} options={provinces} />
          <FilterSelect label="Field" value={filters.field} onChange={(v) => setFilters({ ...filters, field: v })} options={fields} />
          <FilterSelect label="Intake" value={filters.intake} onChange={(v) => setFilters({ ...filters, intake: v })} options={intakes} />
          <div className="space-y-2">
            <Label>Degree level</Label>
            <Select value={filters.degree || ""} onChange={(e) => setFilters({ ...filters, degree: e.target.value })}>
              <option value="">Any</option>
              <option value="certificate">Certificate</option>
              <option value="diploma">Diploma</option>
              <option value="bachelor">Bachelor</option>
              <option value="master">Master</option>
              <option value="phd">PhD</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Program type</Label>
            <Select value={filters.programType || ""} onChange={(e) => setFilters({ ...filters, programType: e.target.value })}>
              <option value="">Any</option>
              <option value="thesis">Thesis</option>
              <option value="course_based">Course-based</option>
              <option value="coop">Co-op</option>
              <option value="mixed">Mixed</option>
            </Select>
          </div>
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

      <p className="text-sm text-slate-500">
        {initialPrograms.length} program{initialPrograms.length !== 1 ? "s" : ""} found
        {isPending && " (updating...)"}
      </p>

      {initialPrograms.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialPrograms.map((p) => (
            <ProgramCard key={p.id} program={p} matchResult={p.matchResult} />
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
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </Select>
    </div>
  );
}
