import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { slugify } from "@/lib/ingest/parse-institutions";
import type { VerificationStatus } from "@/types/database";

const VERifiable_FIELDS = [
  "program_listing",
  "gpa",
  "english",
  "supervisor",
  "deadlines",
  "tuition",
  "prerequisites",
] as const;

type VerifiedField = (typeof VERifiable_FIELDS)[number];

function isVerifiedField(v: string): v is VerifiedField {
  return (VERifiable_FIELDS as readonly string[]).includes(v);
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { admin } = auth;
  const body = await request.json();

  if (!body.source_url) {
    return NextResponse.json({ error: "source_url is required" }, { status: 400 });
  }

  const verifiedFields: VerifiedField[] = Array.isArray(body.verified_fields)
    ? body.verified_fields.filter(isVerifiedField)
    : [];

  const publish = body.verification_status === "verified" || verifiedFields.includes("program_listing");
  const programStatus: VerificationStatus = publish ? "verified" : "needs_verification";

  const slug = body.slug || slugify(body.name);

  const { data: program, error: progErr } = await admin
    .from("programs")
    .insert({
      school_id: body.school_id,
      name: body.name,
      slug,
      field: body.field,
      degree_level: body.degree_level,
      program_type: body.program_type || "course_based",
      description: body.description,
      duration_months: body.duration_months,
      province: body.province,
      city: body.city,
      international_eligible: body.international_eligible ?? true,
      pgwp_eligible: body.pgwp_eligible ?? true,
      supervisor_status: body.supervisor_status || "unknown_verify",
      supervisor_requirement_text: body.supervisor_requirement_text,
      application_fee: body.application_fee,
      min_gpa: verifiedFields.includes("gpa") ? body.min_gpa : body.min_gpa ?? null,
      gpa_scale: body.gpa_scale || 4.0,
      english_requirement: verifiedFields.includes("english") ? body.english_requirement : body.english_requirement ?? null,
      prerequisites: body.prerequisites,
      intakes: body.intakes,
      is_demo_record: false,
      verification_status: programStatus,
      source_type: publish ? "university_official" : body.source_type || "manual",
      source_url: body.source_url,
      last_verified_at: publish ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (progErr) return NextResponse.json({ error: progErr.message }, { status: 400 });

  const childStatus = (field: VerifiedField): VerificationStatus =>
    verifiedFields.includes(field) ? "verified" : "needs_verification";

  if (verifiedFields.includes("gpa") && body.min_gpa != null) {
    await admin.from("program_requirements").insert({
      program_id: program.id,
      category: "Academic",
      title: "Minimum GPA",
      description: `${body.min_gpa}/${body.gpa_scale || 4.0}`,
      is_mandatory: true,
      is_demo_record: false,
      verification_status: "verified",
      source_type: "university_official",
      source_url: body.source_url,
      last_verified_at: new Date().toISOString(),
    });
  }

  if (verifiedFields.includes("english") && body.english_requirement) {
    await admin.from("program_requirements").insert({
      program_id: program.id,
      category: "Language",
      title: "English Proficiency",
      description: body.english_requirement,
      is_mandatory: true,
      is_demo_record: false,
      verification_status: "verified",
      source_type: "university_official",
      source_url: body.source_url,
      last_verified_at: new Date().toISOString(),
    });
  }

  if (verifiedFields.includes("supervisor")) {
    await admin.from("program_requirements").insert({
      program_id: program.id,
      category: "Supervisor",
      title: "Supervisor requirement",
      description: body.supervisor_requirement_text || body.supervisor_status,
      is_mandatory: body.supervisor_status === "required",
      is_demo_record: false,
      verification_status: "verified",
      source_type: "university_official",
      source_url: body.source_url,
      last_verified_at: new Date().toISOString(),
    });
  }

  for (const req of body.requirements || []) {
    await admin.from("program_requirements").insert({
      program_id: program.id,
      category: req.category,
      title: req.title,
      description: req.description,
      is_mandatory: true,
      is_demo_record: false,
      verification_status: childStatus("prerequisites"),
      source_type: body.source_type || "manual",
      source_url: body.source_url,
    });
  }

  for (const d of body.deadlines || []) {
    await admin.from("application_deadlines").insert({
      program_id: program.id,
      intake: d.intake,
      deadline_date: d.deadline_date,
      is_demo_record: false,
      verification_status: childStatus("deadlines"),
      source_type: body.source_type || "manual",
      source_url: body.source_url,
      last_verified_at: verifiedFields.includes("deadlines") ? new Date().toISOString() : null,
    });
  }

  if (body.tuition_amount) {
    await admin.from("tuition").insert({
      program_id: program.id,
      amount: body.tuition_amount,
      currency: "CAD",
      period: "year",
      student_type: "international",
      is_demo_record: false,
      verification_status: childStatus("tuition"),
      source_type: body.source_type || "manual",
      source_url: body.source_url,
      last_verified_at: verifiedFields.includes("tuition") ? new Date().toISOString() : null,
    });
  }

  return NextResponse.json({ data: program });
}

export async function PUT(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { admin } = auth;
  const body = await request.json();
  const { id, verified_fields, verify, ...rest } = body;

  if (!rest.source_url && !verify) {
    return NextResponse.json({ error: "source_url is required" }, { status: 400 });
  }

  const verifiedFields: VerifiedField[] = Array.isArray(verified_fields)
    ? verified_fields.filter(isVerifiedField)
    : verify
      ? ["program_listing"]
      : [];

  const updates: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
  };

  if (verifiedFields.includes("program_listing")) {
    updates.verification_status = "verified";
    updates.source_type = "university_official";
    updates.last_verified_at = new Date().toISOString();
  }

  const { data, error } = await admin.from("programs").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (verifiedFields.includes("gpa")) {
    await admin
      .from("program_requirements")
      .update({
        verification_status: "verified",
        last_verified_at: new Date().toISOString(),
      })
      .eq("program_id", id)
      .eq("category", "Academic")
      .eq("title", "Minimum GPA");
  }

  if (verifiedFields.includes("english")) {
    await admin
      .from("program_requirements")
      .update({
        verification_status: "verified",
        last_verified_at: new Date().toISOString(),
      })
      .eq("program_id", id)
      .eq("category", "Language");
  }

  if (verifiedFields.includes("supervisor")) {
    await admin
      .from("program_requirements")
      .update({
        verification_status: "verified",
        last_verified_at: new Date().toISOString(),
      })
      .eq("program_id", id)
      .eq("category", "Supervisor");
  }

  if (verifiedFields.includes("deadlines")) {
    await admin
      .from("application_deadlines")
      .update({
        verification_status: "verified",
        last_verified_at: new Date().toISOString(),
      })
      .eq("program_id", id);
  }

  if (verifiedFields.includes("tuition")) {
    await admin
      .from("tuition")
      .update({
        verification_status: "verified",
        last_verified_at: new Date().toISOString(),
      })
      .eq("program_id", id);
  }

  if (verifiedFields.includes("prerequisites")) {
    const { data: prereqRows } = await admin
      .from("program_requirements")
      .select("id, category")
      .eq("program_id", id);

    const excluded = new Set(["Academic", "Language", "Supervisor"]);
    for (const row of prereqRows || []) {
      if (excluded.has(row.category)) continue;
      await admin
        .from("program_requirements")
        .update({
          verification_status: "verified",
          last_verified_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({ data });
}
