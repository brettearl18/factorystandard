import { create } from "zustand";
import type { RunStage, GuitarBuild } from "@/types/guitars";

interface RunBoardState {
  runId: string | null;
  stages: RunStage[];
  guitars: GuitarBuild[];
  setRunId: (runId: string | null) => void;
  setStages: (stages: RunStage[]) => void;
  setGuitars: (guitars: GuitarBuild[]) => void;
  moveGuitar: (guitarId: string, newStageId: string) => void;
}

export const useRunBoardStore = create<RunBoardState>((set) => ({
  runId: null,
  stages: [],
  guitars: [],
  setRunId: (runId) => set({ runId }),
  setStages: (stages) => set({ stages }),
  setGuitars: (guitars) => set({ guitars }),
  moveGuitar: (guitarId, newStageId) =>
    set((state) => ({
      guitars: state.guitars.map((guitar) =>
        guitar.id === guitarId
          ? { ...guitar, stageId: newStageId, updatedAt: Date.now() }
          : guitar
      ),
    })),
}));

