"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CrossApplicationGap } from "@/lib/applications/cross-application-gaps";
import { Upload } from "lucide-react";

export function CrossApplicationGapsCard({ gaps }: { gaps: CrossApplicationGap[] }) {
  if (!gaps.length) return null;

  const top = gaps[0];

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4 text-amber-700" />
          One action unlocks multiple applications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="warning" title={top.actionLabel}>
          <p className="text-sm">
            Also blocking: {top.blockedPrograms.slice(0, 4).join(", ")}
            {top.blockedPrograms.length > 4 ? ` and ${top.blockedPrograms.length - 4} more` : ""}.
          </p>
        </Alert>
        {gaps.length > 1 && (
          <ul className="text-xs text-slate-600 space-y-1">
            {gaps.slice(1, 4).map((g) => (
              <li key={g.id}>• {g.actionLabel}</li>
            ))}
          </ul>
        )}
        <Link
          href="/profile/documents"
          className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
        >
          Upload to document vault
        </Link>
      </CardContent>
    </Card>
  );
}
