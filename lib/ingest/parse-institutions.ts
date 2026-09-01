import * as cheerio from "cheerio";

export type InstitutionType = "university" | "college" | "polytechnic";

export interface ParsedInstitution {
  name: string;
  province: string;
  websiteUrl: string | null;
  city: string | null;
  institutionType: InstitutionType;
  sourceUrl: string;
  profileUrl?: string;
  externalId: string;
}

export interface ParseLogEntry {
  name: string;
  province?: string;
  reason: string;
  sourceUrl: string;
}

const PROVINCE_NORMALIZE: Record<string, string> = {
  "newfoundland & labrador": "Newfoundland and Labrador",
  "newfoundland and labrador": "Newfoundland and Labrador",
  "prince edward island": "Prince Edward Island",
  "british columbia": "British Columbia",
  "northwest territories": "Northwest Territories",
  "québec": "Quebec",
  "quebec": "Quebec",
};

const VALID_PROVINCES = new Set([
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
]);

export function isValidProvince(province: string): boolean {
  return VALID_PROVINCES.has(province);
}

export function normalizeProvince(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return PROVINCE_NORMALIZE[key] ?? raw.trim();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(the\)/gi, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function cleanCity(raw: string | null): string | null {
  if (!raw) return null;
  let city = raw
    .replace(/\(The\)/gi, "")
    .replace(/the vibrant and cosmopolitan city of /i, "")
    .replace(/the heart of Canada's largest city/i, "Toronto")
    .replace(/the heart of Southern Alberta/i, "Calgary")
    .replace(/the heart of the city/i, "")
    .replace(/beautiful /i, "")
    .replace(/downtown /i, "")
    .trim();

  if (city.includes(",")) city = city.split(",")[0].trim();
  if (city.length < 2 || city.length > 40) return null;
  if (/^(FO|B|About|Latest|Priorities)$/i.test(city)) return null;
  if (city.toLowerCase().includes("virtual tour")) return null;
  return city;
}

export function parseUniversitiesCanada(html: string, sourceUrl: string): {
  institutions: Omit<ParsedInstitution, "city">[];
  skipped: ParseLogEntry[];
} {
  const $ = cheerio.load(html);
  const institutions: Omit<ParsedInstitution, "city">[] = [];
  const skipped: ParseLogEntry[] = [];

  $("h2").each((_, h2) => {
    const province = normalizeProvince($(h2).text().trim());
    if (!isValidProvince(province)) return;

    let el = $(h2).next();
    while (el.length && el[0].tagName !== "h2") {
      el.find("a[href^='http']").each((__, link) => {
        const name = $(link).text().trim();
        const href = $(link).attr("href")?.trim();
        if (!name || !href || href.includes("univcan.ca")) return;

        institutions.push({
          name,
          province,
          websiteUrl: href,
          institutionType: "university",
          sourceUrl,
          externalId: `univcan:${slugify(name)}`,
        });
      });
      el = el.next();
    }
  });

  const seen = new Set<string>();
  return {
    institutions: institutions.filter((i) => {
      if (seen.has(i.externalId)) return false;
      seen.add(i.externalId);
      return true;
    }),
    skipped,
  };
}

export function parseCollegesCanada(html: string, sourceUrl: string): {
  institutions: Omit<ParsedInstitution, "city" | "websiteUrl">[];
  skipped: ParseLogEntry[];
} {
  const $ = cheerio.load(html);
  const institutions: Omit<ParsedInstitution, "city" | "websiteUrl">[] = [];
  const skipped: ParseLogEntry[] = [];

  $("h2").each((_, h2) => {
    const province = normalizeProvince($(h2).text().trim());
    if (!isValidProvince(province)) return;

    $(h2).nextAll("ul").first().find("li a").each((__, link) => {
      const name = $(link).text().trim();
      const profileUrl = $(link).attr("href")?.trim();
      if (!name || !profileUrl) {
        skipped.push({ name: name || "Unknown", province, reason: "Missing profile URL", sourceUrl });
        return;
      }
      if (!profileUrl.includes("/members/")) {
        skipped.push({ name, province, reason: "Not a member profile link", sourceUrl });
        return;
      }

      const slug = profileUrl.split("/").filter(Boolean).pop() || slugify(name);
      institutions.push({
        name,
        province,
        institutionType: name.toLowerCase().includes("polytechnic") ? "polytechnic" : "college",
        sourceUrl,
        profileUrl: profileUrl.startsWith("http") ? profileUrl : `https://www.collegesinstitutes.ca${profileUrl}`,
        externalId: `cican:${slug}`,
      });
    });
  });

  const seen = new Set<string>();
  return {
    institutions: institutions.filter((i) => {
      if (seen.has(i.externalId)) return false;
      seen.add(i.externalId);
      return true;
    }),
    skipped,
  };
}

export function extractCityFromHtml(html: string): string | null {
  const ldMatch = html.match(/"addressLocality"\s*:\s*"([^"]+)"/);
  if (ldMatch) return cleanCity(ldMatch[1]);

  const campusMatch = html.match(/campuses in ([A-Za-zÀ-ÿ' .-]+?)(?:,| and|<|\.)/i);
  if (campusMatch) return cleanCity(campusMatch[1]);

  const locatedMatch = html.match(/located in ([A-Za-zÀ-ÿ' .-]+?)(?:,|<|\.)/i);
  if (locatedMatch) return cleanCity(locatedMatch[1]);

  const postalMatch = html.match(/([A-Za-zÀ-ÿ' .-]{2,40}),\s*(?:AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/);
  if (postalMatch) return cleanCity(postalMatch[1]);

  return null;
}

export function extractWebsiteFromCollegeProfile(html: string): string | null {
  const $ = cheerio.load(html);
  let website: string | null = null;

  $("a").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    const text = $(el).text().trim().toLowerCase();
    if (
      href?.startsWith("http") &&
      !href.includes("collegesinstitutes.ca") &&
      (text.includes("website") || text.includes("visit"))
    ) {
      website = href;
      return false;
    }
  });

  if (website) return website;

  return $("a[href^='http']")
    .map((_, el) => $(el).attr("href"))
    .get()
    .find(
      (h) =>
        h &&
        !h.includes("collegesinstitutes.ca") &&
        !h.includes("facebook") &&
        !h.includes("twitter") &&
        !h.includes("linkedin") &&
        !h.includes("youtube")
    ) ?? null;
}

export async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "CanadaStudyMatch-Ingest/1.0 (directory sync)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Unreachable");
}
