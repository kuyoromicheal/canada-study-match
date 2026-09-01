import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getOutreachForUser, upsertOutreach } from "@/lib/data/outreach";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const outreach = await getOutreachForUser(userId);
  const supabase = await createClient();

  const enriched = await Promise.all(
    outreach.map(async (o) => {
      let supervisor = null;
      let program = null;
      if (supabase) {
        if (o.supervisor_id) {
          const { data } = await supabase.from("supervisors").select("id, name, email, department, research_areas").eq("id", o.supervisor_id).maybeSingle();
          supervisor = data;
        }
        if (o.program_id) {
          const { data } = await supabase.from("programs").select("id, name, school_id").eq("id", o.program_id).maybeSingle();
          program = data;
        }
      }
      return { ...o, supervisor, program };
    })
  );

  return NextResponse.json({ outreach: enriched });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const record = await upsertOutreach(userId, body);
  if (!record) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  return NextResponse.json({ outreach: record });
}
