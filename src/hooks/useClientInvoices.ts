import { useEffect, useState } from "react";
import { subscribeClientInvoices } from "@/lib/firestore";
import type { InvoiceRecord } from "@/types/guitars";

export function useClientInvoices(clientUid: string | null): InvoiceRecord[] {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  useEffect(() => {
    if (!clientUid) {
      setInvoices([]);
      return;
    }

    const unsubscribe = subscribeClientInvoices(clientUid, (records) => {
      setInvoices(records);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [clientUid]);

  return invoices;
}

