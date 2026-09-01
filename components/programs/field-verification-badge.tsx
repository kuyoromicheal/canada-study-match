import { Badge } from "@/components/ui/badge";
import type { VerificationStatus } from "@/types/database";
import { VERIFICATION_STATUS_LABELS } from "@/types/database";

function badgeVariant(status: VerificationStatus): "success" | "warning" | "info" {
  switch (status) {
    case "verified":
      return "success";
    case "partially_verified":
      return "info";
    default:
      return "warning";
  }
}

/** Program-level badge: existence, intake, type, degree level only. */
export function ProgramLevelBadge({
  isDemo,
  verificationStatus,
}: {
  isDemo: boolean;
  verificationStatus: VerificationStatus;
}) {
  if (isDemo) return <Badge variant="demo">DEMO</Badge>;
  return (
    <Badge variant={badgeVariant(verificationStatus)}>
      {VERIFICATION_STATUS_LABELS[verificationStatus]}
    </Badge>
  );
}

/** Per-fact verification badge for GPA, deadlines, tuition, etc. */
export function FieldVerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <Badge variant={badgeVariant(status)} className="text-[10px] px-1.5 py-0">
      {VERIFICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
