import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  createSignedUrlForDocument,
  deleteDocumentForUser,
  renameDocumentForUser,
} from "@/lib/data/documents";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { display_name } = await request.json();
  if (!display_name) {
    return NextResponse.json({ error: "display_name required" }, { status: 400 });
  }

  const ok = await renameDocumentForUser(userId, id, display_name);
  if (!ok) return NextResponse.json({ error: "Failed to rename" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteDocumentForUser(userId, id);
  if (!ok) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await createSignedUrlForDocument(userId, id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ url: result.url });
}
