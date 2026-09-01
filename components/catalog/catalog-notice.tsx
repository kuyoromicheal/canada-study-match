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
      <Alert variant="warning" title="Demo Mode" className={className}>
        This app is using fictional DEMO data only. All universities, programs, and
        supervisors are placeholders until real, sourced data is added and verified.
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
        DEMO DATA ONLY — All program information is fictional placeholder data.{" "}
        {MATCH_DISCLAIMER}
      </>
    );
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
      <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
        DEMO DATA — Not real university information
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
