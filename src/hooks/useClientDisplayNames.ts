import { useEffect, useState } from "react";
import { subscribeClientProfile } from "@/lib/firestore";

/**
 * Subscribes to client profiles for the given UIDs and returns a map of uid -> displayName.
 * Used to show client names on run board cards when guitar.customerName is missing.
 */
export function useClientDisplayNames(uids: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const uniqueUids = [...new Set(uids)].filter(Boolean);

  useEffect(() => {
    if (uniqueUids.length === 0) {
      setNames({});
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const next: Record<string, string> = {};

    uniqueUids.forEach((uid) => {
      const unsub = subscribeClientProfile(uid, (profile) => {
        const displayName = (profile?.displayName ?? "").toString().trim();
        setNames((prev) => (prev[uid] === displayName ? prev : { ...prev, [uid]: displayName }));
      });
      if (typeof unsub === "function") unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [uniqueUids.join(",")]);

  return names;
}
