import type { DocumentType } from "@/types/database";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  transcript: "Transcript",
  certificate: "Certificate / Diploma",
  resume: "CV / Resume",
  reference_letter: "Reference letter",
  english_test_report: "English test report",
  statement_of_purpose: "Statement of purpose",
  passport_copy: "Passport copy",
  other: "Other",
};

export const PREPARATION_DISCLAIMER =
  "This tool helps you prepare and organize your application materials. You'll still need to submit your application directly through each school's official application portal.";

export function validateUploadFile(file: { type: string; size: number; name: string }): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return "Only PDF, JPG, PNG, and DOCX files are allowed";
    }
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File must be 10MB or smaller";
  }
  if (file.size === 0) {
    return "File is empty";
  }
  return null;
}

export function storagePathForUser(userId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${Date.now()}-${safe}`;
}
