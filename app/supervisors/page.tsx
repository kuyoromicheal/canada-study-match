import { getCatalogStatus } from "@/lib/data/catalog-status";
import { getProgramById, getPrograms, getStudentProfile, getSupervisorMatches } from "@/lib/data/repository";
import { SupervisorListClient } from "@/components/supervisors/supervisor-list-client";
import { CatalogNotice } from "@/components/catalog/catalog-notice";
import { Alert } from "@/components/ui/alert";

export default async function SupervisorsPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>;
}) {
  const params = await searchParams;
  const [profile, catalogStatus, programs] = await Promise.all([
    getStudentProfile(),
    getCatalogStatus(),
    getPrograms(),
  ]);
  const selectedProgramId = params.program || programs.find((p) => p.supervisor_status === "required")?.id;
  const selectedProgram = selectedProgramId ? await getProgramById(selectedProgramId) : null;
  const matches = selectedProgramId && profile
    ? await getSupervisorMatches(profile, selectedProgramId)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Supervisor Matching</h1>
        <p className="text-slate-500">Find supervisors whose research appears compatible with your interests</p>
      </div>

      <CatalogNotice status={catalogStatus} />

      <Alert variant="warning" title="Important">
        Compatibility scores are indicative only. Contacting a supervisor does NOT mean they have agreed to supervise you.
        {catalogStatus.mode === "seed" && " Supervisor listings are placeholder data until ingested."}
      </Alert>

      <SupervisorListClient
        programs={programs.filter((p) => p.supervisor_status !== "not_required" && !p.is_demo_record)}
        selectedProgramId={selectedProgramId}
        selectedProgram={selectedProgram}
        matches={matches}
        studentName={profile?.full_name || "Student"}
        researchInterests={profile?.research_interests || []}
      />
    </div>
  );
}
