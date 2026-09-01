import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile/profile-client";
import { getSessionUserId } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/data/repository";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) redirect("/login");

  const userId = await getSessionUserId();
  if (!userId) redirect("/login?redirect=/profile");

  const profile = await getStudentProfile(userId);
  return <ProfileClient initialProfile={profile} />;
}
