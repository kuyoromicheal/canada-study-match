"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Mail, RefreshCw, Unplug } from "lucide-react";
import { GMAIL_SCOPE_DESCRIPTION } from "@/lib/gmail/config";

interface GmailStatus {
  status: "connected" | "not_connected" | "reauthorization_required";
  email: string | null;
  configured: boolean;
}

export function GmailConnectButton({
  onConnected,
  compact,
}: {
  onConnected?: () => void;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/gmail/connect");
    if (res.ok) {
      const data = await res.json();
      setStatus(data);
      if (data.status === "connected" && onConnected) onConnected();
    }
    setLoading(false);
  }, [onConnected]);

  useEffect(() => {
    load();
  }, [load]);

  async function connect() {
    setActionLoading(true);
    const res = await fetch("/api/gmail/connect", { method: "POST" });
    const data = await res.json();
    setActionLoading(false);
    if (data.url) {
      window.location.href = data.url;
    }
  }

  async function disconnect() {
    setActionLoading(true);
    await fetch("/api/gmail/disconnect", { method: "POST" });
    await load();
    setActionLoading(false);
  }

  if (loading) return <p className="text-sm text-slate-500">Checking Gmail status…</p>;

  if (!status?.configured) {
    return (
      <Alert variant="warning" title="Gmail not configured">
        Admin must set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_TOKEN_ENCRYPTION_KEY.
      </Alert>
    );
  }

  if (status.status === "connected") {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "p-4 rounded-xl border border-green-200 bg-green-50"}`}>
        <div className="flex items-center gap-2 text-green-800">
          <Mail className="h-4 w-4" />
          <span className="font-medium">Gmail connected</span>
          <span className="text-sm">{status.email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={disconnect} disabled={actionLoading}>
          <Unplug className="h-3.5 w-3.5" /> Disconnect
        </Button>
        <Button variant="outline" size="sm" onClick={connect} disabled={actionLoading}>
          <RefreshCw className="h-3.5 w-3.5" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "space-y-3 p-4 rounded-xl border border-slate-200 bg-white"}>
      {!compact && (
        <>
          <p className="text-sm text-slate-600">{GMAIL_SCOPE_DESCRIPTION}</p>
          <p className="text-xs text-slate-500">
            We never ask for your Gmail password. OAuth only. Emails are sent only after you click Send.
          </p>
        </>
      )}
      <Button onClick={connect} disabled={actionLoading} className="gap-2">
        <Mail className="h-4 w-4" />
        {actionLoading ? "Connecting…" : "Connect Gmail"}
      </Button>
      {status.status === "reauthorization_required" && (
        <p className="text-sm text-yellow-700">Reauthorization required — click Connect Gmail.</p>
      )}
    </div>
  );
}
