import { AdminPanelClient } from "@/components/admin/admin-panel-client";
import { requireAdminPage } from "@/lib/auth/admin";

export default async function AdminPage() {
  await requireAdminPage();
  return <AdminPanelClient />;
}
