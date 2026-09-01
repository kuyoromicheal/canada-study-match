"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bookmark, Plus } from "lucide-react";

export function ProgramCardActions({
  programId,
  matchScore,
}: {
  programId: string;
  matchScore?: number;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setMessage("");
    const res = await fetch("/api/saved-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: programId, match_score: matchScore }),
    });
    if (res.status === 401) {
      router.push("/login?redirect=/programs");
      return;
    }
    if (res.ok) {
      setSaved(true);
      setMessage("Saved");
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed to save");
    }
  }

  async function handleTrack() {
    setMessage("");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: programId, match_score: matchScore }),
    });
    if (res.status === 401) {
      router.push("/login?redirect=/programs");
      return;
    }
    if (res.ok) {
      setTracking(true);
      setMessage("Added to tracker");
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed to add");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        title="Save program"
        onClick={handleSave}
        disabled={saved}
      >
        <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        title="Add to tracker"
        onClick={handleTrack}
        disabled={tracking}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
