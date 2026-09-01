"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OUTREACH_STATUS_LABELS, type OutreachStatus } from "@/lib/gmail/config";

interface OutreachRow {
  id: string;
  status: OutreachStatus;
  subject: string | null;
  sent_at: string | null;
  follow_up_due: string | null;
  response_classification: string | null;
  supervisor?: { name: string; email: string | null };
  program?: { name: string; id: string };
}

export function OutreachClient() {
  const [outreach, setOutreach] = useState<OutreachRow[]>([]);

  useEffect(() => {
    fetch("/api/outreach").then((r) => r.json()).then((d) => setOutreach(d.outreach || []));
  }, []);

  const followUps = outreach.filter((o) => o.status === "follow_up_due" || o.status === "no_response");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Supervisor Outreach</h1>
        <p className="text-slate-500">Track supervisor contacts, responses, and follow-ups</p>
      </div>

      {followUps.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader><CardTitle className="text-base">Follow-up recommended</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            {followUps.map((o) => (
              <p key={o.id}>
                {o.supervisor?.name} — contacted {o.sent_at ? new Date(o.sent_at).toLocaleDateString() : "—"}
                {o.follow_up_due && ` · Follow-up due ${o.follow_up_due}`}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {outreach.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No outreach records yet. Generate supervisor emails from a{" "}
            <Link href="/programs" className="text-red-700 underline">program details</Link> page.
          </p>
        ) : (
          outreach.map((o) => (
            <Card key={o.id}>
              <CardContent className="pt-5 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{o.supervisor?.name || "Supervisor"}</p>
                  <p className="text-sm text-slate-500">{o.program?.name}</p>
                  {o.subject && <p className="text-xs text-slate-500 mt-1">{o.subject}</p>}
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  <Badge variant={o.status === "interested" ? "success" : "default"}>
                    {OUTREACH_STATUS_LABELS[o.status] || o.status}
                  </Badge>
                  {o.program?.id && (
                    <Link href={`/programs/${o.program.id}`} className="text-sm text-red-700 underline">View program</Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
