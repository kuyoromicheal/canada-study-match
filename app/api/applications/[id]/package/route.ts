import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { downloadDocumentBytes } from "@/lib/data/documents";
import { getApplicationForUser } from "@/lib/data/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await getApplicationForUser(userId, id);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const linkedItems = application.checklist.filter((item) => item.linked_document_id);
  if (!linkedItems.length) {
    return NextResponse.json({ error: "No linked documents to download" }, { status: 400 });
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const item of linkedItems) {
    const docId = item.linked_document_id!;
    const downloaded = await downloadDocumentBytes(userId, docId);
    if (!downloaded.bytes || !downloaded.fileName) continue;

    let fileName = `${item.title.replace(/[^\w\s-]/g, "").trim()}-${downloaded.fileName}`;
    if (usedNames.has(fileName)) {
      fileName = `${item.id.slice(0, 8)}-${fileName}`;
    }
    usedNames.add(fileName);
    zip.file(fileName, downloaded.bytes);
  }

  const zipBytes = await zip.generateAsync({ type: "nodebuffer" });
  const safeProgram = application.program.name.replace(/[^\w\s-]/g, "").trim().slice(0, 40);

  return new NextResponse(new Uint8Array(zipBytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeProgram || "application"}-package.zip"`,
    },
  });
}
