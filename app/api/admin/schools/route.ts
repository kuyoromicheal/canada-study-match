import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { slugify } from "@/lib/ingest/parse-institutions";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { admin } = auth;
  const body = await request.json();
  const slug = body.slug || slugify(body.name);

  const { data, error } = await admin
    .from("schools")
    .upsert({
      ...body,
      slug,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { admin } = auth;
  const body = await request.json();
  const { id, ...rest } = body;

  const { data, error } = await admin
    .from("schools")
    .update({
      ...rest,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
