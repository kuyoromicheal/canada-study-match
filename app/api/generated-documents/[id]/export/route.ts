import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { exportTextToDocx, exportTextToPdf } from "@/lib/documents/export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "docx";

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { data: doc } = await supabase
    .from("generated_documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const safeTitle = doc.title.replace(/[^a-z0-9-_]/gi, "_").slice(0, 60);

  if (format === "pdf") {
    const buffer = await exportTextToPdf(doc.title, doc.content);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  }

  const buffer = await exportTextToDocx(doc.title, doc.content);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
    },
  });
}
