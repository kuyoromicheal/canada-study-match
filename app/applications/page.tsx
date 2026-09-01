import { redirect } from "next/navigation";
import { ApplicationsClient } from "@/components/applications/applications-client";
import { getSessionUserId } from "@/lib/auth/session";
import { getApplications } from "@/lib/data/repository";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function ApplicationsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login?redirect=/applications");
  }

  const applications = await getApplications(userId);
  return <ApplicationsClient initialApplications={applications} />;
}
