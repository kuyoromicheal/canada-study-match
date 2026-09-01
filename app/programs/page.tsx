import { getFields, getIntakes, getProgramMatches, getPrograms, getProvinces, getStudentProfile } from "@/lib/data/repository";
import { getCatalogStatus } from "@/lib/data/catalog-status";
import { ProgramSearchClient } from "@/components/programs/program-search-client";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [profile, catalogStatus, provinces, fields, intakes] = await Promise.all([
    getStudentProfile(),
    getCatalogStatus(),
    getProvinces(),
    getFields(),
    getIntakes(),
  ]);

  const filters = {
    province: params.province,
    field: params.field,
    degree: params.degree as import("@/types/database").DegreeLevel | undefined,
    intake: params.intake,
    maxTuition: params.maxTuition ? Number(params.maxTuition) : undefined,
    maxFee: params.maxFee ? Number(params.maxFee) : undefined,
    supervisorRequirement: params.supervisor as import("@/types/database").SupervisorStatus | undefined,
    programType: params.programType as import("@/types/database").ProgramType | undefined,
    internationalEligible: params.international === "true" ? true : undefined,
    minMatchScore: params.minScore ? Number(params.minScore) : undefined,
    search: params.q,
    institutionType: params.institutionType as import("@/types/database").InstitutionType | undefined,
    feeFilter: params.feeFilter as import("@/types/database").ApplicationFeeFilter | undefined,
    includeDemo: params.includeDemo === "true",
    includeUnverified: params.includeUnverified === "true",
  };

  let programs = profile
    ? await getProgramMatches(profile, filters)
    : (await getPrograms(filters)).filter((p) => {
        if (p.is_demo_record && !filters.includeDemo) return false;
        if (!p.is_demo_record && p.verification_status === "needs_verification" && !filters.includeUnverified) return false;
        return true;
      });
  if (filters.minMatchScore) {
    programs = programs.filter((p) => p.matchResult && p.matchResult.score >= filters.minMatchScore!);
  }

  return (
    <ProgramSearchClient
      initialPrograms={programs}
      provinces={provinces}
      fields={fields}
      intakes={intakes}
      initialFilters={params}
      catalogStatus={catalogStatus}
    />
  );
}
