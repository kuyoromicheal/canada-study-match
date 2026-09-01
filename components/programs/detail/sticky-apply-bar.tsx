"use client";

import { ExternalLink } from "lucide-react";

export function StickyApplyBar({
  admissionsUrl,
  programName,
}: {
  admissionsUrl: string | null;
  programName: string;
}) {
  if (!admissionsUrl) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-slate-200 lg:hidden">
      <a
        href={admissionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full h-12 rounded-lg text-sm font-semibold bg-red-700 text-white hover:bg-red-800"
        aria-label={`Apply to ${programName} on official portal`}
      >
        <ExternalLink className="h-4 w-4" />
        Apply now
      </a>
    </div>
  );
}
