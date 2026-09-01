"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyAppDataChanged } from "@/lib/realtime/events";

export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userId = user.id;
      const onChange = () => {
        router.refresh();
        notifyAppDataChanged();
      };

      channel = supabase
        .channel(`user-sync-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "student_profiles", filter: `user_id=eq.${userId}` },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "documents", filter: `user_id=eq.${userId}` },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "application_checklist_items", filter: `user_id=eq.${userId}` },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "application_tracker", filter: `user_id=eq.${userId}` },
          onChange
        )
        .subscribe();
    }

    subscribe();

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [router]);

  return <>{children}</>;
}
