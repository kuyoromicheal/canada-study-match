import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  SIGNED_URL_EXPIRY_SECONDS,
  storagePathForUser,
  validateUploadFile,
} from "@/lib/documents/constants";
import type { DocumentType, StudentDocument } from "@/types/database";

const BUCKET = "student-documents";

export async function getDocumentsForUser(userId: string): Promise<StudentDocument[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });

  return (data as StudentDocument[]) || [];
}

export async function createDocumentRecord(
  userId: string,
  input: {
    doc_type: DocumentType;
    display_name: string;
    file_name: string;
    storage_path: string;
    file_size: number;
    mime_type: string;
  }
): Promise<StudentDocument | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("documents")
    .insert({ user_id: userId, ...input })
    .select()
    .single();

  if (error) return null;
  return data as StudentDocument;
}

export async function uploadDocumentForUser(
  userId: string,
  file: File,
  docType: DocumentType,
  displayName: string
): Promise<{ document?: StudentDocument; error?: string }> {
  const validationError = validateUploadFile({
    type: file.type,
    size: file.size,
    name: file.name,
  });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  if (!supabase) return { error: "Storage unavailable" };

  const storagePath = storagePathForUser(userId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return { error: "Upload failed. Check file type and size." };
  }

  const document = await createDocumentRecord(userId, {
    doc_type: docType,
    display_name: displayName.trim() || file.name,
    file_name: file.name,
    storage_path: storagePath,
    file_size: file.size,
    mime_type: file.type || "application/octet-stream",
  });

  if (!document) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { error: "Failed to save document record" };
  }

  return { document };
}

export async function renameDocumentForUser(
  userId: string,
  documentId: string,
  displayName: string
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const trimmed = displayName.trim();
  if (!trimmed) return false;

  const { error } = await supabase
    .from("documents")
    .update({ display_name: trimmed })
    .eq("id", documentId)
    .eq("user_id", userId);

  return !error;
}

export async function deleteDocumentForUser(
  userId: string,
  documentId: string
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!doc) return false;

  await supabase.storage.from(BUCKET).remove([doc.storage_path]);

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", userId);

  return !error;
}

export async function createSignedUrlForDocument(
  userId: string,
  documentId: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Storage unavailable" };

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!doc) return { error: "Document not found" };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    return { error: "Unable to generate preview link" };
  }

  return { url: data.signedUrl };
}

export async function downloadDocumentBytes(
  userId: string,
  documentId: string
): Promise<{ bytes?: Buffer; fileName?: string; mimeType?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Storage unavailable" };

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, file_name, mime_type")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!doc) return { error: "Document not found" };

  const { data, error } = await supabase.storage.from(BUCKET).download(doc.storage_path);
  if (error || !data) return { error: "Download failed" };

  const bytes = Buffer.from(await data.arrayBuffer());
  return { bytes, fileName: doc.file_name, mimeType: doc.mime_type };
}
