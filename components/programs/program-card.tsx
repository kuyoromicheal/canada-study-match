import { ProgramLevelBadge } from "@/components/programs/field-verification-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchResult, ProgramWithDetails } from "@/types/database";
import { SUPERVISOR_STATUS_LABELS } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ProgramCardActions } from "@/components/programs/program-card-actions";

function getMatchBadgeVariant(tier: MatchResult["tier"]) {
  switch (tier) {
    case "excellent":
    case "strong":
      return "success" as const;
    case "possible":
      return "info" as const;
    case "needs_review":
      return "warning" as const;
    default:
      return "danger" as const;
  }
}

function getSupervisorBadgeVariant(status: ProgramWithDetails["supervisor_status"]) {
  switch (status) {
    case "required":
      return "danger" as const;
    case "recommended":
      return "warning" as const;
    case "not_required":
      return "success" as const;
    default:
      return "warning" as const;
  }
}

export function ProgramCard({
  program,
  matchResult,
}: {
  program: ProgramWithDetails;
  matchResult?: MatchResult;
}) {
  const nextDeadline = program.deadlines?.sort(
    (a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime()
  )[0];
  const tuition = program.tuition?.find((t) => t.period === "year");

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <ProgramLevelBadge
                isDemo={program.is_demo_record}
                verificationStatus={program.verification_status}
              />
              {matchResult ? (
                <Badge variant={getMatchBadgeVariant(matchResult.tier)}>
                  {matchResult.score}% Match
                </Badge>
              ) : !program.is_demo_record && program.verification_status !== "verified" ? (
                <Badge variant="default">Not scored</Badge>
              ) : null}
            </div>
            <CardTitle className="text-base leading-snug">{program.name}</CardTitle>
            <p className="text-sm text-slate-500">
              {program.school?.name} · {program.city}, {program.province}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{program.degree_level}</Badge>
          <Badge>{program.program_type.replace("_", "-")}</Badge>
          <Badge variant={getSupervisorBadgeVariant(program.supervisor_status)}>
            {SUPERVISOR_STATUS_LABELS[program.supervisor_status]}
          </Badge>
        </div>

        <div className="text-sm text-slate-600 space-y-1">
          {tuition && (
            <p>Tuition: {formatCurrency(tuition.amount)}/year (intl.)</p>
          )}
          {program.application_fee != null && program.application_fee > 0 ? (
            <p>Application fee: {formatCurrency(program.application_fee)}</p>
          ) : (
            <p>Application fee: Free</p>
          )}
          {program.fee_waiver_available && (
            <p className="text-green-700 font-medium">
              Fee waiver may be available
              {program.fee_waiver_notes ? ` — ${program.fee_waiver_notes}` : ""}
            </p>
          )}
          <p className="text-xs text-slate-400">Fees are charged by the school&apos;s portal — this app does not process payments.</p>
          {nextDeadline && (
            <p>Next deadline: {formatDate(nextDeadline.deadline_date)} ({nextDeadline.intake})</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 items-center">
        <Link
          href={`/programs/${program.id}`}
          className="inline-flex flex-1 min-w-[100px] items-center justify-center gap-2 h-8 rounded-md px-3 text-xs font-medium bg-red-700 text-white hover:bg-red-800"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Link>
        <ProgramCardActions programId={program.id} matchScore={matchResult?.score} />
      </CardFooter>
    </Card>
  );
}
