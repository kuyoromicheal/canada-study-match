import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { CvBuilderClient } from "@/components/cv/cv-builder-client";

export default async function CvPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login?redirect=/cv");

  return <CvBuilderClient />;
}
