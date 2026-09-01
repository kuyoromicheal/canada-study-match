import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { buildBulkApplicationPackage } from "@/lib/applications/bulk-package";
import { getApplicationForUser, getStudentProfile } from "@/lib/data/repository";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const applicationIds: string[] = body.application_ids || [];

  if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
    return NextResponse.json({ error: "application_ids array required" }, { status: 400 });
  }

  const profile = await getStudentProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }

  const items = [];
  for (const id of applicationIds) {
    const app = await getApplicationForUser(userId, id);
    if (app) items.push(app);
  }

  if (!items.length) {
    return NextResponse.json({ error: "No valid applications found" }, { status: 404 });
  }

  const zipBytes = await buildBulkApplicationPackage(
    userId,
    profile,
    items.map((item) => ({
      application: { id: item.id, deadline_date: item.deadline_date },
      program: item.program,
      checklist: item.checklist,
    }))
  );

  return new NextResponse(new Uint8Array(zipBytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="bulk-application-packages-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
