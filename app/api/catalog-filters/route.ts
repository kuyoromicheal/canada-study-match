import { NextResponse } from "next/server";
import { getFields, getIntakes, getProvinces } from "@/lib/data/catalog-filters";

export async function GET() {
  const [provinces, fields, intakes] = await Promise.all([
    getProvinces(),
    getFields(),
    getIntakes(),
  ]);
  return NextResponse.json({ provinces, fields, intakes });
}
