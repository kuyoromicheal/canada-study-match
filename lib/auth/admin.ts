import { redirect } from "next/navigation";
import { getAuthenticatedUserRole } from "@/lib/auth/require-admin-api";

export async function requireAdminPage() {
  const { userId, role } = await getAuthenticatedUserRole();
  if (!userId) redirect("/login?redirect=/admin");
  if (role !== "admin") redirect("/");
}
