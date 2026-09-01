import { getSessionUserId } from "@/lib/auth/session";
import Link from "next/link";
import { getProgramMatches, getStudentProfile, getUpcomingDeadlines } from "@/lib/data/repository";
import { getCatalogStatus } from "@/lib/data/catalog-status";
import { CatalogNotice } from "@/components/catalog/catalog-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { ProgramCard } from "@/components/programs/program-card";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Calendar, Target, User } from "lucide-react";
import { SUPERVISOR_STATUS_LABELS } from "@/types/database";

export default async function DashboardPage() {
  const [profile, catalogStatus, deadlines, userId] = await Promise.all([
    getStudentProfile(),
    getCatalogStatus(),
    getUpcomingDeadlines(5),
    getSessionUserId(),
  ]);
  const matches = profile ? await getProgramMatches(profile) : [];
  const topMatches = matches.filter((m) => m.matchResult).slice(0, 3);
  const supervisorActions = matches.filter(
    (m) =>
      m.matchResult &&
      (m.matchResult.supervisorClassification === "SUPERVISOR_REQUIRED" ||
        m.matchResult.supervisorClassification === "UNKNOWN_VERIFY")
  ).slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}</p>
      </div>

      <CatalogNotice status={catalogStatus} />

      {!profile && !userId && (
        <Alert variant="info" title="Sign in to get personalized matches">
          <Link href="/login" className="text-red-700 underline">Sign in</Link> to save your profile and see match scores.
        </Alert>
      )}

      {!profile && userId && (
        <Alert variant="info" title="Complete your profile">
          <Link href="/onboarding" className="text-red-700 underline">Finish onboarding</Link>{" "}
          to get personalized match scores.
        </Alert>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={User}
          label="Profile Completeness"
          value={`${profile?.profile_completeness ?? 0}%`}
        >
          <Progress value={profile?.profile_completeness ?? 0} className="mt-2" />
        </StatCard>
        <StatCard icon={Target} label="Top Match Score" value={topMatches[0]?.matchResult ? `${topMatches[0].matchResult.score}%` : "—"} />
        <StatCard icon={Calendar} label="Upcoming Deadlines" value={String(deadlines.length)} />
        <StatCard icon={AlertTriangle} label="Supervisor Actions" value={String(supervisorActions.length)} />
      </div>

      {!profile?.onboarding_completed && (
        <Alert variant="info" title="Complete your profile">
          <Link href="/onboarding" className="text-red-700 underline">Finish onboarding</Link> for better matches.
        </Alert>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Top Matches</h2>
          <Link href="/programs" className="text-sm text-red-700 hover:underline">View all</Link>
        </div>
        {topMatches.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topMatches.map((p) => (
              <ProgramCard key={p.id} program={p} matchResult={p.matchResult} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Complete your profile to see program matches.
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Deadlines</h2>
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {deadlines.length > 0 ? deadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{d.program?.name}</p>
                    <p className="text-xs text-slate-500">{d.school?.name} · {d.intake}</p>
                  </div>
                  <Badge variant="warning">{formatDate(d.deadline_date)}</Badge>
                </div>
              )) : (
                <p className="p-4 text-sm text-slate-500">No upcoming deadlines.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Supervisor Actions Needed</h2>
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {supervisorActions.length > 0 ? supervisorActions.map((p) => (
                <Link key={p.id} href={`/programs/${p.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{SUPERVISOR_STATUS_LABELS[p.supervisor_status]}</p>
                  </div>
                  <Badge variant="danger">Action</Badge>
                </Link>
              )) : (
                <p className="p-4 text-sm text-slate-500">No supervisor actions pending.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-red-700" />
          <CardDescription>{label}</CardDescription>
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {children && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
