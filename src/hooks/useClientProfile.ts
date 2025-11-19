import { useEffect, useState } from "react";
import { subscribeClientProfile } from "@/lib/firestore";
import type { ClientProfile } from "@/types/guitars";

export function useClientProfile(clientUid: string | null): ClientProfile | null {
  const [profile, setProfile] = useState<ClientProfile | null>(null);

  useEffect(() => {
    if (!clientUid) {
      setProfile(null);
      return;
    }

    const unsubscribe = subscribeClientProfile(clientUid, (newProfile) => {
      setProfile(newProfile);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [clientUid]);

  return profile;
}

