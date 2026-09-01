import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { admin } = auth;

  const [
    { data: schools },
    { data: programs },
    { data: requests },
    { data: profiles },
    { data: skippedInstitutions },
  ] = await Promise.all([
    admin.from("schools").select("*").order("name"),
    admin.from("programs").select("*, schools(name)").order("name"),
    admin.from("program_requests").select("*").eq("status", "pending").order("request_count", { ascending: false }),
    admin.from("student_profiles").select("desired_field, preferred_provinces, desired_qualification"),
    admin
      .from("ingestion_logs")
      .select("*")
      .eq("status", "skipped")
      .order("created_at", { ascending: false }),
  ]);

  const needsVerification = (programs || []).filter(
    (p) => p.verification_status === "needs_verification" && !p.is_demo_record
  );

  const demandQueue = needsVerification
    .map((p) => {
      const school = p.schools as { name: string } | null;
      let demandScore = 0;
      for (const profile of profiles || []) {
        if (profile.preferred_provinces?.includes(p.province)) demandScore += 2;
        if (profile.desired_field && p.field.toLowerCase().includes(profile.desired_field.toLowerCase())) {
          demandScore += 3;
        }
      }
      for (const req of requests || []) {
        if (req.province === p.province) demandScore += req.request_count;
        if (req.field && p.field.toLowerCase().includes(req.field.toLowerCase())) {
          demandScore += req.request_count * 2;
        }
      }
      return { ...p, schoolName: school?.name, demandScore };
    })
    .sort((a, b) => b.demandScore - a.demandScore);

  const skippedRaw = skippedInstitutions || [];
  const seenSkipped = new Set<string>();
  const dedupedSkipped = skippedRaw.filter((row) => {
    const key = row.external_id || row.raw_name || row.institution_name || row.id;
    if (seenSkipped.has(key)) return false;
    seenSkipped.add(key);
    return true;
  });

  return NextResponse.json({
    schools: schools || [],
    programs: programs || [],
    requests: requests || [],
    demandQueue,
    skippedInstitutions: dedupedSkipped,
    stats: {
      totalSchools: schools?.length ?? 0,
      realSchools: schools?.filter((s) => !s.is_demo_record).length ?? 0,
      demoSchools: schools?.filter((s) => s.is_demo_record).length ?? 0,
      needsVerification: needsVerification.length,
      skippedInstitutions: dedupedSkipped.length,
    },
  });
}
