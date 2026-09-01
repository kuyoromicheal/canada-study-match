import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { PREPARATION_DISCLAIMER } from "@/lib/documents/constants";
import { ExternalLink } from "lucide-react";

export function PreparationDisclaimer({
  admissionsUrl,
}: {
  admissionsUrl?: string | null;
}) {
  return (
    <Alert variant="info" title="Prepare only — you submit on the school's portal">
      <p>{PREPARATION_DISCLAIMER}</p>
      {admissionsUrl ? (
        <p className="mt-2">
          <Link
            href={admissionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-red-700 font-medium hover:underline"
          >
            Open official admissions portal
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </p>
      ) : null}
    </Alert>
  );
}
