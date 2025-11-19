import { useEffect, useState } from "react";
import { subscribeRuns } from "@/lib/firestore";
import type { Run } from "@/types/guitars";

export function useRuns(): Run[] {
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeRuns((newRuns) => {
      setRuns(newRuns);
    });

    return () => unsubscribe();
  }, []);

  return runs;
}

