import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getDocumentsForUser, uploadDocumentForUser } from "@/lib/data/documents";
import type { DocumentType } from "@/types/database";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await getDocumentsForUser(userId);
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const docType = formData.get("doc_type") as DocumentType | null;
  const displayName = (formData.get("display_name") as string) || "";

  if (!(file instanceof File) || !docType) {
    return NextResponse.json({ error: "file and doc_type required" }, { status: 400 });
  }

  const result = await uploadDocumentForUser(userId, file, docType, displayName);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ document: result.document });
}
