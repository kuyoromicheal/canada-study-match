import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { school_name, program_name, field, province, notes } = body;

  if (!school_name || !program_name) {
    return NextResponse.json({ error: "school_name and program_name required" }, { status: 400 });
  }

  let userId: string | null = null;
  const supabase = await createClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  const admin = createAdminClient();
  const client = admin ?? supabase;
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  // Upsert: increment request_count if same school+program exists
  const { data: existing } = await client
    .from("program_requests")
    .select("id, request_count")
    .eq("school_name", school_name)
    .eq("program_name", program_name)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    const { data, error } = await client
      .from("program_requests")
      .update({
        request_count: existing.request_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  const { data, error } = await client.from("program_requests").insert({
    user_id: userId,
    school_name,
    program_name,
    field,
    province,
    notes,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
