import { useEffect, useState } from "react";
import { subscribeAllGuitars } from "@/lib/firestore";
import type { GuitarBuild } from "@/types/guitars";

export function useAllGuitars(enabled = true): { guitars: GuitarBuild[]; loading: boolean } {
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setGuitars([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeAllGuitars((loaded) => {
      setGuitars(loaded);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled]);

  return { guitars, loading };
}
