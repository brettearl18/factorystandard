import { useEffect, useState } from "react";
import { subscribeGuitarsForRun } from "@/lib/firestore";
import type { GuitarBuild } from "@/types/guitars";

export function useRunGuitars(runId: string): GuitarBuild[] {
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);

  useEffect(() => {
    if (!runId) return;
    
    const unsubscribe = subscribeGuitarsForRun(runId, (newGuitars) => {
      setGuitars(newGuitars);
    });

    return () => unsubscribe();
  }, [runId]);

  return guitars;
}

