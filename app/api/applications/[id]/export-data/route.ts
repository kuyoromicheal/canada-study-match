import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { buildApplicationDataSummary } from "@/lib/applications/application-data-summary";
import { exportTextToPdf } from "@/lib/documents/export";
import { getApplicationForUser, getStudentProfile } from "@/lib/data/repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") || "txt";

  const [application, profile] = await Promise.all([
    getApplicationForUser(userId, id),
    getStudentProfile(userId),
  ]);

  if (!application || !profile) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const summary = buildApplicationDataSummary(
    profile,
    application.program,
    application.checklist
  );
  const safeName = application.program.name.replace(/[^\w\s-]/g, "").trim().slice(0, 40);

  if (format === "pdf") {
    const pdf = await exportTextToPdf(
      `Application Data — ${application.program.name}`,
      summary
    );
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName || "application"}-data.pdf"`,
      },
    });
  }

  return new NextResponse(summary, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || "application"}-data.txt"`,
    },
  });
}
