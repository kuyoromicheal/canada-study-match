"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { GmailConnectButton } from "@/components/gmail/gmail-connect-button";
import { RefreshCw } from "lucide-react";

const CATEGORIES = [
  { id: "action_required", label: "Action Required", variant: "danger" as const },
  { id: "supervisors", label: "Supervisors", variant: "warning" as const },
  { id: "universities", label: "Universities", variant: "default" as const },
  { id: "applications", label: "Applications", variant: "default" as const },
  { id: "offers", label: "Offers", variant: "success" as const },
  { id: "scholarships", label: "Scholarships", variant: "default" as const },
];

interface Thread {
  id: string;
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  snippet: string | null;
  category: string;
  classification: string | null;
  received_at: string | null;
}

export function GmailCenterClient() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);

  async function loadThreads() {
    const params = filter ? `?category=${filter}` : "";
    const res = await fetch(`/api/gmail/messages${params}`);
    if (res.ok) {
      const data = await res.json();
      setThreads(data.threads || []);
    }
  }

  useEffect(() => {
    if (connected) loadThreads();
  }, [filter, connected]);

  async function sync() {
    setSyncing(true);
    await fetch("/api/gmail/messages", { method: "POST" });
    await loadThreads();
    setSyncing(false);
  }

  const actionRequired = threads.filter((t) => t.category === "action_required");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gmail Application Center</h1>
        <p className="text-slate-500">Application-related emails only — universities, supervisors, admissions</p>
      </div>

      <GmailConnectButton onConnected={() => setConnected(true)} />

      {connected && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync emails
            </Button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(filter === c.id ? "" : c.id)}
                className={`text-xs px-3 py-1 rounded-full border ${filter === c.id ? "bg-red-50 border-red-200 text-red-800" : "border-slate-200 text-slate-600"}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {actionRequired.length > 0 && (
            <Alert variant="warning" title="Action required">
              {actionRequired.length} email(s) may need your response.
            </Alert>
          )}

          <div className="grid gap-3">
            {threads.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No application emails synced yet. Click Sync emails after connecting Gmail.
              </p>
            ) : (
              threads.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <CardTitle className="text-sm font-medium">{t.subject || "(No subject)"}</CardTitle>
                      <Badge variant={t.category === "action_required" ? "danger" : "default"}>
                        {t.category.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t.from_name || t.from_email} · {t.received_at ? new Date(t.received_at).toLocaleDateString() : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600">
                    <p>{t.snippet}</p>
                    {t.classification && (
                      <p className="text-xs text-slate-500 mt-2">Classification: {t.classification.replace("_", " ")}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
