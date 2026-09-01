import { redirect } from "next/navigation";
import { ApplicationsClient } from "@/components/applications/applications-client";
import { getSessionUserId } from "@/lib/auth/session";
import { getApplications, getStudentProfile } from "@/lib/data/repository";
import { getDocumentsForUser } from "@/lib/data/documents";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function ApplicationsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login?redirect=/applications");
  }

  const [applications, profile, documents] = await Promise.all([
    getApplications(userId),
    getStudentProfile(userId),
    getDocumentsForUser(userId),
  ]);

  return (
    <ApplicationsClient
      initialApplications={applications}
      profile={profile}
      documents={documents}
    />
  );
}
