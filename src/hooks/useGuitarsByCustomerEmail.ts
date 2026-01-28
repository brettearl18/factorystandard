import { useEffect, useState } from "react";
import { subscribeGuitarsByCustomerEmail } from "@/lib/firestore";
import type { GuitarBuild } from "@/types/guitars";

export function useGuitarsByCustomerEmail(email: string | null): GuitarBuild[] {
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);

  useEffect(() => {
    if (!email || !email.trim()) {
      setGuitars([]);
      return;
    }

    const unsubscribe = subscribeGuitarsByCustomerEmail(
      email.trim(),
      (newGuitars) => setGuitars(newGuitars),
      false
    );

    return () => unsubscribe();
  }, [email]);

  return guitars;
}
