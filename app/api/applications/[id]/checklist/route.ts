import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { updateChecklistItem } from "@/lib/data/repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { item_id, is_completed } = await request.json();

  if (!item_id || typeof is_completed !== "boolean") {
    return NextResponse.json({ error: "item_id and is_completed required" }, { status: 400 });
  }

  const ok = await updateChecklistItem(userId, item_id, is_completed);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
