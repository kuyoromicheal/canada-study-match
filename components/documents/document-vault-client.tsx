"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";
import type { DocumentType, StudentDocument } from "@/types/database";
import { Eye, FileText, Pencil, Trash2, Upload } from "lucide-react";

const DOC_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

export function DocumentVaultClient({
  initialDocuments,
}: {
  initialDocuments: StudentDocument[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [docType, setDocType] = useState<DocumentType>("transcript");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);
    formData.append("display_name", displayName || file.name);

    const res = await fetch("/api/documents", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }

    setDisplayName("");
    if (fileRef.current) fileRef.current.value = "";
    await reload();
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: editName }),
    });
    if (res.ok) {
      setEditingId(null);
      await reload();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document from your vault?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) await reload();
  }

  async function handlePreview(id: string) {
    const res = await fetch(`/api/documents/${id}`);
    const data = await res.json();
    if (res.ok && data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    else setError(data.error || "Preview unavailable");
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <p className="text-sm text-slate-500">
              PDF, JPG, PNG, or DOCX only. Maximum 10MB per file. Files are stored privately in your vault.
            </p>
            {error && (
              <Alert variant="error" title="Upload error">
                {error}
              </Alert>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doc_type">Document type</Label>
                <Select id="doc_type" value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
                  {DOC_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display name (optional)</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. University of X transcript"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <input
                id="file"
                type="file"
                ref={fileRef}
                accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png"
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" disabled={uploading}>
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload to vault"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents yet. Upload transcripts, test scores, and other materials above.</p>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-slate-200">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    {editingId === doc.id ? (
                      <div className="flex gap-2">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                        <Button size="sm" onClick={() => handleRename(doc.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm text-slate-900 truncate">{doc.display_name}</p>
                        <p className="text-xs text-slate-500">
                          {DOCUMENT_TYPE_LABELS[doc.doc_type]} · {formatSize(doc.file_size)} · {doc.file_name}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handlePreview(doc.id)}>
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(doc.id);
                      setEditName(doc.display_name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
