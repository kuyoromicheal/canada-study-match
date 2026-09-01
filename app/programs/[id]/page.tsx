import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProgramDetailView } from "@/components/programs/detail/program-detail-view";
import {
  getApplicationChecklistForProgram,
  getProgramById,
  getProgramMatches,
  getStudentProfile,
  getSupervisorMatches,
} from "@/lib/data/repository";
import { analyzeProgramDetail } from "@/lib/matching/program-detail-analysis";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgramById(id);
  if (!program) notFound();

  const profile = await getStudentProfile();
  const matches = profile ? await getProgramMatches(profile) : [];
  const matchResult = matches.find((m) => m.id === id)?.matchResult;
  const supervisorMatches = profile ? await getSupervisorMatches(profile, id) : [];
  const checklist = profile ? await getApplicationChecklistForProgram(profile.user_id, id) : [];
  const analysis = analyzeProgramDetail(program, profile, matchResult, checklist);

  const admissionsUrl = program.official_admissions_url || null;

  return (
    <div className="space-y-6">
      <Link
        href="/programs"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to programs
      </Link>

      <ProgramDetailView
        program={program}
        analysis={analysis}
        matchResult={matchResult}
        supervisorMatches={supervisorMatches}
        admissionsUrl={admissionsUrl}
        hasProfile={Boolean(profile)}
      />
    </div>
  );
}
