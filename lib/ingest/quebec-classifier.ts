export type QuebecCategory = "cegep" | "uq_campus" | "university" | "other" | null;

export function classifyQuebecInstitution(
  name: string,
  province: string
): { quebecCategory: QuebecCategory; note: string | null } {
  if (province !== "Quebec") {
    return { quebecCategory: null, note: null };
  }

  const lower = name.toLowerCase();

  if (/\bcegep\b/i.test(name) || lower.includes("cégep")) {
    return {
      quebecCategory: "cegep",
      note: "CEGEP — college-level, pre-university; use institution_type = college",
    };
  }

  if (
    /^université du québec|^universite du quebec|^uq\b/i.test(name) ||
    /\buq[a-z]{2,}\b/i.test(name) ||
    lower.includes("uqam") ||
    lower.includes("uqtr") ||
    lower.includes("uqar") ||
    lower.includes("uqat") ||
    lower.includes("uqo") ||
    lower.includes("uqac") ||
    lower.includes("uqrm") ||
    lower.includes("enap") ||
    lower.includes("téluq") ||
    lower.includes("teluq")
  ) {
    return {
      quebecCategory: "uq_campus",
      note: "UQ satellite campus — verify whether this is a distinct campus vs full standalone university",
    };
  }

  if (
    lower.includes("université") ||
    lower.includes("universite") ||
    lower.includes("university")
  ) {
    return {
      quebecCategory: "university",
      note: "Full university — use institution_type = university",
    };
  }

  return {
    quebecCategory: "other",
    note: "Quebec institution — classify manually (college, polytechnic, or university)",
  };
}
