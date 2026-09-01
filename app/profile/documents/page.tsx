import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentVaultClient } from "@/components/documents/document-vault-client";
import { getSessionUserId } from "@/lib/auth/session";
import { getDocumentsForUser } from "@/lib/data/documents";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function ProfileDocumentsPage() {
  if (!isSupabaseConfigured()) redirect("/login");

  const userId = await getSessionUserId();
  if (!userId) redirect("/login?redirect=/profile/documents");

  const documents = await getDocumentsForUser(userId);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Document vault</h1>
        <p className="text-slate-500 mt-1">
          Store transcripts, test scores, and other materials once — link them to multiple applications.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        <Link href="/profile" className="text-slate-600 hover:text-red-700">
          Contact & basics
        </Link>
        <span className="text-slate-300">|</span>
        <Link href="/profile/documents" className="font-medium text-red-700 underline">
          Document vault
        </Link>
        <span className="text-slate-300">|</span>
        <Link href="/onboarding" className="text-slate-600 hover:text-red-700">
          Full onboarding wizard
        </Link>
      </div>

      <DocumentVaultClient initialDocuments={documents} />
    </div>
  );
}
