import { useEffect, useState } from "react";
import { subscribeClientGuitars } from "@/lib/firestore";
import type { GuitarBuild } from "@/types/guitars";

export function useClientGuitars(clientUid: string | null): GuitarBuild[] {
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);

  useEffect(() => {
    if (!clientUid) {
      setGuitars([]);
      return;
    }
    
    const unsubscribe = subscribeClientGuitars(clientUid, (newGuitars) => {
      setGuitars(newGuitars);
    });

    return () => unsubscribe();
  }, [clientUid]);

  return guitars;
}

