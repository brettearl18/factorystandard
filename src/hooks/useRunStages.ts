import { useEffect, useState } from "react";
import { subscribeRunStages } from "@/lib/firestore";
import type { RunStage } from "@/types/guitars";

export function useRunStages(runId: string): RunStage[] {
  const [stages, setStages] = useState<RunStage[]>([]);

  useEffect(() => {
    if (!runId) return;
    
    const unsubscribe = subscribeRunStages(runId, (newStages) => {
      setStages(newStages);
    });

    return () => unsubscribe();
  }, [runId]);

  return stages;
}

