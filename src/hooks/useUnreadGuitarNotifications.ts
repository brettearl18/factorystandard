"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeNotifications } from "@/lib/firestore";

/**
 * Unread notifications that are guitar-related (have guitarId).
 * Used for: Guitars menu badge and per-guitar counts on /guitars.
 */
export function useUnreadGuitarNotifications(): {
  total: number;
  byGuitarId: Record<string, number>;
} {
  const { currentUser } = useAuth();
  const [total, setTotal] = useState(0);
  const [byGuitarId, setByGuitarId] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentUser) {
      setTotal(0);
      setByGuitarId({});
      return;
    }

    const unsubscribe = subscribeNotifications(currentUser.uid, (notifications) => {
      const guitarUnread = notifications.filter((n) => !n.read && n.guitarId);
      setTotal(guitarUnread.length);
      const byId: Record<string, number> = {};
      guitarUnread.forEach((n) => {
        const id = n.guitarId!;
        byId[id] = (byId[id] ?? 0) + 1;
      });
      setByGuitarId(byId);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return { total, byGuitarId };
}
