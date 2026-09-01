import { createClient } from "@/lib/supabase/server";

export async function logAiGeneration(params: {
  userId: string;
  generationType: string;
  programId?: string;
  entityId?: string;
  promptSummary?: string;
  model?: string;
  success?: boolean;
  errorMessage?: string;
}): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  await supabase.from("ai_generation_logs").insert({
    user_id: params.userId,
    generation_type: params.generationType,
    program_id: params.programId || null,
    entity_id: params.entityId || null,
    prompt_summary: params.promptSummary?.slice(0, 500) || null,
    model: params.model || null,
    success: params.success ?? true,
    error_message: params.errorMessage || null,
  });
}

export async function saveGeneratedDocument(params: {
  userId: string;
  programId?: string;
  documentType: string;
  title: string;
  content: string;
  optimizationNotes?: string;
  contentJson?: Record<string, unknown>;
  parentDocumentId?: string;
}): Promise<{ id: string } | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  let versionNumber = 1;
  if (params.parentDocumentId) {
    const { data: parent } = await supabase
      .from("generated_documents")
      .select("version_number")
      .eq("id", params.parentDocumentId)
      .maybeSingle();
    versionNumber = (parent?.version_number || 0) + 1;
  }

  const { data, error } = await supabase
    .from("generated_documents")
    .insert({
      user_id: params.userId,
      program_id: params.programId || null,
      document_type: params.documentType,
      title: params.title,
      content: params.content,
      content_json: params.contentJson || null,
      optimization_notes: params.optimizationNotes || null,
      word_count: params.content.split(/\s+/).length,
      version_number: versionNumber,
      parent_document_id: params.parentDocumentId || null,
    })
    .select("id")
    .single();

  if (error || !data) return null;

  await supabase.from("ai_generated_content").insert({
    user_id: params.userId,
    content_type: params.documentType,
    entity_type: params.programId ? "program" : "profile",
    entity_id: params.programId || null,
    prompt_summary: params.title,
    generated_content: params.content,
  });

  return { id: data.id };
}

export async function getGeneratedDocuments(
  userId: string,
  filters?: { programId?: string; documentType?: string }
) {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from("generated_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filters?.programId) query = query.eq("program_id", filters.programId);
  if (filters?.documentType) query = query.eq("document_type", filters.documentType);

  const { data } = await query;
  return data || [];
}
