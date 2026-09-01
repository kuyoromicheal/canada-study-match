import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { OutreachClient } from "@/components/outreach/outreach-client";

export default async function OutreachPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login?redirect=/outreach");

  return <OutreachClient />;
}
