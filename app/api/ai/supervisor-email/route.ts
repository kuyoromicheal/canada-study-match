import { NextResponse } from "next/server";
import { generateSupervisorEmail } from "@/lib/ai/email-generator";

export async function POST(request: Request) {
  const body = await request.json();
  const content = await generateSupervisorEmail(body);
  return NextResponse.json({ content });
}
