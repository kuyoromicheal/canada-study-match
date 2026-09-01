import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { getApplicationPlansForUser } from "@/lib/data/application-plans";
import { ApplicationPlanClient } from "@/components/plan/application-plan-client";

export default async function ApplicationPlanPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login?redirect=/plan");

  const plans = await getApplicationPlansForUser(userId);

  return (
    <div className="space-y-6">
      <ApplicationPlanClient initialPlans={plans} />
    </div>
  );
}
