import { redirect } from "next/navigation";
import { SavedProgramsClient } from "@/components/programs/saved-programs-client";
import { getSessionUserId } from "@/lib/auth/session";
import { getSavedPrograms } from "@/lib/data/repository";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function SavedProgramsPage() {
  if (!isSupabaseConfigured()) redirect("/login");

  const userId = await getSessionUserId();
  if (!userId) redirect("/login?redirect=/saved");

  const saved = await getSavedPrograms(userId);
  const programs = saved.map((row) => ({
    ...row.program,
    savedMatchScore: row.match_score,
  }));

  return <SavedProgramsClient savedPrograms={programs} />;
}
