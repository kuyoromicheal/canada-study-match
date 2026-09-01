import { Alert } from "@/components/ui/alert";
import { MATCH_DISCLAIMER } from "@/types/database";
import type { CatalogStatus } from "@/lib/data/catalog-status";

export function CatalogNotice({
  status,
  className,
}: {
  status: CatalogStatus;
  className?: string;
}) {
  if (status.mode === "seed") {
    return (
      <Alert variant="warning" title="Supabase not configured" className={className}>
        This deployment is missing Supabase environment variables. Add{" "}
        <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable live
        data and accounts.
      </Alert>
    );
  }

  if (status.mode === "empty") {
    return (
      <Alert variant="info" title="Catalog loading" className={className}>
        Your database is connected but no real programs are listed yet. Use the admin
        panel to ingest institutions and programs.
      </Alert>
    );
  }

  if (status.mode === "mixed") {
    return (
      <Alert variant="info" title="Mixed catalog" className={className}>
        This catalog includes {status.verifiedProgramCount} verified real program
        {status.verifiedProgramCount === 1 ? "" : "s"} across {status.realSchoolCount}{" "}
        institution{status.realSchoolCount === 1 ? "" : "s"}, plus {status.demoProgramCount}{" "}
        DEMO placeholder{status.demoProgramCount === 1 ? "" : "s"}. Check each
        program&apos;s badge — verified listing does not mean every requirement field
        has been confirmed. {MATCH_DISCLAIMER}
      </Alert>
    );
  }

  return (
    <Alert variant="info" title="Verify before you apply" className={className}>
      Programs are sourced from official institution listings. Individual facts (GPA,
      deadlines, tuition) show their own verification status. {MATCH_DISCLAIMER}
    </Alert>
  );
}

export function CatalogFooterText({ status }: { status: CatalogStatus }) {
  if (status.mode === "seed") {
    return (
      <>
        Supabase not configured — set environment variables to enable live data.{" "}
        {MATCH_DISCLAIMER}
      </>
    );
  }

  if (status.mode === "empty") {
    return <>Catalog connected — programs are being added. {MATCH_DISCLAIMER}</>;
  }

  if (status.mode === "mixed") {
    return (
      <>
        Catalog includes verified real programs and DEMO placeholders — check badges on
        each program. {MATCH_DISCLAIMER}
      </>
    );
  }

  return <>{MATCH_DISCLAIMER}</>;
}

export function CatalogHeroBadge({ status }: { status: CatalogStatus }) {
  if (status.mode === "seed") {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
        Setup required — connect Supabase
      </span>
    );
  }

  if (status.mode === "empty") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
        Connected — catalog being populated
      </span>
    );
  }

  if (status.mode === "mixed") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
        {status.verifiedProgramCount} verified programs · {status.realSchoolCount} real
        institutions
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
      Live catalog — {status.verifiedProgramCount} verified programs
    </span>
  );
}
