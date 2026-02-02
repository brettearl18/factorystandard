"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeNotifications } from "@/lib/firestore";

/** Notification types that count as "message/reply" for the Guitars badge (comments only). */
const GUITAR_MESSAGE_TYPES = ["guitar_note_comment"] as const;

/**
 * Unread notifications that are messages/replies on guitars (comments on notes).
 * Used for: Guitars menu badge and per-guitar counts on /guitars.
 * Does not include stage changes, new notes, etc. — only comments.
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
      const guitarUnread = notifications.filter(
        (n) => !n.read && n.guitarId && GUITAR_MESSAGE_TYPES.includes(n.type as (typeof GUITAR_MESSAGE_TYPES)[number])
      );
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
