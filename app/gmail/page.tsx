import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { GmailCenterClient } from "@/components/gmail/gmail-center-client";

export default async function GmailPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login?redirect=/gmail");

  return <GmailCenterClient />;
}
