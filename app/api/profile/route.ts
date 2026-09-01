import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getStudentProfile, saveStudentProfile } from "@/lib/data/repository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  validatePhone,
  validatePostalCode,
  validateRequiredText,
} from "@/lib/validation/contact";

function validateContactFields(body: Record<string, unknown>): string | null {
  if (body.phone_number && typeof body.phone_number === "string") {
    const err = validatePhone(body.phone_number);
    if (err) return err;
  }
  if (body.mailing_postal_code && typeof body.mailing_postal_code === "string") {
    const err = validatePostalCode(body.mailing_postal_code);
    if (err) return err;
  }
  const optionalFields: [string, string][] = [
    ["mailing_street", "Street address"],
    ["mailing_city", "City"],
    ["mailing_province_state", "Province/state"],
    ["mailing_country", "Country"],
  ];
  for (const [key, label] of optionalFields) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      const err = validateRequiredText(value, label);
      if (err) return err;
    }
  }
  return null;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getStudentProfile(userId);
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const body = await request.json();
  const contactError = validateContactFields(body);
  if (contactError) {
    return NextResponse.json({ error: contactError }, { status: 400 });
  }

  const userId = await getSessionUserId();

  if (!userId) {
    if (isSupabaseConfigured()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const profile = await saveStudentProfile("demo-user", body);
    return NextResponse.json({ profile });
  }

  const profile = await saveStudentProfile(userId, body);
  if (!profile) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
  return NextResponse.json({ profile });
}
