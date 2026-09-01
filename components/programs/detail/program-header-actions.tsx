"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bookmark, ExternalLink, Plus, Share2 } from "lucide-react";

export function ProgramHeaderActions({
  programId,
  admissionsUrl,
  matchScore,
  programName,
}: {
  programId: string;
  admissionsUrl: string | null;
  matchScore?: number;
  programName: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    const res = await fetch("/api/saved-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: programId, match_score: matchScore }),
    });
    if (res.status === 401) return router.push(`/login?redirect=/programs/${programId}`);
    if (res.ok) { setSaved(true); setMessage("Saved"); }
  }

  async function handleTrack() {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: programId, match_score: matchScore }),
    });
    if (res.status === 401) return router.push(`/login?redirect=/programs/${programId}`);
    if (res.ok) { setTracking(true); setMessage("Added to tracker"); }
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: programName, url });
    } else {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {admissionsUrl ? (
        <a
          href={admissionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold bg-red-700 text-white hover:bg-red-800"
        >
          <ExternalLink className="h-4 w-4" />
          Apply now
        </a>
      ) : (
        <Button disabled title="Official application URL not yet catalogued">
          Apply now — URL unavailable
        </Button>
      )}
      <Button variant="outline" onClick={handleSave} disabled={saved}>
        <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        Save
      </Button>
      <Button variant="outline" onClick={handleTrack} disabled={tracking}>
        <Plus className="h-4 w-4" />
        Add to tracker
      </Button>
      <Button variant="outline" onClick={handleShare}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      {tracking && (
        <Link href="/applications" className="text-sm text-red-700 underline">
          View tracker
        </Link>
      )}
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
