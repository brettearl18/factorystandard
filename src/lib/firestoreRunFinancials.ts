import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ClientProfile, InvoiceRecord } from "@/types/guitars";

const IN_QUERY_CHUNK = 30;

export async function fetchInvoicesForGuitarIds(
  guitarIds: string[]
): Promise<Map<string, InvoiceRecord[]>> {
  const byGuitar = new Map<string, InvoiceRecord[]>();
  for (const id of guitarIds) {
    byGuitar.set(id, []);
  }
  if (guitarIds.length === 0) return byGuitar;

  const invoicesRef = collectionGroup(db, "invoices");

  for (let i = 0; i < guitarIds.length; i += IN_QUERY_CHUNK) {
    const chunk = guitarIds.slice(i, i + IN_QUERY_CHUNK);
    const q = query(invoicesRef, where("guitarId", "in", chunk));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as DocumentData;
      const guitarId = data.guitarId as string | undefined;
      if (!guitarId || !byGuitar.has(guitarId)) continue;
      const inv = { id: docSnap.id, ...data } as InvoiceRecord;
      byGuitar.get(guitarId)!.push(inv);
    }
  }

  return byGuitar;
}

export async function fetchClientProfilesBatch(
  clientUids: string[]
): Promise<Map<string, ClientProfile | null>> {
  const map = new Map<string, ClientProfile | null>();
  const unique = [...new Set(clientUids.filter(Boolean))];
  await Promise.all(
    unique.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "clients", uid));
        map.set(uid, snap.exists() ? ({ uid: snap.id, ...snap.data() } as ClientProfile) : null);
      } catch {
        map.set(uid, null);
      }
    })
  );
  return map;
}
