/** Light validation for international phone/address — not over-restrictive. */

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  if (trimmed.length < 6 || trimmed.length > 25) {
    return "Phone number should be between 6 and 25 characters";
  }
  if (!/^[\d\s+\-().]+$/.test(trimmed)) {
    return "Phone may only contain digits, spaces, +, -, (, )";
  }
  return null;
}

export function validatePostalCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (trimmed.length < 3 || trimmed.length > 12) {
    return "Postal/ZIP code should be 3–12 characters";
  }
  return null;
}

export function validateRequiredText(value: string, label: string, max = 200): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length > max) return `${label} is too long (max ${max} characters)`;
  return null;
}

export function isContactProfileComplete(profile: {
  phone_number?: string | null;
  mailing_street?: string | null;
  mailing_city?: string | null;
  mailing_province_state?: string | null;
  mailing_postal_code?: string | null;
  mailing_country?: string | null;
}): boolean {
  return Boolean(
    profile.phone_number?.trim() &&
      profile.mailing_street?.trim() &&
      profile.mailing_city?.trim() &&
      profile.mailing_province_state?.trim() &&
      profile.mailing_postal_code?.trim() &&
      profile.mailing_country?.trim()
  );
}
