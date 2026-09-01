/**
 * One-time / re-runnable institution directory ingestion.
 * Run: npm run ingest:institutions
 */
import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  extractCityFromHtml,
  extractWebsiteFromCollegeProfile,
  fetchWithRetry,
  parseCollegesCanada,
  parseUniversitiesCanada,
  slugify,
  cleanCity,
  type ParsedInstitution,
} from "../lib/ingest/parse-institutions";
import { resolveKnownCity } from "../lib/ingest/known-cities";
import { classifyQuebecInstitution } from "../lib/ingest/quebec-classifier";
import type { InstitutionType } from "../lib/ingest/parse-institutions";

config({ path: ".env.local" });

const UNIVCAN_URL = "https://univcan.ca/about-universities-canada/our-members/";
const CICAN_URL =
  "https://www.collegesinstitutes.ca/colleges-and-institutes-in-your-community/our-members/";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function resolveCity(
  externalId: string,
  websiteUrl: string | null,
  profileUrl?: string
): Promise<string | null> {
  const known = resolveKnownCity(externalId);
  if (known) return known;

  const urls = [websiteUrl, profileUrl].filter(Boolean) as string[];
  for (const url of urls) {
    try {
      const html = await fetchWithRetry(url);
      const city = cleanCity(extractCityFromHtml(html));
      if (city && city.length > 1 && city.length < 60) return city;
    } catch {
      // try next
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function upsertSchool(inst: ParsedInstitution) {
  const slugBase = slugify(inst.name);
  const slug =
    inst.institutionType === "university"
      ? slugBase
      : `${slugBase}-${inst.institutionType}`;

  const { error } = await supabase.from("schools").upsert(
    {
      external_id: inst.externalId,
      name: inst.name,
      slug,
      province: inst.province,
      city: inst.city,
      website_url: inst.websiteUrl,
      institution_type: inst.institutionType,
      is_demo_record: false,
      verification_status: "verified",
      source_url: inst.sourceUrl,
      last_verified_at: new Date().toISOString(),
    },
    { onConflict: "external_id" }
  );

  if (error) throw error;
}

async function logIngestion(entry: {
  status: "upserted" | "skipped" | "failed";
  name: string;
  province?: string;
  externalId?: string;
  rawCity?: string | null;
  rawUrl?: string | null;
  sourceUrl: string;
  institutionType: InstitutionType;
  reason?: string;
}) {
  const province = entry.province || "";
  const { quebecCategory, note } = classifyQuebecInstitution(entry.name, province);
  const reasonParts = [entry.reason, note].filter(Boolean);
  const suggestedType =
    quebecCategory === "cegep" ? "college" : entry.institutionType;

  await supabase.from("ingestion_logs").insert({
    status: entry.status,
    institution_name: entry.name,
    raw_name: entry.name,
    external_id: entry.externalId ?? null,
    raw_city: entry.rawCity ?? null,
    raw_url: entry.rawUrl ?? null,
    province: province || null,
    source_url: entry.sourceUrl,
    institution_type: entry.institutionType,
    suggested_institution_type: suggestedType,
    quebec_category: quebecCategory,
    reason: reasonParts.length ? reasonParts.join(" — ") : null,
  });
}

async function main() {
  console.log("=== Canada Study Match — Institution Ingestion ===\n");

  // Clean bad rows from prior runs (nav links parsed as institutions)
  await supabase.from("schools").delete().eq("is_demo_record", false).in("province", [
    "About", "Latest", "Priorities", "Programs and scholarships", "French",
  ]);

  let upserted = 0;
  let skipped = 0;
  const skippedLog: string[] = [];

  // --- Universities Canada ---
  console.log("Fetching Universities Canada directory...");
  const univHtml = await fetchWithRetry(UNIVCAN_URL);
  const { institutions: universities, skipped: univSkipped } =
    parseUniversitiesCanada(univHtml, UNIVCAN_URL);

  console.log(`Found ${universities.length} universities (${univSkipped.length} skipped at parse)`);

  for (const u of universities) {
    const city = await resolveCity(u.externalId, u.websiteUrl);
    if (!city) {
      skipped++;
      const msg = `[SKIP] ${u.name} (${u.province}) — could not confidently parse city`;
      skippedLog.push(msg);
      console.log(msg);
      await logIngestion({
        status: "skipped",
        name: u.name,
        province: u.province,
        externalId: u.externalId,
        rawUrl: u.websiteUrl,
        sourceUrl: UNIVCAN_URL,
        institutionType: "university",
        reason: "City not found on website",
      });
      continue;
    }

    try {
      await upsertSchool({ ...u, city, websiteUrl: u.websiteUrl });
      upserted++;
      console.log(`[OK] ${u.name} — ${city}, ${u.province}`);
      await logIngestion({
        status: "upserted",
        name: u.name,
        province: u.province,
        externalId: u.externalId,
        rawCity: city,
        rawUrl: u.websiteUrl,
        sourceUrl: UNIVCAN_URL,
        institutionType: "university",
      });
    } catch (err) {
      skipped++;
      const msg = `[FAIL] ${u.name}: ${err instanceof Error ? err.message : err}`;
      skippedLog.push(msg);
      console.error(msg);
      await logIngestion({
        status: "failed",
        name: u.name,
        province: u.province,
        externalId: u.externalId,
        rawUrl: u.websiteUrl,
        sourceUrl: UNIVCAN_URL,
        institutionType: "university",
        reason: String(err),
      });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  for (const s of univSkipped) {
    skipped++;
    skippedLog.push(`[SKIP PARSE] ${s.name}: ${s.reason}`);
    console.log(`[SKIP PARSE] ${s.name}: ${s.reason}`);
    await logIngestion({
      status: "skipped",
      name: s.name,
      province: s.province,
      sourceUrl: s.sourceUrl,
      institutionType: "university",
      reason: s.reason,
    });
  }

  // --- Colleges & Institutes Canada ---
  console.log("\nFetching Colleges and Institutes Canada directory...");
  const colHtml = await fetchWithRetry(CICAN_URL);
  const { institutions: colleges, skipped: colSkipped } = parseCollegesCanada(colHtml, CICAN_URL);

  console.log(`Found ${colleges.length} colleges/polytechnics`);

  for (const c of colleges) {
    let websiteUrl: string | null = null;
    let city: string | null = null;

    if (c.profileUrl) {
      try {
        const profileHtml = await fetchWithRetry(c.profileUrl);
        websiteUrl = extractWebsiteFromCollegeProfile(profileHtml);
        city = extractCityFromHtml(profileHtml);
      } catch {
        // logged below
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!city) city = await resolveCity(c.externalId, websiteUrl, c.profileUrl);

    if (!city) {
      skipped++;
      const msg = `[SKIP] ${c.name} (${c.province}) — could not confidently parse city`;
      skippedLog.push(msg);
      console.log(msg);
      await logIngestion({
        status: "skipped",
        name: c.name,
        province: c.province,
        externalId: c.externalId,
        rawUrl: websiteUrl || c.profileUrl || null,
        sourceUrl: CICAN_URL,
        institutionType: c.institutionType,
        reason: "City not found",
      });
      continue;
    }

    if (!websiteUrl) {
      skipped++;
      const msg = `[SKIP] ${c.name} (${c.province}) — could not confidently parse website URL`;
      skippedLog.push(msg);
      console.log(msg);
      await logIngestion({
        status: "skipped",
        name: c.name,
        province: c.province,
        externalId: c.externalId,
        rawCity: city,
        rawUrl: c.profileUrl || null,
        sourceUrl: CICAN_URL,
        institutionType: c.institutionType,
        reason: "Website URL not found",
      });
      continue;
    }

    try {
      await upsertSchool({ ...c, city, websiteUrl });
      upserted++;
      console.log(`[OK] ${c.name} — ${city}, ${c.province}`);
      await logIngestion({
        status: "upserted",
        name: c.name,
        province: c.province,
        externalId: c.externalId,
        rawCity: city,
        rawUrl: websiteUrl,
        sourceUrl: CICAN_URL,
        institutionType: c.institutionType,
      });
    } catch (err) {
      skipped++;
      console.error(`[FAIL] ${c.name}:`, err);
      await logIngestion({
        status: "failed",
        name: c.name,
        province: c.province,
        externalId: c.externalId,
        rawUrl: websiteUrl,
        sourceUrl: CICAN_URL,
        institutionType: c.institutionType,
        reason: String(err),
      });
    }
  }

  for (const s of colSkipped) {
    skipped++;
    skippedLog.push(`[SKIP PARSE] ${s.name}: ${s.reason}`);
    await logIngestion({
      status: "skipped",
      name: s.name,
      province: s.province,
      sourceUrl: s.sourceUrl,
      institutionType: "college",
      reason: s.reason,
    });
  }

  // Summary
  const { count: realCount } = await supabase
    .from("schools")
    .select("*", { count: "exact", head: true })
    .eq("is_demo_record", false);

  const { count: demoCount } = await supabase
    .from("schools")
    .select("*", { count: "exact", head: true })
    .eq("is_demo_record", true);

  console.log("\n=== Summary ===");
  console.log(`Upserted this run: ${upserted}`);
  console.log(`Skipped this run:  ${skipped}`);
  console.log(`Real schools in DB: ${realCount ?? 0}`);
  console.log(`Demo schools in DB: ${demoCount ?? 0} (preserved)`);

  if (skippedLog.length) {
    console.log("\n--- Manual review needed ---");
    skippedLog.slice(0, 30).forEach((l) => console.log(l));
    if (skippedLog.length > 30) console.log(`... and ${skippedLog.length - 30} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
