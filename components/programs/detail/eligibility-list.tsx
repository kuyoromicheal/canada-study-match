"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EligibilityItem, EligibilityStatus } from "@/lib/matching/program-detail-analysis";

const STATUS_STYLES: Record<EligibilityStatus, { icon: string; border: string; bg: string }> = {
  green: { icon: "✓", border: "border-green-200", bg: "bg-green-50" },
  yellow: { icon: "⚠", border: "border-yellow-200", bg: "bg-yellow-50" },
  red: { icon: "!", border: "border-red-200", bg: "bg-red-50" },
  grey: { icon: "?", border: "border-slate-200", bg: "bg-slate-50" },
};

export function EligibilityList({ items }: { items: EligibilityItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!items.length) {
    return <p className="text-sm text-slate-500">Complete your profile to see eligibility analysis.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const styles = STATUS_STYLES[item.status];
        const expanded = openId === item.id;
        return (
          <li key={item.id} className={`rounded-lg border ${styles.border} ${styles.bg} overflow-hidden`}>
            <button
              type="button"
              className="w-full flex items-start gap-3 p-3 text-left"
              onClick={() => setOpenId(expanded ? null : item.id)}
            >
              <span className="font-bold text-sm w-5 shrink-0">{styles.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-600">{item.summary}</p>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && (
              <div className="px-3 pb-3 pl-11 text-sm text-slate-600 border-t border-white/50 pt-2">
                <p>{item.detail}</p>
                {item.sourceUrl && (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-red-700 underline mt-2 inline-block">
                    View source
                  </a>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
