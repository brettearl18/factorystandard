import { useEffect, useState } from "react";
import { subscribeRuns } from "@/lib/firestore";
import type { Run } from "@/types/guitars";

export function useRuns(): Run[] {
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    // Always include archived runs so the page can filter them as needed
    const unsubscribe = subscribeRuns((newRuns) => {
      setRuns(newRuns);
    }, true); // includeArchived = true

    return () => unsubscribe();
  }, []);

  return runs;
}

