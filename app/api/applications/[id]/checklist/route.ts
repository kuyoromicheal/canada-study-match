import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { updateChecklistItem } from "@/lib/data/repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: _applicationId } = await params;
  const { item_id, is_completed, linked_document_id } = await request.json();

  if (!item_id) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const updates: { is_completed?: boolean; linked_document_id?: string | null } = {};
  if (typeof is_completed === "boolean") updates.is_completed = is_completed;
  if (linked_document_id !== undefined) updates.linked_document_id = linked_document_id;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const ok = await updateChecklistItem(userId, item_id, updates);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
